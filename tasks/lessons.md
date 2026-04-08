# Lessons — Verdaxis Frontend
<!-- Self-improvement-loop: Add corrections here as Trigger → Rule → Why -->
<!-- Read at session start. Write after ANY user correction. -->

## Format
- **Date:** YYYY-MM-DD
- **Trigger:** What happened
- **Rule:** What to do instead
- **Why:** Root cause

## Security

- **Date:** 2026-02-18
- **Trigger:** Gemini API key baked into client-side bundle via vite.config.ts define block.
- **Rule:** Never expose API keys in client-side code; proxy through a backend route instead.
- **Why:** Keys are extractable from the production JS bundle with billing and quota risk.

- **Date:** 2026-02-18
- **Trigger:** .env.bak with Authentik credentials found untracked in project root.
- **Rule:** Add *.bak to .gitignore and never leave credential backup files in the working directory.
- **Why:** Untracked backup files can be accidentally committed, exposing infrastructure credentials.

## Testing

- **Date:** 2026-02-18
- **Trigger:** LandingPage test timed out due to GSAP, Lenis, and Motion animation libraries.
- **Rule:** Mock heavy animation libraries in test setup files.
- **Why:** jsdom cannot efficiently process animation libraries, causing test timeouts.

## Dependencies

- **Date:** 2026-02-18
- **Trigger:** Orphaned deps (@auth0/auth0-react, oidc-client-ts, react-oidc-context, @studio-freight/lenis) left after removing Authentik auth.
- **Rule:** When removing a feature, also remove its dependencies from package.json.
- **Why:** Unused dependencies increase bundle size, attack surface, and maintenance burden.

- **Date:** 2026-04-08
- **Trigger:** The order placement flow initially framed timing as delivery logistics instead of marketplace availability.
- **Rule:** Keep the UI and API aligned on mandatory `Availability Window` semantics for matching, and leave delivery logistics out of the demo flow.
- **Why:** The demo needs a simple, extensible orderbook model where timing drives matching without pretending to manage physical delivery scheduling.

- **Date:** 2026-04-08
- **Trigger:** Stale `AI_README.md` context still existed despite the repo using `CLAUDE.md` and `.codesight` as the active bootstrap path.
- **Rule:** Delete obsolete AI guidance files and keep the active agent instructions centralized in `CLAUDE.md`, `ARCHITECTURE.md`, and `.codesight`.
- **Why:** Duplicate AI docs create conflicting guidance and make repo context less reliable.

- **Date:** 2026-04-08
- **Trigger:** Staging deployment was initially treated as runtime-only while the user wanted all approved branch changes merged into staging first.
- **Rule:** Consolidate approved frontend branches into `origin/staging` before building and publishing staging assets.
- **Why:** Runtime-only deploys without branch consolidation leave staging behavior inconsistent with approved git history.
