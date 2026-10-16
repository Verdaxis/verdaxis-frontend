"""Offline guardrails for the local two-bundle gate."""
import importlib.util
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('phase0_gate', ROOT / 'scripts/phase0_gate.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def test_local_static_server_supports_deep_links(tmp_path):
    (tmp_path / 'index.html').write_text('synthetic entry')
    with gate.serve(tmp_path) as base:
        assert base.startswith('http://127.0.0.1:')
        with urlopen(base + '/app/compliance') as response:
            assert response.read() == b'synthetic entry'


def test_runner_owns_pinned_database_and_cleans_volumes():
    source = (ROOT / 'scripts/phase0_gate.py').read_text()
    assert '@sha256:' in gate.IMAGE
    assert "'127.0.0.1::5432'" in source
    assert "'docker', 'rm', '-f', '-v', container" in source
    assert "'PYTHONDONTWRITEBYTECODE': '1'" in source
    assert 'network_guard.py' in source
    assert 'phase0_owner' in source


def test_browser_blocks_external_requests_and_forwards_real_api():
    source = (ROOT / 'scripts/phase0_gate_browser.py').read_text()
    assert 'context.request.fetch(api + path' in source
    assert "context.route('**/*', route_request)" in source
    assert 'route.abort()' in source
    assert 'body=response.body()' in source


def test_m3_faults_follow_real_commit_and_keep_external_requests_blocked():
    source = (ROOT / 'scripts/phase0_gate_m3.py').read_text()
    assert source.index('response = context.request.fetch') < source.index("and response.ok and state['proxy504']")
    assert "len(documents['data']) == initial_count + 2" in source
    assert "context.route('**/*', forward)" in source
    assert 'route.abort()' in source
    server = (ROOT / 'scripts/phase0_gate_fault_server.py').read_text()
    assert 'validate_config(' in server
    assert "host='127.0.0.1'" in server
    assert 'KeyRing' in server
