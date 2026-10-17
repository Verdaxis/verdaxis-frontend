#!/usr/bin/env python3
"""Run the refactor journey net: disposable backend, real bundle, real browser.

One command, four stages, no application code changes:

1. Build the production bundle (``vite build``) with the placeholder Mapbox
   token and ``VITE_API_URL`` pointing at the disposable backend's origin.
2. Start a disposable PostgreSQL (rootless-Podman ``docker``) and run the
   backend's own migrations plus the journey seed (three actors with REAL
   provenance where applicable, the catalog, eight ports, one notification).
3. Start the pinned backend (``tests.disposable_server`` wrapper) on an
   ephemeral loopback port with egress guarded to its database only.
4. Drive every journey in a real Playwright browser from the official
   Playwright image (browsers and their system libraries come from the image);
   every step records pass/fail with evidence, then the screenshot baselines
   are recorded or compared. Exit code 1 if anything failed.

Usage (on the test host, from the repository root):

    python3 scripts/journeys/run_journeys.py --backend <path-to-backend-tree>

The backend tree must be a clean checkout of the pinned release
56d7577085af99411a6f9c3e34e64ad929d09954 with its venv built. The gate is
driven through ``npm run smoke:journeys``.
"""
import argparse
import json
import os
import socket
import subprocess
import sys
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = ROOT / 'scripts'
BACKEND_SHA = '56d7577085af99411a6f9c3e34e64ad929d09954'
POSTGIS_IMAGE = 'postgis/postgis:17-3.6-alpine@sha256:49b4d46c9fb8b158ddecd14d1894871a21ed4acb7ef376e2050f43f79c7b7272'
PLAYWRIGHT_IMAGE = 'mcr.microsoft.com/playwright/python:v1.58.0-noble'
PLAYWRIGHT_VERSION = '1.58.0'
DATABASE_NAME = 'verdaxis_journeys_market_integrity_test'
# Build output, logs and evidence live outside the checkout: the wrapper that
# runs a lane resets the working tree (including untracked directories) on
# every call, so anything the run must reuse has to sit in the test user's
# home. Only the committed screenshot baselines live in the repository.
WORK_DIR = Path.home() / '.verdaxis-journeys'
REPORT_NAME = 'journeys-report.json'
# Ports the test user may not bind (blocked on the host).
BLOCKED_PORTS = {2019, 5432, 5434, 8000, 8001, 8100, 8700}
# tests.disposable_server accepts only the ephemeral range for its own bind.
DISPOSABLE_PORT_MIN = 49152
DISPOSABLE_PORT_MAX = 65535


def command(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def free_port():
    """An ephemeral loopback port outside the host's blocked set."""
    for _ in range(200):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        if port not in BLOCKED_PORTS:
            return port
    raise RuntimeError('no free unblocked port found')


def free_disposable_port():
    """A port inside the range the disposable-server validator accepts."""
    for _ in range(500):
        with socket.socket() as sock:
            sock.bind(('127.0.0.1', 0))
            port = sock.getsockname()[1]
        if DISPOSABLE_PORT_MIN <= port <= DISPOSABLE_PORT_MAX:
            return port
    raise RuntimeError('no free disposable-range port found')


def wait_http(url, timeout, payload_check=None, process=None):
    """Wait for a JSON endpoint, optionally matching a payload predicate."""
    from urllib.request import urlopen
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=2) as response:
                body = json.load(response)
                if payload_check is None or payload_check(body):
                    return body
        except Exception:
            if process is not None and process.poll() is not None:
                raise RuntimeError('process exited early; see its log')
            time.sleep(1)
    raise RuntimeError(f'readiness timed out for {url}')


def wait_status(url, timeout):
    """Wait for any 2xx/3xx response (static HTML, not JSON)."""
    from urllib.request import urlopen
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urlopen(url, timeout=2) as response:
                if 200 <= response.status < 400:
                    return response.status
        except Exception:
            time.sleep(0.5)
    raise RuntimeError(f'readiness timed out for {url}')


