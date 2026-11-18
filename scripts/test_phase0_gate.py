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
