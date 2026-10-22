"""Exercise the real relay sockets, including disconnect and shutdown."""
import http.client
import http.server
import subprocess
import sys
import threading
import time
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from . import stream_relay


class FixtureCleanupTests(unittest.TestCase):
    def test_setup_failure_exits_without_server_threads(self):
        script = '''
import unittest
from unittest.mock import patch
from scripts.journeys.test_stream_relay import StreamRelayTests
with patch('scripts.journeys.stream_relay.serve_static', side_effect=RuntimeError('setup failure')):
    result = unittest.TestResult()
    StreamRelayTests('test_stream_arrives_before_upstream_close').run(result)
    assert len(result.errors) == 1
'''
        completed = subprocess.run([sys.executable, '-c', script],
                                   capture_output=True, text=True, timeout=10)
        self.assertEqual(completed.returncode, 0, completed.stderr)


class StreamRelayTests(unittest.TestCase):
    def setUp(self):
        self.upstream_closed = threading.Event()
        self.upstream_started = threading.Event()
        owner = self
        self.quiet = threading.Event()

        class Upstream(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                self.send_response(200)
                self.send_header('Content-Type', 'text/event-stream')
                self.end_headers()
                owner.upstream_started.set()
                try:
                    while True:
                        self.wfile.write(b'event: orderbook\ndata: {"changed":true}\n\n')
                        self.wfile.flush()
                        if owner.quiet.is_set():
                            time.sleep(4)
                        time.sleep(.03)
                except (BrokenPipeError, ConnectionResetError):
                    owner.upstream_closed.set()

            def log_message(self, *_):
                pass

        self.upstream = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Upstream)
        self.upstream.daemon_threads = True
        self.thread = threading.Thread(target=self.upstream.serve_forever)
        self.thread.start()
        self.addCleanup(self.thread.join, 2)
        self.addCleanup(self.upstream.server_close)
        self.addCleanup(self.upstream.shutdown)
        self.directory = TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.origin = f'http://127.0.0.1:{self.upstream.server_port}'
        self.relay = stream_relay.serve_static(Path(self.directory.name), 0, self.origin,
                                               control_token='test-control')
        self.addCleanup(self.relay.server_close)
        self.addCleanup(self.relay.shutdown)

    def connect(self, path='/api/stream/orderbook'):
        connection = http.client.HTTPConnection('127.0.0.1', self.relay.server_port, timeout=2)
        connection.request('GET', path)
        return connection, connection.getresponse()

    def test_only_loopback_disposable_origin_is_accepted(self):
        for origin in ('https://api.verdaxis.exchange', 'http://localhost:50000',
                       'http://127.0.0.1:8000', 'http://169.254.169.254:50000',
                       'http://127.0.0.1:50000/api', 'http://user@127.0.0.1:50000',
                       'http://127.0.0.1:50000?target=prod'):
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                stream_relay.validate_origin(origin)
        self.assertEqual(stream_relay.validate_origin('http://127.0.0.1:50000'),
                         ('127.0.0.1', 50000))

    def test_exact_routes_only_and_no_spa_or_production_fallback(self):
        for path in ('/api/stream/unknown', '/api/stream/orderbook/extra',
                     '/api/stream/orderbook?target=https://api.verdaxis.exchange',
                     '/api/stream/orderbook?url=http://127.0.0.1:8000'):
            connection, response = self.connect(path)
            self.assertEqual(response.status, 400 if '?' in path else 404)
            response.read()
            connection.close()
        self.assertFalse(self.upstream_started.is_set())

    def test_stream_arrives_before_upstream_close(self):
        connection, response = self.connect()
        try:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.readline(), b'event: orderbook\n')
            self.assertFalse(self.upstream_closed.is_set())
        finally:
            response.close()
            connection.close()

    def test_disconnect_and_reconnect_close_old_upstream(self):
        connection, response = self.connect()
        response.readline()
        response.close()
        connection.close()
        self.assertTrue(self.upstream_closed.wait(3))
        connection, response = self.connect()
        self.assertEqual(response.readline(), b'event: orderbook\n')
        response.close()
        connection.close()
        deadline = time.monotonic() + 3
        while self.relay.active_streams and time.monotonic() < deadline:
            time.sleep(.02)
        self.assertEqual(self.relay.active_streams, 0)

    def test_disconnect_control_requires_token_and_closes_upstream(self):
        connection, response = self.connect()
        response.readline()
        for token, status in [('wrong', 404), ('test-control', 204)]:
            control = http.client.HTTPConnection('127.0.0.1', self.relay.server_port, timeout=2)
            try:
                control.request('POST', '/.journeys/disconnect-streams',
                                headers={'x-journeys-control': token})
                result = control.getresponse()
                self.assertEqual(result.status, status)
                result.read()
            finally:
                control.close()
        self.assertTrue(self.upstream_closed.wait(3))
        response.close()
        connection.close()

    def test_quiet_stream_remains_open_past_connect_timeout(self):
        self.quiet.set()
        connection, response = self.connect()
        try:
            response.readline()
            time.sleep(3.2)
            self.assertEqual(self.relay.active_streams, 1)
        finally:
            response.close()
            connection.close()

    def test_teardown_leaves_no_stream_socket_or_worker(self):
        connection, response = self.connect('/api/stream/trades?stream_token=synthetic')
        response.readline()
        self.relay.shutdown()
        self.relay.server_close()
        response.close()
        connection.close()
        self.assertEqual(self.relay.active_streams, 0)
        self.assertFalse(self.relay.worker_threads)


if __name__ == '__main__':
    unittest.main()
