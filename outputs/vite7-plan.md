# Vite 7 Implementation Plan

**Goal:** Move the frontend toolchain from Vite 6 to Vite 7 without changing appearance or behavior (D9; founder decision 61).

**Architecture:** Retain the three custom Vite plugins, manual chunks, asset inlining policy and prerendering. Set the previous browser target explicitly. No application source or screenshot baseline changes.

## Execution

1. Inventory Node pins and release build control. Read the official Vite 7 migration guide. Inspect the test host runtime and compatible package metadata.
2. Capture a fresh Vite 6 production build, all emitted HTML paths, hash-independent chunk names, shell resource hints and five route budgets. Preserve the artifact on the lane's host workspace.
3. Commit Node policy: Node 24 engine and Docker builder; retain existing Node 24 CI and release pins. Confirm the repository can control the Vercel build runtime through package engines.
4. Regenerate the lockfile on the test host with `npm install --legacy-peer-deps` for current Vite 7-compatible toolchain packages. Preserve unrelated locked packages. Pin Vite 6 browser targets in `vite.config.ts`. Update stack documentation. Commit this migration after verification.
5. Run every `run:` command in `.github/workflows/frontend-ci.yml`, plus the explicit measurement-token build, route budget report and journey gate. Capture each command's own exit code. Do not record screenshot baselines.
6. Compare Vite 6 and Vite 7 emitted HTML, hints, chunk names and route bytes. Explain changes above 1%. Record all nine screenshot differences and eleven journey outcomes. Commit final evidence under `outputs/`.

## Host protocol

All installs, builds and tests use `verdaxis-prod-test "$PWD" 'COMMAND'`. Heavy commands first wait for `rust_contract.measure`/`simulate`, then acquire `/home/verdaxis-test/.verdaxis-heavy.lock` with a 5400-second timeout. Run one call at a time. Long calls write local `work/*.log` with `CALL_EXIT=` and use blocking waits. Never interrupt a call, leave a call running, deploy, push, or use subagents. Stop if the runner reports PAUSED.

## Acceptance

- Each gate has its own recorded exit code; all required gates pass.
- Same emitted pages, shell hints, named chunks and asset rules; no route budget regression.
- All journeys pass; every screenshot difference is at most 0.2%; baseline files unchanged.
- Small logical commits use the requested Claude Opus 5.5 trailer.

## Resume point

Initial source and workflow reads complete. Worktree started clean at `425e3cb8`. CI and release use Node 24; test host reports Node 24.22.0 and npm 11.19.1. Docker uses Node 20. Next: collect package metadata and Vite 6 artifact under the host lock.
