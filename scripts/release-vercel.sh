#!/usr/bin/env bash
# Build once, validate on canary, then promote the same Vercel deployment.
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${VERDAXIS_RELEASE_REPORT_DIR:-$ROOT/release-report}"
REPORT="$REPORT_DIR/release.json"
CANARY_URL="https://canary.verdaxis.exchange"
APP_URL="https://app.verdaxis.exchange"
PRODUCTION_API="https://api.verdaxis.exchange/api"
PROJECT_NAME="${VERCEL_PROJECT_NAME:-verdaxis-frontend}"
STAGE="initialization"
OUTCOME="failed"
PRIOR_ID=""
PRIOR_ASSET=""
CANDIDATE_ID=""
CANDIDATE_URL=""
CANDIDATE_ASSET=""
RESTORED_ID=""
RESTORED_ASSET=""
NOTIFIED=0
AUTH_DIR=""

usage() {
  echo "Usage: $0 [--candidate-only|--self-test]" >&2
}

die() {
  echo "release error: $*" >&2
  exit 1
}

notify() {
  local message="$1"
  if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
    return
  fi
  TELEGRAM_MESSAGE="$message" python3 - <<'PY' >/dev/null 2>&1 || true
import os
import urllib.parse
import urllib.request

payload = urllib.parse.urlencode({
    "chat_id": os.environ["TELEGRAM_CHAT_ID"],
    "text": os.environ["TELEGRAM_MESSAGE"][:3900],
}).encode()
request = urllib.request.Request(
    f"https://api.telegram.org/bot{os.environ['TELEGRAM_BOT_TOKEN']}/sendMessage",
    data=payload,
)
urllib.request.urlopen(request, timeout=10).close()
PY
  NOTIFIED=1
}

write_report() {
  mkdir -p "$REPORT_DIR"
  jq -n \
    --arg outcome "$OUTCOME" \
    --arg stage "$STAGE" \
    --arg source_sha "$(git -C "$ROOT" rev-parse HEAD 2>/dev/null || true)" \
    --arg prior_id "$PRIOR_ID" \
    --arg prior_asset "$PRIOR_ASSET" \
    --arg candidate_id "$CANDIDATE_ID" \
    --arg candidate_url "$CANDIDATE_URL" \
    --arg candidate_asset "$CANDIDATE_ASSET" \
    --arg restored_id "$RESTORED_ID" \
    --arg restored_asset "$RESTORED_ASSET" \
    --arg generated_at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      outcome: $outcome,
      stage: $stage,
      source_sha: $source_sha,
      prior: {id: $prior_id, asset: $prior_asset},
      candidate: {id: $candidate_id, url: $candidate_url, asset: $candidate_asset},
      restored: {id: $restored_id, asset: $restored_asset},
      generated_at: $generated_at
    }' > "$REPORT"
}

cleanup() {
  local code=$?
  rm -f "$ROOT/.vercel/.env.production.local"
  if [[ -n "$AUTH_DIR" ]]; then
    rm -rf "$AUTH_DIR"
  fi
  if [[ $code -ne 0 ]]; then
    write_report
    if [[ $NOTIFIED -eq 0 ]]; then
      notify "Verdaxis production release failed during ${STAGE}. Production was not intentionally changed unless a promotion had already completed. See the GitHub Actions release report."
    fi
  fi
}
trap cleanup EXIT

should_auto_rollback() {
  [[ "$1" == "10,10,10" && "$2" == "true" && "$3" == "true" && "$4" == "true" ]]
}

alias_transition_state() {
  local expected_id="$1" expected_type="$2" current_id="$3"
  local target_id="$4" request_type="$5" job_status="$6" observed="$7"

  if [[ "$target_id" == "$expected_id" && "$request_type" == "$expected_type" ]]; then
    case "$job_status" in
      succeeded)
        [[ "$current_id" == "$expected_id" ]] && echo success || echo failed
        ;;
      pending|in-progress)
        echo waiting
        ;;
      *)
        echo failed
        ;;
    esac
    return
  fi
  if [[ "$job_status" == "pending" || "$job_status" == "in-progress" ]]; then
    echo conflict
  elif [[ "$current_id" == "$expected_id" ]]; then
    echo success
  elif [[ "$observed" == "true" ]]; then
    echo failed
  else
    echo awaiting
  fi
}