def build_frontend(run, log_dir, api_origin):
    """Production-mode build with the journeys' placeholder token and API."""
    dist = WORK_DIR / 'dist'
    env = {'PATH': os.environ['PATH'], 'HOME': str(run),
           'VITE_MAPBOX_PUBLIC_TOKEN': 'pk.journeys-only',
           'VITE_API_URL': f'{api_origin}/api'}
    # Install once per lane; the checkout is reset between calls, so the
    # presence of node_modules is the cache.
    if not (ROOT / 'node_modules' / 'vite' / 'bin' / 'vite.js').exists():
        print('[journeys] installing npm dependencies...', flush=True)
        with (log_dir / 'npm-ci.log').open('w') as log:
            command('npm', 'ci', '--legacy-peer-deps', cwd=str(ROOT),
                    env=env, stdout=log, stderr=log)
    with (log_dir / 'build.log').open('w') as log:
        command('node', 'node_modules/vite/bin/vite.js', 'build',
                '--mode', 'journeys', '--outDir', str(dist),
                cwd=str(ROOT), env=env, stdout=log, stderr=log)
    if not (dist / 'index.html').exists():
        raise RuntimeError('build produced no index.html')
    # Record the baked API origin so a later --skip-build reuses the bundle
    # only when it still points at the same backend.
    (dist / '.journeys-api-origin').write_text(api_origin + '\n')
    return dist


