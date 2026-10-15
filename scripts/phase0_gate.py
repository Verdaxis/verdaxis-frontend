"""Run two real bundles against a runner-owned PostgreSQL and backend.

Invoke with the browser-smoke Python environment. Never accepts a database URL.
The backend tree is read-only; migrations, logs and builds live under work/.
"""
import argparse
import contextlib
import http.server
import json
import os
import shutil
import socket
import subprocess
import threading
import time
import uuid
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
PRODUCTION = '3f16cabba6424ef08250b32f8f8e4b9a621c4379'
IMAGE = 'postgis/postgis:17-3.6-alpine@sha256:49b4d46c9fb8b158ddecd14d1894871a21ed4acb7ef376e2050f43f79c7b7272'


def command(*args, **kwargs):
    return subprocess.run(args, check=True, text=True, **kwargs)


def free_port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


@contextlib.contextmanager
def serve(directory):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=str(directory), **kwargs)

        def do_GET(self):
            if not Path(self.translate_path(self.path)).exists():
                self.path = '/index.html'
            super().do_GET()

        def log_message(self, *_):
            pass
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        yield f'http://127.0.0.1:{server.server_port}'
    finally:
        server.shutdown()
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--backend', type=Path, required=True)
    args = parser.parse_args()
    backend = args.backend.resolve()
    python = str(backend / 'venv/bin/python')
    sha = command('git', '-C', str(backend), 'rev-parse', 'HEAD', capture_output=True).stdout.strip()
    run = ROOT / 'work' / f'phase0-gate-{uuid.uuid4().hex[:10]}'
    run.mkdir(parents=True)
    container = f'verdaxis-browser-{uuid.uuid4().hex[:12]}'
    password = uuid.uuid4().hex
    processes = []
    backend_status = command('git', '-C', str(backend), 'status', '--porcelain', capture_output=True).stdout
    report = {'backend_sha': sha, 'old_frontend_sha': PRODUCTION,
        'new_frontend_sha': command('git', 'rev-parse', 'HEAD', cwd=ROOT, capture_output=True).stdout.strip(),
        'contracts': [], 'complete': False,
        'limitations': ['SSE transport blocked; no live CORS or Mapbox check',
            'Additional contract probes use browser fetch, not every UI order form',
            'Synthetic nullable history is inserted directly; data-copy mechanics are tested by backend Task 5']}
    environment = {'PATH': os.environ['PATH'], 'HOME': str(run), 'ENVIRONMENT': 'test',
        'RELEASE_SHA': sha, 'JWT_SECRET': 'synthetic-browser-gate-secret-at-least-32-characters',
        'KYC_EXECUTION_GATE_ENABLED': 'false', 'PYTHONDONTWRITEBYTECODE': '1',
        'GATE_IDENTITIES': str(run / 'identities.json')}
    guard = run / 'guard'
    guard.mkdir()
    shutil.copyfile(backend / 'tests/phase0/network_guard.py', guard / 'sitecustomize.py')
    environment['PYTHONPATH'] = f'{guard}:{backend}'
    try:
        command('docker', 'run', '-d', '--platform', 'linux/amd64', '--name', container,
            '-e', f'POSTGRES_PASSWORD={password}', '-p', '127.0.0.1::5432', IMAGE, stdout=subprocess.DEVNULL)
        for _ in range(240):
            if subprocess.run(['docker', 'exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'], capture_output=True).returncode == 0:
                break
            time.sleep(1)
        else:
            raise RuntimeError('PostgreSQL readiness timed out')
        port = command('docker', 'port', container, '5432/tcp', capture_output=True).stdout.strip().split(':')[-1]
        database = 'phase0_browser_market_integrity_test'
        command('docker', 'exec', container, 'psql', '-U', 'postgres', '-c',
            f"CREATE ROLE phase0_owner LOGIN NOINHERIT PASSWORD '{password}'")
        command('docker', 'exec', container, 'createdb', '-U', 'postgres', '-O', 'phase0_owner', database)
        command('docker', 'exec', container, 'psql', '-U', 'postgres', '-d', database, '-c', 'CREATE EXTENSION postgis')
        url = f'postgresql+asyncpg://phase0_owner:{password}@127.0.0.1:{port}/{database}'
        environment.update(DATABASE_URL=url, MIGRATOR_DATABASE_URL=url, PHASE0_PORT=port)
        config = (backend / 'alembic.ini').read_text().replace('script_location = %(here)s/alembic', f'script_location = {backend}/alembic')
        (run / 'alembic.ini').write_text(config)
        with (run / 'migration.log').open('w') as log:
            command(python, '-m', 'alembic', '-c', str(run / 'alembic.ini'), 'upgrade', 'head', cwd=run, env=environment, stdout=log, stderr=log)
        with (run / 'seed.log').open('w') as log:
            seed_environment = dict(environment, DATABASE_URL=url.replace('phase0_owner:', 'postgres:'))
            command(python, str(ROOT / 'scripts/phase0_gate_seed.py'), cwd=run, env=seed_environment, stdout=log, stderr=log)
        api_port = free_port()
        environment['DISPOSABLE_TEST_TOKEN'] = uuid.uuid4().hex
        (run / 'disposable-token').write_text(environment['DISPOSABLE_TEST_TOKEN'])
        (run / 'disposable-token').chmod(0o600)
        environment['GATE_API_PORT'] = str(api_port)
        environment['GATE_FAULT_CONTROL'] = str(run / 'fault-control.json')
        (run / 'fault-control.json').write_text(json.dumps({'vault': 'unavailable'}))
        log = (run / 'backend.log').open('w')
        process = subprocess.Popen([python, str(ROOT / 'scripts/phase0_gate_fault_server.py')], cwd=run, env=environment, stdout=log, stderr=log)
        processes.append(process)
        api = f'http://127.0.0.1:{api_port}'
        for _ in range(90):
            try:
                with urlopen(api + '/health/ready', timeout=1) as response:
                    assert json.load(response)['release_sha'] == sha
                    break
            except Exception:
                if process.poll() is not None:
                    raise RuntimeError('Backend exited; see backend.log')
                time.sleep(1)
        else:
            raise RuntimeError('Backend readiness timed out')
        old = run / 'old'
        old.mkdir()
        with (run / 'old.tar').open('wb') as output:
            subprocess.run(['git', 'archive', PRODUCTION], cwd=ROOT, stdout=output, check=True)
        command('tar', '-xf', str(run / 'old.tar'), '-C', str(old))
        old_lock = json.loads((old / 'package-lock.json').read_text())['packages']
        installed_lock = json.loads((ROOT / 'package-lock.json').read_text())['packages']
        assert all(installed_lock.get(key, {}).get('version') == value.get('version')
            for key, value in old_lock.items() if key), 'Pinned package versions differ'
        (old / 'node_modules').symlink_to(ROOT / 'node_modules', target_is_directory=True)
        build_env = {'PATH': os.environ['PATH'], 'HOME': str(run),
            'VITE_MAPBOX_PUBLIC_TOKEN': 'pk.phase0-local-synthetic'}
        for name, source in [('old', old), ('new', ROOT)]:
            output = run / f'{name}-dist'
            with (run / f'{name}-build.log').open('w') as log:
                command('npm', 'run', 'build:prod', '--', '--outDir', str(output), cwd=source, env=build_env, stdout=log, stderr=log)
            from phase0_gate_browser import check_bundle
            with serve(output) as base:
                report['contracts'].extend(check_bundle(name, base, api, run))
        report['complete'] = all(item['passed'] for item in report['contracts'])
    except Exception as error:
        report['error'] = f'{type(error).__name__}: {error}'
    finally:
        for process in processes:
            process.terminate()
            try:
                process.wait(timeout=15)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
        database_log = subprocess.run(['docker', 'logs', container], capture_output=True, text=True)
        report['database_errors'] = sorted(set(line.split('ERROR:', 1)[1].strip()
            for line in database_log.stderr.splitlines() if 'ERROR:' in line))
        command('docker', 'rm', '-f', '-v', container, stdout=subprocess.DEVNULL)
        report['container_removed_with_volumes'] = True
        report['backend_end_sha'] = command('git', '-C', str(backend), 'rev-parse', 'HEAD', capture_output=True).stdout.strip()
        report['backend_worktree_unchanged'] = backend_status == command(
            'git', '-C', str(backend), 'status', '--porcelain', capture_output=True).stdout
        (run / 'result.json').write_text(json.dumps(report, indent=2) + '\n')
        print(f'Gate evidence: {run}', flush=True)
        print(json.dumps(report, indent=2))
    return 0 if report['complete'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