self_test() {
  should_auto_rollback "10,10,10" true true true
  ! should_auto_rollback "10,20,10" true true true
  ! should_auto_rollback "10,10,10" false true true
  ! should_auto_rollback "10,10,10" true false true
  ! should_auto_rollback "10,10,10" true true false
  [[ "$(alias_transition_state candidate promote candidate candidate promote succeeded false)" == "success" ]]
  [[ "$(alias_transition_state candidate promote prior candidate promote pending false)" == "waiting" ]]
  [[ "$(alias_transition_state candidate promote prior other promote pending false)" == "conflict" ]]
  [[ "$(alias_transition_state candidate promote candidate other promote pending true)" == "conflict" ]]
  [[ "$(alias_transition_state candidate promote prior '' '' '' false)" == "awaiting" ]]
  [[ "$(alias_transition_state candidate promote prior '' '' '' true)" == "failed" ]]
  echo "Release rollback policy checks passed."
}

MODE="release"
case "${1:-}" in
  "")
    ;;
  --candidate-only)
    MODE="candidate-only"
    ;;
  --self-test)
    self_test
    exit 0
    ;;
  *)
    usage
    exit 2
    ;;
esac

require_command() {
  command -v "$1" >/dev/null || die "missing required command: $1"
}

vc() {
  vercel --global-config "$AUTH_DIR" --no-color "$@"
}

entry_asset() {
  curl --fail --silent --show-error --location \
    --retry 5 --retry-delay 3 --connect-timeout 10 --max-time 30 "$1" |
    PYTHONPATH="$ROOT" python3 -c \
      'import sys; from scripts.smoke_release import extract_index_asset; print(extract_index_asset(sys.stdin.read()))'
}

deployment_id_for() {
  vc inspect "$1" --format json |
    jq -er '.id'
}

alias_request_json() {
  VERCEL_API_TOKEN="$VERCEL_TOKEN" \
  VERCEL_API_PROJECT_ID="$VERCEL_PROJECT_ID" \
  VERCEL_API_ORG_ID="$VERCEL_ORG_ID" \
  python3 - <<'PY'
import json
import os
import urllib.parse
import urllib.request

project_id = os.environ["VERCEL_API_PROJECT_ID"]
team_id = os.environ["VERCEL_API_ORG_ID"]
url = (
    f"https://api.vercel.com/v9/projects/{urllib.parse.quote(project_id, safe='')}"
    f"?teamId={urllib.parse.quote(team_id, safe='')}"
)
request = urllib.request.Request(
    url,
    headers={
        "Accept": "application/json",
        "Authorization": f"Bearer {os.environ['VERCEL_API_TOKEN']}",
    },
)
with urllib.request.urlopen(request, timeout=20) as response:
    payload = json.load(response)
if payload.get("id") != project_id:
    raise SystemExit("Vercel returned the wrong project")
print(json.dumps(payload.get("lastAliasRequest") or {}, separators=(",", ":")))
PY
}

assert_no_active_alias_job() {
  local request status
  request="$(alias_request_json)" || die "cannot verify Vercel alias-job state"
  status="$(jq -r '.jobStatus // ""' <<<"$request")"
  [[ "$status" != "pending" && "$status" != "in-progress" ]] ||
    die "another Vercel promotion or rollback is active"
}

wait_for_alias_transition() {
  local expected_id="$1" expected_type="$2"
  local request current target request_type status state
  local observed=false
  local awaiting_count=0

  while true; do
    if ! request="$(alias_request_json)"; then
      sleep 3
      continue
    fi
    if ! current="$(deployment_id_for "$APP_URL")"; then
      sleep 3
      continue
    fi
    target="$(jq -r '.toDeploymentId // ""' <<<"$request")"
    request_type="$(jq -r '.type // ""' <<<"$request")"
    status="$(jq -r '.jobStatus // ""' <<<"$request")"
    state="$(alias_transition_state \
      "$expected_id" "$expected_type" "$current" \
      "$target" "$request_type" "$status" "$observed")"

    case "$state" in
      success)
        return
        ;;
      waiting)
        observed=true
        awaiting_count=0
        ;;
      awaiting)
        awaiting_count=$((awaiting_count + 1))
        [[ "$awaiting_count" -le 150 ]] ||
          die "Vercel did not expose the requested $expected_type job"
        ;;
      conflict)
        die "a different Vercel alias job superseded the requested $expected_type"
        ;;
      *)
        die "Vercel $expected_type did not complete at deployment $expected_id"
        ;;
    esac
    sleep 2
  done
}

api_is_ready() {
  curl --fail --silent --show-error --connect-timeout 10 --max-time 20 \
    "https://api.verdaxis.exchange/health/ready" |
    jq -e '
      .status == "ok" and
      .db == "ok" and
      .environment == "production" and
      (.release_sha | type == "string" and length == 40)
    ' >/dev/null
}

run_smoke() {
  local url="$1"
  local label="$2"
  local expected_asset="${3:-$CANDIDATE_ASSET}"
  local output="$REPORT_DIR/smoke-${label}.json"
  python3 "$ROOT/scripts/smoke_release.py" \
    --base-url "$url" \
    --expected-api-url "$PRODUCTION_API" \
    --expected-index-asset "$expected_asset" \
    --output "$output" \
    --screenshot "$REPORT_DIR/smoke-${label}.png"
}