def serve_static(dist, port):
    """Serve the built bundle as an SPA (history fallback), like vite preview."""
    import http.server
    import threading
    import urllib.parse

    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(dist), **kwargs)

        def do_GET(self):
            if not Path(self.translate_path(self.path)).exists():
                parsed = urllib.parse.urlparse(self.path)
                if '.' not in Path(parsed.path).name:
                    self.path = '/index.html'
            super().do_GET()

        def log_message(self, *_):
            pass

    class ReusableHTTPServer(http.server.ThreadingHTTPServer):
        daemon_threads = True
        allow_reuse_address = True

    server = ReusableHTTPServer(('127.0.0.1', port), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def start_database(run, log_dir):
    container = f'verdaxis-journeys-{uuid.uuid4().hex[:12]}'
    password = uuid.uuid4().hex
    command('docker', 'run', '-d', '--platform', 'linux/amd64', '--name', container,
            '-e', f'POSTGRES_PASSWORD={password}', '-p', '127.0.0.1::5432',
            POSTGIS_IMAGE, stdout=subprocess.DEVNULL)
    try:
        for _ in range(240):
            if subprocess.run(['docker', 'exec', container, 'pg_isready',
                               '-h', '127.0.0.1', '-U', 'postgres'],
                              capture_output=True).returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError('PostgreSQL readiness timed out')
        port = command('docker', 'port', container, '5432/tcp',
                       capture_output=True).stdout.strip().split(':')[-1]
        command('docker', 'exec', container, 'psql', '-U', 'postgres', '-c',
                f"CREATE ROLE journeys_owner LOGIN NOINHERIT PASSWORD '{password}'")
        command('docker', 'exec', container, 'createdb', '-U', 'postgres',
                '-O', 'journeys_owner', DATABASE_NAME)
        command('docker', 'exec', container, 'psql', '-U', 'postgres',
                '-d', DATABASE_NAME, '-c', 'CREATE EXTENSION postgis')
        return container, (f'postgresql+asyncpg://journeys_owner:{password}'
                           f'@127.0.0.1:{port}/{DATABASE_NAME}'), port
    except Exception:
        command('docker', 'rm', '-f', '-v', container, stdout=subprocess.DEVNULL)
        raise


def ensure_browser_deps(log_dir):
    """Install the pinned Playwright wheel into a persistent host directory.

    The official image ships the browsers and their system libraries; only the
    Python package is added. The install target lives outside the checkout so
    it survives the wrapper's per-call checkout reset.
    """
    deps = Path.home() / '.journeys-pydeps'
    marker = deps / f'playwright-{PLAYWRIGHT_VERSION}.installed'
    if marker.exists():
        return deps
    deps.mkdir(parents=True, exist_ok=True)
    with (log_dir / 'pydeps.log').open('w') as log:
        completed = subprocess.run(
            ['podman', 'run', '--rm',
             '-v', f'{deps}:/deps:Z',
             PLAYWRIGHT_IMAGE,
             'pip3', 'install', '--quiet', '--target', '/deps',
             f'playwright=={PLAYWRIGHT_VERSION}'],
            capture_output=True, text=True, timeout=900)
        log.write(completed.stdout)
        log.write(completed.stderr)
    if completed.returncode != 0:
        raise RuntimeError(f'playwright wheel install failed: {completed.stderr[-500:]}')
    marker.write_text('ok\n')
    return deps


def run_browser_phase(run, log_dir, base, api_origin, mode, only=None):
    """Drive journeys + screenshots inside the official Playwright image."""
    # The repository is mounted at /work inside the container; the harness
    # modules are imported from the mounted scripts directory, not the host
    # path that this process sees.
    container_scripts = '/work/' + str(SCRIPTS.relative_to(ROOT))
    script = f"""
import json, os, sys
sys.path.insert(0, {container_scripts!r})
sys.path.insert(0, '/deps')
# The disposable backend's single-use token clears its rate limits between
# sessions; the runner writes it to the mounted run directory.
try:
    os.environ['JOURNEYS_DISPOSABLE_TOKEN'] = open('/run/disposable-token').read().strip()
except Exception:
    pass
from playwright.sync_api import sync_playwright
from journeys.browser_harness import Harness
from journeys.journeys import steps
from journeys import screenshots

try:
    fixture = json.load(open('/run/fixture.json'))
except Exception:
    fixture = {{}}
state = {{'fixture': fixture}}
results = []
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    try:
        # Screenshots run first, against exactly the seeded state: the journeys
        # place orders and trade afterwards, and the order book, marketplace and
        # blotter screens would otherwise capture run-specific rows and every
        # compare would drift.
        if {mode!r} != 'off':
            shots = screenshots.run(browser, {base!r}, {api_origin!r}, mode={mode!r})
            results.extend([{{'name': 'screenshot:' + item['name'], **item}}
                            for item in shots])
        selected = steps()
        if {only!r}:
            wanted = set({only!r}.split(','))
            selected = [s for s in selected if s.name in wanted]
        for step in selected:
            harness = Harness(browser, {base!r}, {api_origin!r})
            try:
                passed, detail = step.fn(harness, state)
                error = ''
                if not passed:
                    error = harness.diagnostics()
            except Exception as exc:
                passed, detail, error = False, '', f'{{type(exc).__name__}}: {{exc}}'[:400]
                diag = harness.diagnostics()
                if diag:
                    error += ' || ' + diag
                try:
                    import pathlib
                    out = pathlib.Path('/run') / ('fail-' + step.name + '.html')
                    out.write_text(harness.page.content())
                except Exception:
                    pass
            harness.close()
            entry = {{'name': step.name, 'passed': bool(passed), 'detail': detail}}
            if error:
                entry['error'] = error
            results.append(entry)
            mark = 'PASS' if passed else 'FAIL'
            print(f'  [{{mark}}] {{step.name}} {{detail or error}}', flush=True)
    finally:
        browser.close()
print('JOURNEYS_JSON:' + json.dumps(results))
"""
    script_path = run / 'browser_phase.py'
    script_path.write_text(script)
    # Compare reads the committed set from the mounted repository; record
    # writes to the mounted run directory outside the checkout.
    baseline_dir = ('/run/baselines' if mode == 'record'
                    else f'{container_scripts}/journeys/baselines')
    baselines = SCRIPTS / 'journeys' / 'baselines'
    baselines.mkdir(exist_ok=True)
    deps = ensure_browser_deps(log_dir)
    with (log_dir / 'browser.log').open('w') as log:
        # --network=host reaches the host's loopback servers (verified on the
        # test host); the repo is mounted so recorded baselines and failure
        # artifacts land in the repository tree.
        completed = subprocess.run(
            ['podman', 'run', '--rm', '--network=host',
             '-v', f'{ROOT}:/work:Z',
             '-v', f'{run}:/run:Z',
             '-v', f'{deps}:/deps:Z',
             # Recording writes outside the checkout: the lane wrapper resets
             # the working tree (untracked files included) at the start of the
             # next call, so a baseline written into the checkout would be lost
             # before it could be retrieved and committed. Compare reads the
             # committed set from the mounted repository.
             '-e', f'JOURNEYS_BASELINES_DIR={baseline_dir}',
             '-w', '/work',
             PLAYWRIGHT_IMAGE,
             'python3', '-c', script],
            capture_output=True, text=True, timeout=2400)
        log.write(completed.stdout)
        log.write('\n--- stderr ---\n')
        log.write(completed.stderr)
    print(completed.stdout, flush=True)
    if completed.returncode != 0:
        print(completed.stderr[-2000:], flush=True)
        raise RuntimeError(f'browser phase exited {completed.returncode}')
    for line in completed.stdout.splitlines():
        if line.startswith('JOURNEYS_JSON:'):
            return json.loads(line[len('JOURNEYS_JSON:'):])
    raise RuntimeError('browser phase produced no results JSON')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend', type=Path, required=True,
                        help='clean checkout of the pinned backend release')
    parser.add_argument('--skip-build', action='store_true',
                        help='reuse work/journeys/dist if it exists')
    parser.add_argument('--keep', action='store_true',
                        help='keep the run directory for inspection')
    parser.add_argument('--only', default='',
                        help='comma-separated journey names to run (debug aid)')
    parser.add_argument('--screenshots', choices=['off', 'record', 'compare'],
                        default='compare',
                        help='off: journeys only; record: refresh baselines; '
                             'compare: fail on pixel drift (default)')
    args = parser.parse_args()

    backend = args.backend.resolve()
    sha = command('git', '-C', str(backend), 'rev-parse', 'HEAD',
                  capture_output=True).stdout.strip()
    if sha != BACKEND_SHA:
        raise SystemExit(f'backend tree is {sha}, expected {BACKEND_SHA}')
    python = str(backend / 'venv/bin/python')

    run = WORK_DIR / ('run-' + time.strftime('%Y%m%d-%H%M%S'))
    run.mkdir(parents=True)
    log_dir = run / 'logs'
    log_dir.mkdir()
    report = {'frontend_sha': command('git', 'rev-parse', 'HEAD', cwd=str(ROOT),
                                      capture_output=True).stdout.strip(),
              'backend_sha': sha, 'started_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
              'screenshots_mode': args.screenshots, 'steps': [], 'complete': False}
    container = None
    processes = []
    static_server = None
    fixture_orders = {}
    try:
        # ---- 1. build ---------------------------------------------------
        # Ports are allocated first so the baked API URL and the served origin
        # are both known before the build runs. The backend's own disposable
        # validator only accepts the ephemeral range, so its port is drawn
        # from there.
        api_port = free_disposable_port()
        static_port = free_port()
        api_origin = f'http://127.0.0.1:{api_port}'
        base = f'http://127.0.0.1:{static_port}'
        marker = WORK_DIR / 'dist' / '.journeys-api-origin'
        reusable = (args.skip_build and (WORK_DIR / 'dist' / 'index.html').exists()
                    and marker.exists() and marker.read_text().strip() == api_origin)
        if reusable:
            dist = WORK_DIR / 'dist'
            report['build'] = 'reused'
        else:
            if args.skip_build:
                print('[journeys] cached bundle does not match this run; rebuilding', flush=True)
            print('[journeys] building frontend bundle...', flush=True)
            dist = build_frontend(run, log_dir, api_origin)
            report['build'] = 'built'

        # ---- 2. database ------------------------------------------------
        print('[journeys] starting disposable PostgreSQL...', flush=True)
        container, url, db_port = start_database(run, log_dir)

        environment = {'PATH': os.environ['PATH'], 'HOME': str(run),
                       'ENVIRONMENT': 'test', 'RELEASE_SHA': sha,
                       'JWT_SECRET': 'journeys-synthetic-secret-at-least-32-chars',
                       'KYC_EXECUTION_GATE_ENABLED': 'false',
                       'PYTHONDONTWRITEBYTECODE': '1',
                       # Public market reads admit at most
                       # (DB_POOL_SIZE + DB_MAX_OVERFLOW - 1) concurrent reads and
                       # answer 503 above that. The production pool is small by
                       # design; the journey net drives a whole dashboard at
                       # once, so the disposable backend gets a wider pool. The
                       # service runs one worker, so the pool budget
                       # (DB_SERVICE_COUNT x UVICORN_WORKERS x pool) stays inside
                       # DB_MAX_CONNECTIONS - DB_RESERVED_CONNECTIONS.
                       'DB_POOL_SIZE': '24', 'DB_MAX_OVERFLOW': '8',
                       'DB_SERVICE_COUNT': '1', 'UVICORN_WORKERS': '1',
                       'DATABASE_URL': url, 'MIGRATOR_DATABASE_URL': url,
                       'PHASE0_PORT': db_port}
        guard = run / 'guard'
        guard.mkdir()
        import shutil
        shutil.copyfile(backend / 'tests/phase0/network_guard.py',
                        guard / 'sitecustomize.py')
        environment['PYTHONPATH'] = f'{guard}:{backend}'

        # migrations (alembic config rewritten into the run directory)
        config = (backend / 'alembic.ini').read_text().replace(
            'script_location = %(here)s/alembic',
            f'script_location = {backend}/alembic')
        (run / 'alembic.ini').write_text(config)
        with (log_dir / 'migrate.log').open('w') as log:
            command(python, '-m', 'alembic', '-c', str(run / 'alembic.ini'),
                    'upgrade', 'head', cwd=str(run), env=environment,
                    stdout=log, stderr=log)

        # seed
        seed_env = dict(environment,
                        JOURNEYS_DATABASE_URL=url.replace('journeys_owner:', 'postgres:'))
        with (log_dir / 'seed.log').open('w') as log:
            command(python, str(SCRIPTS / 'journeys/seed.py'), cwd=str(run),
                    env=seed_env, stdout=log, stderr=log)

        # ---- 3. backend -------------------------------------------------
        print('[journeys] starting disposable backend...', flush=True)
        environment['DISPOSABLE_TEST_TOKEN'] = uuid.uuid4().hex
        # The backend enforces exact Origin semantics for cookie
        # authentication: the test allowlist is 'https://test', so the bundle's
        # real origin (the loopback static server) must be named explicitly.
        environment['JOURNEYS_BACKEND'] = str(backend)
        (run / 'disposable-token').write_text(environment['DISPOSABLE_TEST_TOKEN'])
        (run / 'disposable-token').chmod(0o600)
        server_script = run / 'server.py'
        server_script.write_text(SERVER_BOOTSTRAP)
        api = f'{api_origin}/api'
        log = (log_dir / 'backend.log').open('w')
        process = subprocess.Popen([python, str(server_script)], cwd=str(run),
                                   env=dict(environment, GATE_API_PORT=str(api_port)),
                                   stdout=log, stderr=log)
        processes.append(process)
        wait_http(f'{api_origin}/health/ready', 120,
                  payload_check=lambda body: body.get('release_sha') == sha,
                  process=process)
        report['api'] = api

        # Fixture orders for the browse, order book, map and trade journeys are
        # written through the real HTTP contract (never straight into the
        # database), so the journeys read the same rows a real user would.
        with (log_dir / 'seed-orders.log').open('w') as log:
            completed = subprocess.run(
                [sys.executable, str(SCRIPTS / 'journeys/seed_orders.py'),
                 '--api', api_origin, '--password', 'Journeys-Password-7!'],
                capture_output=True, text=True, timeout=300)
            log.write(completed.stdout)
            log.write(completed.stderr)
        if completed.returncode != 0:
            raise RuntimeError('order fixture seeding failed: '
                               + completed.stderr[-500:])
        report['fixture_orders'] = json.loads(completed.stdout.strip().splitlines()[-1])
        fixture_orders = report['fixture_orders']

        # ---- 4. browser -------------------------------------------------
        print(f'[journeys] serving bundle at {base} and running browser phase...', flush=True)
        static_server = serve_static(dist, static_port)
        wait_status(base + '/index.html', 30)
        (run / 'fixture.json').write_text(json.dumps(fixture_orders))
        entries = run_browser_phase(run, log_dir, base, api_origin,
                                    args.screenshots, args.only)
        report['steps'] = entries
        report['complete'] = True
    except Exception as exc:  # noqa: BLE001 - reported below
        report['error'] = f'{type(exc).__name__}: {exc}'
    finally:
        if static_server:
            static_server.shutdown()
            static_server.server_close()
        for process in processes:
            process.terminate()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        if container:
            command('docker', 'rm', '-f', '-v', container, stdout=subprocess.DEVNULL)
        report['finished_at'] = time.strftime('%Y-%m-%dT%H:%M:%SZ')
        (run / REPORT_NAME).write_text(json.dumps(report, indent=2) + '\n')
        print(f'[journeys] report: {run / REPORT_NAME}', flush=True)
    # Recorded screenshots count as success: a fresh baseline is the intended
    # outcome of --screenshots record.
    failed = [step for step in report['steps']
              if not step.get('passed') and not step.get('recorded')]
    screenshot_failed = [s for s in failed if s['name'].startswith('screenshot:')]
    journey_failed = [s for s in failed if not s['name'].startswith('screenshot:')]
    if journey_failed:
        print(f"[journeys] FAILED journeys: {', '.join(s['name'] for s in journey_failed)}", flush=True)
    if screenshot_failed:
        print(f"[journeys] screenshot drift: {', '.join(s['name'] for s in screenshot_failed)}", flush=True)
    if report.get('error'):
        print(f"[journeys] harness error: {report['error']}", flush=True)
    if journey_failed or screenshot_failed or report.get('error'):
        return 1
    print('[journeys] all journeys passed', flush=True)
    return 0


SERVER_BOOTSTRAP = '''\
"""Local bootstrap for the pinned backend with the disposable identity wrapper."""
import os

import uvicorn
from app.main import app
from tests.disposable_server import DisposableIdentityApp, validate_config

port = int(os.environ["GATE_API_PORT"])
token = validate_config(os.environ["ENVIRONMENT"], os.environ["DISPOSABLE_TEST_TOKEN"],
                        "127.0.0.1", port, os.environ["RELEASE_SHA"])
uvicorn.run(DisposableIdentityApp(app, token), host="127.0.0.1", port=port)
'''


if __name__ == '__main__':
    raise SystemExit(main())
