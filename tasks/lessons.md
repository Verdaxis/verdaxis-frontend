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

- **Date:** 2026-04-08
- **Trigger:** The order modal reintroduced a user-facing anonymity toggle even though order identity should stay hidden until final confirmation.
- **Rule:** Keep order placement anonymous by default and do not expose a pre-confirmation anonymity toggle in the modal.
- **Why:** The demo trading flow treats anonymity as a fixed market rule until confirmation, not a per-order user choice.
### Audit staging against actual marketplace surfaces
- **Date:** 2026-04-13
- **Trigger:** A follow-up audit missed that the live marketplace still exposed old orderbook framing and non-approved fuels in active UI/data paths.
- **Rule:** After a redesign, verify the exact user-facing marketplace screens against live staging data and reachable alternate entry paths, not just the primary modal or happy path.
- **Why:** Repo-level checks and partial UI inspection can miss stale seeded data and secondary components that still leak the old model.
### Retire disabled features at the navigation layer
- **Date:** 2026-04-13
- **Trigger:** A marketplace redesign left the watchlist star and watchlist page reachable even though the feature was no longer part of the approved demo flow.
- **Rule:** When a demo feature is deferred or removed, disable every reachable UI entry point and stale saved-navigation state in the same change.
- **Why:** Partial removals leave broken controls in production and create avoidable user-facing regressions.
### Keep the order model symmetric until market feedback proves otherwise
- **Date:** 2026-04-13
- **Trigger:** I started drifting toward asymmetric supplier-vs-buyer listing semantics before the team had aligned on whether Verdaxis should encode that behavior in the product.
- **Rule:** Unless the team explicitly decides otherwise, keep the core orderbook model symmetric and treat supplier/buyer behavioral differences as user behavior, not engine rules.
- **Why:** Prematurely encoding asymmetry complicates the market model and reinvents behavior the team wants to validate with real feedback first.
### Prefer user language over invented feature branding
- **Date:** 2026-04-13
- **Trigger:** I shipped the new watchlist as `Market Radar` / `Market Intelligence` style branding when the simpler user mental model was just `Watchlist`, and the map label also drifted from the requested `Intelligence Map`.
- **Rule:** Default to the user's plain product vocabulary for core navigation and saved-item flows unless a separate naming decision is explicitly approved.
- **Why:** Custom branding obscures the interaction model and makes simple features harder to discover.

### Preserve canonical market products in marketplace filters
- **Date:** 2026-04-13
- **Trigger:** I shipped the watchlist flow while the marketplace was still keyed to generic `fuel_type` chips, which hid pathway-level products and made slice saving less precise than the actual market identity.
- **Rule:** When the market model is canonical `market_product + delivery_point + availability_window`, every user-facing marketplace filter and save action must use that same identity instead of a looser compatibility field.
- **Why:** Mixed filter identities make the UI look broken, create ambiguous watchlist targets, and hide supported products behind legacy labels.

### Inquiry must not execute trades
- **Date:** 2026-04-13
- **Trigger:** Marketplace used an `Inquire` CTA that still hit the old trade execution path and produced `PARTIALLY_FILLED` statuses.
- **Rule:** Keep inquiry/negotiation flows separate from executable trade flows in both labels and backend behavior.
- **Why:** Legacy orderbook wiring survived after the product moved to a listing-first marketplace, causing a misleading and destructive user action.

### Reintroduced views must be reachable from navigation
- **Date:** 2026-04-14
- **Trigger:** The orderbook implementation still existed in the frontend, but it had been dropped from sidebar navigation and render routing, so the user experienced it as missing.
- **Rule:** When reintroducing or preserving a feature, verify the full navigation path and page render wiring, not just that the component still exists in the codebase.
- **Why:** Component-level survival does not matter if the app shell no longer exposes the feature to users.

### Raise filter stack above sticky market tables
- **Date:** 2026-04-14
- **Trigger:** Marketplace dropdowns rendered behind the orderbook/listings area.
- **Rule:** When adding overlays above sticky tables, check stacking contexts at the parent container level, not just the dropdown menu's local z-index.
- **Why:** The select menu had a high local z-index, but its parent header sat below sibling sticky table headers in the overall stacking order.