verify_public_assets() {
  local expected_asset="$1"
  local domain actual attempt matched
  for domain in \
    "https://verdaxis.exchange" \
    "https://www.verdaxis.exchange" \
    "$APP_URL"
  do
    matched=false
    for attempt in 1 2 3 4 5 6; do
      actual="$(entry_asset "$domain")"
      if [[ "$(basename "$actual")" == "$(basename "$expected_asset")" ]]; then
        matched=true
        break
      fi
      sleep 5
    done
    [[ "$matched" == "true" ]] ||
      die "$domain serves $(basename "$actual"), expected $(basename "$expected_asset")"
  done
}

STAGE="preflight"
for command in git jq curl flock node npm python3 vercel; do
  require_command "$command"
done

[[ "${VERDAXIS_RELEASE_CONTEXT:-}" == "github-actions" ]] ||
  die "run production releases from the protected GitHub Actions workflow"

[[ -n "${VERCEL_TOKEN:-}" ]] || die "VERCEL_TOKEN is required"
[[ -n "${VERCEL_ORG_ID:-}" ]] || die "VERCEL_ORG_ID is required"
[[ -n "${VERCEL_PROJECT_ID:-}" ]] || die "VERCEL_PROJECT_ID is required"
[[ ! -e "$ROOT/.env.local" && ! -e "$ROOT/.env.production.local" ]] ||
  die "local Vite override files are forbidden for releases"
[[ -z "$(git -C "$ROOT" status --porcelain)" ]] || die "release checkout is dirty"

exec 9>"${RUNNER_TEMP:-/tmp}/verdaxis-vercel-production.lock"
flock -n 9 || die "another Verdaxis Vercel release is running"

git -C "$ROOT" fetch --quiet origin prod
SOURCE_SHA="$(git -C "$ROOT" rev-parse HEAD)"
[[ "$SOURCE_SHA" == "$(git -C "$ROOT" rev-parse origin/prod)" ]] ||
  die "HEAD must exactly match origin/prod"

AUTH_DIR="$(mktemp -d)"
chmod 700 "$AUTH_DIR"
jq -n --arg token "$VERCEL_TOKEN" '{token: $token}' > "$AUTH_DIR/auth.json"
chmod 600 "$AUTH_DIR/auth.json"

mkdir -p "$ROOT/.vercel"
jq -n \
  --arg projectId "$VERCEL_PROJECT_ID" \
  --arg orgId "$VERCEL_ORG_ID" \
  --arg projectName "$PROJECT_NAME" \
  '{projectId: $projectId, orgId: $orgId, projectName: $projectName}' \
  > "$ROOT/.vercel/project.json"

[[ -n "$(vc whoami)" ]] || die "Vercel authentication failed"
REMOTE_ENV="$(vc env ls production --format json)"
if jq -e '.envs // [] | any(.key == "VITE_API_URL")' <<<"$REMOTE_ENV" >/dev/null; then
  die "Vercel Production must not define VITE_API_URL"
fi

STAGE="source verification"
cd "$ROOT"
npm ci --legacy-peer-deps
npm run test
npm run test:artifact-check
npm run typecheck
npm run i18n:check
python3 scripts/test_smoke_release.py
bash scripts/release-vercel.sh --self-test
[[ -z "$(git status --porcelain)" ]] ||
  die "source verification changed the release checkout"

STAGE="immutable build"
rm -rf "$ROOT/.vercel/output"
vc pull --yes --environment=production
rm -f "$ROOT/.vercel/.env.production.local"
unset VITE_API_URL
vc build --prod --yes
node scripts/check-build-artifacts.mjs \
  --target production \
  --root .vercel/output/static
CANDIDATE_ASSET="$(
  PYTHONPATH="$ROOT" python3 -c \
    'from pathlib import Path; from scripts.smoke_release import extract_index_asset; print(extract_index_asset(Path(".vercel/output/static/index.html").read_text()))'
)"

STAGE="candidate deployment"
PRIOR_JSON="$(vc inspect app.verdaxis.exchange --format json)"
PRIOR_ID="$(jq -er '.id' <<<"$PRIOR_JSON")"
PRIOR_ASSET="$(entry_asset "$APP_URL")"

