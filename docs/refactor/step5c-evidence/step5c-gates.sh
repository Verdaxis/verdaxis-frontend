#!/usr/bin/env bash
# Run only inside verdaxis-prod-test and the shared heavy lock.
set +e
export VITE_MAPBOX_PUBLIC_TOKEN=pk.measurement-only
failed=0
gate() {
    printf '\n=== GATE %s ===\n' "$1"
    bash -lc "$1"
    result=$?
    printf 'GATE_EXIT [%s]=%s\n' "$1" "$result"
    if [ "$result" -ne 0 ]; then failed=1; fi
}
gate 'npm ci --legacy-peer-deps'
gate 'npm test'
gate 'node --test scripts/phase0-request-manifest.test.mjs'
gate 'npm run check:openapi'
gate 'npm run check:api-types'
gate 'npm run test:artifact-check'
gate 'npm run test:openapi-source'
gate 'npm run test:release-smoke'
gate 'npm run typecheck'
gate 'npm run i18n:check'
gate 'npm run build:staging'
gate 'npm run build:check:staging'
gate 'npm run build:prod'
gate 'npm run build:check'
gate 'node scripts/check-build-artifacts.mjs --report --root dist'
gate 'VITE_MAPBOX_PUBLIC_TOKEN=pk.measurement-only npm run build'
gate 'node scripts/check-build-artifacts.mjs --report --root dist'
# Disposable lane-local backend checkout; never use a live checkout.
if [ ! -d work/journeys-backend/.git ]; then
    git clone --shared --no-checkout /home/verdaxis-test/mirror/verdaxis-backend.git work/journeys-backend
fi
git -C work/journeys-backend checkout --detach 56d7577085af99411a6f9c3e34e64ad929d09954
ln -sfn /home/verdaxis-test/venv312 work/journeys-backend/venv
gate 'npm run smoke:journeys'
exit "$failed"