### Tooltip intent over detail rail
- **Date:** 2026-04-14
- **Trigger:** I implemented the orderbook hover details as a persistent top info strip when the user expected a tooltip-style hover treatment.
- **Rule:** When the user describes a hover effect as tooltip-like, implement an anchored transient tooltip near the hovered element, not a separate persistent detail rail.
- **Why:** I preserved information but missed the interaction model the user was actually asking for.

### Deploy UI changes before describing them as visible
- **Date:** 2026-04-14
- **Trigger:** I said the orderbook hover had been changed to a tooltip, but the user still saw the old persistent top detail rail on staging.
- **Rule:** Do not describe frontend behavior as changed for the user until the updated bundle is actually built and deployed to the environment they are viewing.
- **Why:** I verified local code and tests, but not the live staging asset the user was interacting with.

### Portal floating tooltips out of transformed containers
- **Date:** 2026-04-14
- **Trigger:** The orderbook tooltip rendered at the bottom of the page instead of next to the hovered row on staging.
- **Rule:** When a floating overlay needs viewport-relative positioning, render it through a body-level portal instead of inside potentially transformed or scrolling component containers.
- **Why:** Fixed positioning inside a transformed/stacked UI subtree can behave relative to that subtree, not the viewport.

### Avoid stacked tooltip systems
- **Date:** 2026-04-14
- **Trigger:** After adding a custom hover tooltip, the old browser `title` tooltip still appeared on orderbook rows.
- **Rule:** When implementing a custom tooltip, remove native `title` tooltips from the same interactive element unless they are intentionally duplicated.
- **Why:** Overlapping tooltip systems look broken and create conflicting hover feedback.

### Match requested UI copy exactly
- **Date:** 2026-04-14
- **Trigger:** I shipped the orderbook empty-state with 'Select a fuel to view depth' when the requested wording was 'Select a fuel to show Orderbook'.
- **Rule:** For short UI copy changes, use the user's requested wording exactly unless there is a strong product reason not to.
- **Why:** I optimized the phrasing instead of matching the requested label, which created unnecessary iteration.


### Keep ASK metadata strict and BID metadata broad
- **Date:** 2026-04-14
- **Trigger:** I left supplier asks and buyer bids too symmetrical in metadata strictness after the user clarified that only asks must carry detailed origin, CI, and document fields.
- **Rule:** Treat supplier ASK metadata completeness as mandatory for public execution, while allowing BID orders to omit non-executable detail fields unless the user explicitly promotes them.
- **Why:** The executable market is symmetric in mechanics, but not every descriptive field should be mandatory on both sides.


### Make filter disclosure behavior consistent across breakpoints
- **Date:** 2026-04-14
- **Trigger:** I limited the Marketplace filter collapse behavior to narrow widths after the user wanted the fuel-only collapsed state available on tablet and then all widths.
- **Rule:** When a control group is meant to collapse behind a disclosure, keep that interaction model consistent across breakpoints unless the user explicitly wants desktop to behave differently.
- **Why:** Breakpoint-specific interaction changes made the same filter rail feel inconsistent and forced another UI correction.

### Confirm whether shared filters should persist across tabs
- **Date:** 2026-04-14
- **Trigger:** I removed the marketplace filters from `My Orders`, but the intended behavior was that the same filters should still apply there.
- **Rule:** When a tab shares the same underlying market context, verify whether the user wants continuity of filters before decoupling the UI just because the data is personal.
- **Why:** I optimized for separation of concerns without checking whether the product wanted a unified filtered workspace across tabs.

### Distinguish page-local counts from real filter totals
- **Date:** 2026-04-14
- **Trigger:** I showed fuel-chip counts using only the current paginated listings page and left `My Orders` unfiltered even though the visible filter state implied both should follow the active slice.
- **Rule:** When a UI shows persistent filter state, every visible dataset and count label in that workspace must either honor the same filters or be clearly labeled as a different scope.
- **Why:** Reusing page-local data for global-looking counters and unfiltered personal rows made the interface look inconsistent and misleading.

### Keep aggregate chips separate from selected-slice totals
- **Date:** 2026-04-14
- **Trigger:** I left the `All` fuel chip tied to the currently selected slice total, so its count changed to the selected fuel instead of staying as the aggregate total.
- **Rule:** When a control represents an aggregate bucket like `All`, compute its count from the aggregate dataset rather than reusing the active filtered result count.
- **Why:** Reusing the selected-slice total made the aggregate label misleading and broke the mental model of the chip row.