DEPLOY_JSON="$(vc deploy --prebuilt --prod --skip-domain --yes --format json)"
CANDIDATE_ID="$(jq -er '.deployment.id // .id' <<<"$DEPLOY_JSON")"
CANDIDATE_URL="$(jq -er '.deployment.url // .url' <<<"$DEPLOY_JSON")"
[[ "$CANDIDATE_URL" == https://* ]] || CANDIDATE_URL="https://$CANDIDATE_URL"

INSPECT_JSON="$(vc inspect "$CANDIDATE_ID" --wait --timeout 3m --format json)"
[[ "$(jq -r '.readyState' <<<"$INSPECT_JSON")" == "READY" ]] ||
  die "candidate deployment is not READY"
[[ "$(jq -r '.name' <<<"$INSPECT_JSON")" == "$PROJECT_NAME" ]] ||
  die "candidate belongs to the wrong Vercel project"
[[ "$(jq -r '.target' <<<"$INSPECT_JSON")" == "production" ]] ||
  die "candidate is not a production-target artifact"

vc alias set "$CANDIDATE_URL" "canary.verdaxis.exchange"
STAGE="candidate smoke"
run_smoke "$CANARY_URL" "canary"

if [[ "$MODE" == "candidate-only" ]]; then
  OUTCOME="candidate_passed"
  STAGE="complete"
  write_report
  notify "Verdaxis Vercel candidate ${CANDIDATE_ID} passed rendered canary checks. Production was not changed."
  exit 0
fi

STAGE="promotion"
assert_no_active_alias_job
[[ "$(deployment_id_for "$APP_URL")" == "$PRIOR_ID" ]] ||
  die "production changed after the prior deployment was captured"
set +e
vc promote "$CANDIDATE_ID" --yes --timeout 0
set -e
wait_for_alias_transition "$CANDIDATE_ID" promote
verify_public_assets "$CANDIDATE_ASSET"

STAGE="post-promotion smoke"
POST_CODES=()
for attempt in 1 2 3; do
  set +e
  run_smoke "$APP_URL" "production-${attempt}"
  code=$?
  set -e
  POST_CODES+=("$code")
  [[ $code -eq 0 ]] && break
  sleep 10
done

if [[ "${POST_CODES[-1]}" -ne 0 ]]; then
  code_csv="$(IFS=,; echo "${POST_CODES[*]}")"
  current_matches=false
  api_ready=false
  same_failure=false
  [[ "$(deployment_id_for "$APP_URL")" == "$CANDIDATE_ID" ]] && current_matches=true
  api_is_ready && api_ready=true
  if [[ "$code_csv" == "10,10,10" ]]; then
    first_failure="$(jq -c '.failures.frontend_critical | sort' "$REPORT_DIR/smoke-production-1.json")"
    second_failure="$(jq -c '.failures.frontend_critical | sort' "$REPORT_DIR/smoke-production-2.json")"
    third_failure="$(jq -c '.failures.frontend_critical | sort' "$REPORT_DIR/smoke-production-3.json")"
    [[ "$first_failure" == "$second_failure" && "$second_failure" == "$third_failure" ]] &&
      same_failure=true
  fi

  if should_auto_rollback "$code_csv" "$api_ready" "$current_matches" "$same_failure"; then
    STAGE="automatic rollback"
    assert_no_active_alias_job
    [[ "$(deployment_id_for "$APP_URL")" == "$CANDIDATE_ID" ]] ||
      die "candidate stopped being current before rollback"
    api_is_ready || die "production API stopped being healthy before rollback"
    set +e
    vc rollback "$PRIOR_ID" --yes --timeout 0
    set -e
    wait_for_alias_transition "$PRIOR_ID" rollback
    RESTORED_ID="$PRIOR_ID"
    RESTORED_ASSET="$PRIOR_ASSET"
    OUTCOME="rollback_verification_failed"
    verify_public_assets "$PRIOR_ASSET"
    run_smoke "$APP_URL" "rollback" "$PRIOR_ASSET"
    OUTCOME="rolled_back"
    write_report
    notify "Verdaxis automatically rolled back frontend deployment ${CANDIDATE_ID} to ${PRIOR_ID} after three deterministic frontend failures. The production API remained healthy."
    exit 1
  fi

  notify "Verdaxis production release ${CANDIDATE_ID} needs review. Post-promotion smoke exit codes: ${code_csv}. No automatic rollback was attempted because the failure was dependency-related, transient, or no longer attributable to the candidate."
  exit 1
fi

OUTCOME="promoted"
STAGE="complete"
write_report
notify "Verdaxis frontend deployment ${CANDIDATE_ID} passed canary and production checks."
if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## Verdaxis Vercel release"
    echo
    echo "- Deployment: \`$CANDIDATE_ID\`"
    echo "- Source: \`$SOURCE_SHA\`"
    echo "- Entry asset: \`$(basename "$CANDIDATE_ASSET")\`"
    echo "- Result: promoted and rendered smoke passed"
  } >> "$GITHUB_STEP_SUMMARY"
fi
