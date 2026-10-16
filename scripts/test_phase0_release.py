"""Offline checks for the canonical, build-once release boundary."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_workflow_requires_pinned_source_and_backend():
    workflow = (ROOT / '.github/workflows/release-vercel.yml').read_text()
    assert 'source_sha:' in workflow
    assert 'backend_release_sha:' in workflow
    assert 'ref: ${{ inputs.source_sha }}' in workflow
    assert 'candidate_only:' in workflow
    assert 'default: true' in workflow
    assert 'ref: prod' not in workflow


def test_release_binds_canonical_tip_and_backend_identity():
    script = (ROOT / 'scripts/release-vercel.sh').read_text()
    assert 'origin/staging' in script
    assert 'origin/prod' not in script
    assert 'BACKEND_RELEASE_SHA' in script
    assert '.release_sha == $expected_sha' in script
    assert script.count('vc build --prod --yes') == 1
    assert 'run_alias_operation promote "$CANDIDATE_URL"' in script
    assert script.index('api_is_ready || die') < script.index('vc alias set')
    promotion = script[script.index('STAGE="promotion"'):]
    assert promotion.index('api_is_ready || die') < promotion.index('run_alias_operation promote')


def test_release_self_test_is_offline():
    result = subprocess.run(['bash', 'scripts/release-vercel.sh', '--self-test'], cwd=ROOT,
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr
