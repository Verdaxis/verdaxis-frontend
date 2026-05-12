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
### Marketplace product-vs-fuel filters
- **Date:** 2026-05-12
- **Trigger:** I narrowed Marketplace to Methanol/Ethanol fuel families when the product model needed the four canonical products.
- **Rule:** When a flow has already moved to canonical market products, update filters and synced views end-to-end instead of stopping at broad fuel-family cleanup.
- **Why:** I optimized for a quick UI cleanup and left the underlying filter model half-migrated.

### Live deploy verification needs runtime checks
- **Date:** 2026-05-12
- **Trigger:** I relied on bundle-string checks and declared the marketplace/demo-marker deploy good before validating the live UI/API behavior the user was actually seeing.
- **Rule:** When a user reports a live frontend mismatch, verify the runtime behavior end-to-end, not just that a built asset contains the expected strings.
- **Why:** Deployment can be current while the UI logic is still wrong, and static bundle checks do not prove the visible flow works.

### Keep micro-badges out of price lanes
- **Date:** 2026-05-12
- **Trigger:** I placed the demo-listing marker inline with orderbook price text, which distorted the ask-side layout.
- **Rule:** For dense trading surfaces, status markers should sit on the outer edge of the row and not consume price-lane space.
- **Why:** Inline badges in compact market tables break alignment and make the price ladder harder to scan.

### Mirror tooltip direction to the edge anchor
- **Date:** 2026-05-12
- **Trigger:** After moving the ask-side demo marker to the outside edge, I left its tooltip opening upward instead of outward.
- **Rule:** When an icon is anchored to an outer edge in a dense table, set the tooltip to open away from the content lane on that same side.
- **Why:** Edge-anchored markers need edge-anchored tooltips, or the popup still occludes the main content.

### Preserve approved public-page flows during refactors
- **Date:** 2026-05-12
- **Trigger:** The pilot page on prod drifted back to an older embedded-form version even though the agreed flow had already changed to a signup CTA.
- **Rule:** When touching public pages during i18n or layout refactors, compare the live route against the most recently approved user flow, not just the current translation keys or component compile state.
- **Why:** Public marketing routes can regress semantically without causing build failures, especially when old components still exist in the tree.
