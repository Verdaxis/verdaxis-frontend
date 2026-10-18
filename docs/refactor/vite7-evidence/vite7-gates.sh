#!/usr/bin/env bash
# Run only through verdaxis-prod-test under the shared heavy lock and timeout.
# Run vite7-structural-gates.sh first to create the Vite 6 reference.
set -u
export VITE_MAPBOX_PUBLIC_TOKEN=pk.measurement-only
export VERDAXIS_BACKEND_TREE=/home/verdaxis-test/runs/fe-journeys/work/journeys-backend
mkdir -p work/vite7-gates
: > docs/refactor/vite7-evidence/vite7-gate-exits.tsv
failed=0
run_gate() {
  local name="$1" command="$2" rc
  printf '\n===== %s: %s =====\n' "$name" "$command"
  bash -lc "$command" > "work/vite7-gates/$name.log" 2>&1
  rc=$?
  printf '%s\t%s\t%s\n' "$name" "$rc" "$command" >> docs/refactor/vite7-evidence/vite7-gate-exits.tsv
  printf 'GATE %s EXIT=%s\n' "$name" "$rc"
  if [ "$rc" -ne 0 ]; then
    failed=1
    printf 'See work/vite7-gates/%s.log\n' "$name"
  fi
}
run_gate ci-install 'npm ci --legacy-peer-deps'
run_gate ci-tests 'npm test'
run_gate ci-phase0 'node --test scripts/phase0-request-manifest.test.mjs'
run_gate ci-openapi 'npm run check:openapi'
run_gate ci-api-types 'npm run check:api-types'
run_gate ci-artifact-tests 'npm run test:artifact-check'
run_gate ci-openapi-tests 'npm run test:openapi-source'
run_gate ci-release-tests 'npm run test:release-smoke'
run_gate ci-typecheck 'npm run typecheck'
run_gate ci-i18n 'npm run i18n:check'
run_gate ci-build-staging 'npm run build:staging'
run_gate ci-check-staging 'npm run build:check:staging'
run_gate ci-build-prod 'npm run build:prod'
run_gate ci-check-prod 'npm run build:check'
run_gate build-comparison 'node docs/refactor/vite7-evidence/vite7-compare.mjs'
run_gate measurement-build 'VITE_MAPBOX_PUBLIC_TOKEN=pk.measurement-only npm run build'
run_gate budget-report 'node scripts/check-build-artifacts.mjs --report --root dist'
run_gate journeys 'npm run smoke:journeys'
exit "$failed"
