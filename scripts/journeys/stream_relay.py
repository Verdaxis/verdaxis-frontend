"""Loopback-only SPA server and native EventSource streaming relay for tests."""
import http.client
import http.server
import select
import socket
import threading
from pathlib import Path
from urllib.parse import parse_qsl, urlsplit

STREAM_ROUTES = {'/api/stream/orderbook', '/api/stream/prices', '/api/stream/trades'}
BLOCKED_PORTS = {2019, 5432, 5434, 8000, 8001, 8100, 8700}


def validate_origin(origin):
    parsed = urlsplit(origin)
    if (parsed.scheme != 'http' or parsed.hostname != '127.0.0.1'
            or parsed.username or parsed.password or parsed.path not in ('', '/')
            or parsed.query or parsed.fragment or parsed.port is None
            or not 32768 <= parsed.port <= 65535 or parsed.port in BLOCKED_PORTS):
        raise ValueError('relay requires an explicit ephemeral loopback disposable origin')
    return parsed.hostname, parsed.port


class RelayServer(http.server.ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True

    def __init__(self, address, handler):
        self._lock = threading.Lock()
        self._upstreams = set()
        self.worker_threads = set()
        self.stream_sockets = set()
        self.stopping = threading.Event()
        super().__init__(address, handler)

    @property
    def active_streams(self):
        with self._lock:
            return len(self._upstreams)

    def shutdown(self):
        self.stopping.set()
        with self._lock:
            connections = list(self._upstreams)
            workers = list(self.worker_threads)
        for connection in connections:
            if connection.sock:
                try:
                    connection.sock.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
            connection.close()
        super().shutdown()
        for worker in workers:
            worker.join(5)
        if hasattr(self, 'serving_thread'):
            self.serving_thread.join(5)


def serve_static(dist, port, api_origin=None, control_token=None):
    upstream = validate_origin(api_origin) if api_origin else None

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(dist), **kwargs)

        def do_GET(self):
            parsed = urlsplit(self.path)
            if parsed.path.startswith('/api/'):
                if parsed.path not in STREAM_ROUTES or upstream is None:
                    self.send_error(404)
                    return
                if any(key not in {'stream_token', 'last_event_id'}
                       for key, _ in parse_qsl(parsed.query)):
                    self.send_error(400)
                    return
                self.relay_stream()
                return
            if not Path(self.translate_path(self.path)).exists():
                if '.' not in Path(parsed.path).name:
                    self.path = '/index.html'
            super().do_GET()

        def do_POST(self):
            if (self.path != '/.journeys/disconnect-streams' or not control_token
                    or self.headers.get('x-journeys-control') != control_token):
                self.send_error(404)
                return
            with self.server._lock:
                sockets = list(self.server.stream_sockets)
            for sock in sockets:
                try:
                    sock.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
            self.send_response(204)
            self.end_headers()

        def relay_stream(self):
            connection = http.client.HTTPConnection(*upstream, timeout=3)
            worker = threading.current_thread()
            sock = None
            with self.server._lock:
                self.server._upstreams.add(connection)
                self.server.worker_threads.add(worker)
            try:
                headers = {'Accept': 'text/event-stream'}
                if self.headers.get('Last-Event-ID'):
                    headers['Last-Event-ID'] = self.headers['Last-Event-ID']
                connection.request('GET', self.path, headers=headers)
                response = connection.getresponse()
                self.send_response(response.status)
                self.send_header('Content-Type', response.getheader('Content-Type', 'text/event-stream'))
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Connection', 'close')
                self.end_headers()
                self.wfile.flush()
                sock = connection.sock or response.fp.raw._sock
                # The connect/header deadline must not become a three-second
                # idle deadline. SSE heartbeats can be much farther apart.
                sock.settimeout(None)
                with self.server._lock:
                    self.server.stream_sockets.add(sock)
                finished = threading.Event()

                def watch_disconnect():
                    while not finished.is_set():
                        ready, _, _ = select.select([self.connection], [], [], .1)
                        if self.server.stopping.is_set() or (
                                ready and not self.connection.recv(1, socket.MSG_PEEK)):
                            try:
                                sock.shutdown(socket.SHUT_RDWR)
                            except OSError:
                                pass
                            return

                watcher = threading.Thread(target=watch_disconnect, daemon=True)
                watcher.start()
                try:
                    while not self.server.stopping.is_set():
                        # read1 returns available bytes and decodes HTTP chunk
                        # framing. read(n) waits for n bytes and stalls SSE.
                        data = response.read1(65536)
                        if not data:
                            break
                        self.wfile.write(data)
                        self.wfile.flush()
                finally:
                    finished.set()
                    watcher.join(2)
            except (OSError, http.client.HTTPException, ValueError):
                pass
            finally:
                connection.close()
                with self.server._lock:
                    self.server._upstreams.discard(connection)
                    self.server.stream_sockets.discard(sock)
                    self.server.worker_threads.discard(worker)
                self.close_connection = True

        def log_message(self, *_):
            pass

    server = RelayServer(('127.0.0.1', port), Handler)
    server.serving_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server.serving_thread.start()
    return server
