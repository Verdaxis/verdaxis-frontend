#!/usr/bin/env bash
# Invoke through verdaxis-prod-test, the shared lock and a one-hour timeout.
set -u
export VITE_MAPBOX_PUBLIC_TOKEN=pk.measurement-only
mkdir -p work/vite7-structural work/vite6-reference
: > docs/refactor/vite7-evidence/vite7-structural-exits.tsv
run_gate() {
  local name="$1" command="$2" rc
  bash -lc "$command" > "work/vite7-structural/$name.log" 2>&1
  rc=$?
  printf '%s\t%s\t%s\n' "$name" "$rc" "$command" >> docs/refactor/vite7-evidence/vite7-structural-exits.tsv
  printf 'GATE %s EXIT=%s\n' "$name" "$rc"
  if [ "$rc" -ne 0 ]; then return "$rc"; fi
}
run_gate reference-source 'git archive 425e3cb8 | tar -xf - -C work/vite6-reference' || exit $?
run_gate reference-install 'cd work/vite6-reference && npm ci --legacy-peer-deps' || exit $?
run_gate reference-build 'cd work/vite6-reference && npm run build:prod' || exit $?
run_gate reference-check 'cd work/vite6-reference && npm run build:check' || exit $?
run_gate reference-budgets 'cd work/vite6-reference && node scripts/check-build-artifacts.mjs --report --root dist' || exit $?
run_gate migrated-install 'npm ci --legacy-peer-deps' || exit $?
run_gate migrated-build 'npm run build:prod' || exit $?
run_gate migrated-check 'npm run build:check' || exit $?
run_gate migrated-budgets 'node scripts/check-build-artifacts.mjs --report --root dist' || exit $?
run_gate structural-comparison 'node docs/refactor/vite7-evidence/vite7-compare.mjs' || exit $?
