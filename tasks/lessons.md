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
