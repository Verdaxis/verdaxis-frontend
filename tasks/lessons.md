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

### Orderbook demo markers need full interaction coverage
- **Date:** 2026-05-12
- **Trigger:** The demo-listing marker tooltip was clipped in the orderbook, ask-side marker placement was not mirrored, and the trade modal lacked demo-liquidity warning copy.
- **Rule:** For dense orderbook annotations, test both bid and ask placement, tooltip overflow behavior, and the downstream trade modal state before calling the UI fixed.
- **Why:** I validated the visible marker in isolation and missed container clipping plus the modal path opened from demo liquidity.

### Admin entitlements must bypass commercial paywalls
- **Date:** 2026-05-14
- **Trigger:** An admin account still saw the Data & Analytics premium lock overlay.
- **Rule:** When a surface is commercially paywalled for normal users, explicitly check admin-role access instead of assuming subscription tier alone captures internal entitlements.
- **Why:** I gated the screen on subscription state only and ignored the separate admin authorization path.

### Avoid conflicting positioning utilities on orderbook markers
- **Date:** 2026-05-14
- **Trigger:** Ask-side demo warning icons still appeared on the left side of ask rows even though the marker wrapper included `right-1`.
- **Rule:** When a wrapper accepts external absolute-positioning classes, do not also apply default `relative` positioning on that same element; tests must assert absence of conflicting position classes, not just presence of the desired one.
- **Why:** The shared tooltip trigger added `relative`, which could override `absolute` in Tailwind's generated CSS and leave the marker in normal flow.

### Guard prop wiring on embedded market widgets
- **Date:** 2026-05-14
- **Trigger:** The terminal embedded forward curve looked empty even though the backend returned demo-derived curve points.
- **Rule:** When passing canonical market filters into embedded widgets, test the exact prop name used by the child component and keep terminal port/product filters aligned with Marketplace localStorage.
- **Why:** Vite did not type-check the JSX prop mismatch, so `marketProduct={selectedProduct}` was silently ignored by `ForwardCurve`, which expects `marketProductCode`.

### Render terminal widgets in embedded mode
- **Date:** 2026-05-14
- **Trigger:** The terminal forward curve still appeared empty and the lightweight-charts TradingView logo was visible.
- **Rule:** When placing standalone widgets inside terminal/grid panels, use their embedded mode and verify visual chrome/attribution does not consume the chart area.
- **Why:** The full ForwardCurve card was rendered inside a short terminal cell, clipping the actual chart, and the main terminal chart did not hide lightweight-charts attribution.

### Share approved market selectors across views
- **Date:** 2026-05-14
- **Trigger:** The Market Terminal port selector still showed backend catalog ports that users cannot trade on, and a stale saved port could leave the forward curve empty.
- **Rule:** Trading selectors must use the shared approved market list and sanitize persisted selections before fetching dependent widgets.
- **Why:** The terminal populated ports from the generic `/ports` catalog, while Marketplace used the restricted trading-port set.

### Verify translated dense forms visually
- **Date:** 2026-05-17
- **Trigger:** The Place Ask modal showed raw i18n keys and overlapping labels in certification metadata fields.
- **Rule:** When adding fields to dense modals, add all locale keys and verify the longest rendered labels inside the actual modal width.
- **Why:** New ask metadata fields were wired before their translations existed, and the modal was too narrow for two-column metadata on desktop-sized viewports.

### Keep staging cache policy aligned with production
- **Date:** 2026-05-17
- **Trigger:** Users reported seeing older signup screens after recent deploys.
- **Rule:** SPA staging hosts must use the same no-store HTML cache policy as production, while keeping hashed assets immutable.
- **Why:** Production had explicit HTML cache headers, but staging served the SPA shell without equivalent cache controls.
### Separate Correctness Fixes From Performance Fixes
- **Date:** 2026-05-17
- **Trigger:** User asked "what about the slow loading?" after a release summary focused on stale state, deploy cache, and market data correctness.
- **Rule:** When the user reports slow loading, explicitly verify bundle size, code splitting, render waterfalls, and API latency; do not treat stale-data fixes as performance work unless measured.
- **Why:** Correctness and cache fixes can reduce perceived slowness, but they do not address large initial bundles or component/API loading paths.
### Validate the Specific Slow Interaction
- **Date:** 2026-05-17
- **Trigger:** User clarified the slow loading is specifically switching between Intelligence Map, Marketplace, and Forward Curve.
- **Rule:** For performance reports, identify whether the complaint is initial page load, first navigation to a heavy module, repeated tab switching, or API refresh latency before choosing a fix.
- **Why:** Route code-splitting improves initial load but can make first navigation to heavy tabs slower unless platform-critical chunks are prefetched or kept warm.
