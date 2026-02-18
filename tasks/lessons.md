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
- **Trigger:** Gemini API key baked into client-side bundle via vite.config.ts define block
- **Rule:** Never expose API keys in client-side code. Proxy through backend or use server-side routes.
- **Why:** Anyone can extract the key from the production JS bundle. Billing and quota implications.

- **Date:** 2026-02-18
- **Trigger:** .env.bak with Authentik credentials found untracked in project root
- **Rule:** Add *.bak to .gitignore. Never leave credential backup files in the working directory.
- **Why:** Risk of accidental commit exposing infrastructure credentials.

## Testing

- **Date:** 2026-02-18
- **Trigger:** LandingPage test times out due to heavy animation libraries (GSAP, Lenis, Motion)
- **Rule:** Mock animation libraries in test setup when testing components with heavy animations.
- **Why:** jsdom cannot efficiently process animation libraries, causing timeouts.

## Dependencies

- **Date:** 2026-02-18
- **Trigger:** Suspected unused deps: @auth0/auth0-react, oidc-client-ts, react-oidc-context, @studio-freight/lenis
- **Rule:** After removing a feature (e.g., Authentik auth), also remove its dependencies from package.json.
- **Why:** Unused dependencies increase bundle size, attack surface, and maintenance burden.
