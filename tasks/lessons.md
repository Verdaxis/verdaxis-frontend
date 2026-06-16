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

### Scope impeccable at the product level, not a single screen
- **Date:** 2026-04-14
- **Trigger:** I framed `.impeccable.md` around Marketplace when the correct scope is the entire Verdaxis frontend.
- **Rule:** When establishing a design-context baseline file, scope it to the full product surface unless the user explicitly wants a section-level or feature-level design context.
- **Why:** A frontend-wide guardrail is more useful than a page-specific one for keeping future UI work coherent across public and authenticated surfaces.

### Root design baselines should cover both public and app surfaces
- **Date:** 2026-04-14
- **Trigger:** I nearly treated `.impeccable.md` as a Marketplace-specific document instead of a Verdaxis-wide frontend baseline.
- **Rule:** When adding a root-level design guardrail file, define rules for the entire frontend product surface, including both public marketing pages and the authenticated app.
- **Why:** Root-level design context is meant to prevent drift across the whole product, not just one workflow.

### Keep trading delivery points on the approved port list
- **Date:** 2026-04-14
- **Trigger:** I left legacy bucket and non-approved ports like `ARA`, `Fujairah`, and `Houston` active after the user narrowed the trading surface to six specific ports.
- **Rule:** When the user defines an approved trading port set, update both the catalog/seed layer and the live dropdown/data sources together, and remove bucket ports like `ARA` from executable trading surfaces.
- **Why:** Mixed port taxonomies make the marketplace, forward curve, and seeded data disagree about what a valid market slice is.

### Keep terminal market surfaces on the canonical trading taxonomy
- **Date:** 2026-04-14
- **Trigger:** I aligned Marketplace and seeds to the approved ports/products but left MarketTerminal on a separate port API and legacy fuel-type list, so the user still saw missing ports and deprecated fuels in the forward-curve terminal.
- **Rule:** When the trading taxonomy changes, update secondary market surfaces like MarketTerminal and forward-curve selectors in the same pass as Marketplace.
- **Why:** Parallel market UIs drift quickly when one uses canonical `market_product + approved ports` and another keeps legacy `fuel_type + ports` sources.


### Anchor market-terminal redesigns to the intended product reference
- **Date:** 2026-04-14
- **Trigger:** I was improving the Forward Curve tab without foregrounding that the desired reference was a Braemar-style customizable trading workspace.
- **Rule:** When redesigning a major market surface, explicitly align the layout and interaction model to the intended benchmark product aesthetic before iterating on individual widgets.
- **Why:** Local UI fixes can still miss the overall product feel if the target interaction model is not treated as the primary constraint.

### Re-verify staging behavior after UI refactors
- **Date:** 2026-04-14
- **Trigger:** I changed the Market Terminal layout and feed wiring, but the user still saw the forward curve missing and both feeds blank on staging.
- **Rule:** After refactoring live market surfaces, verify the exact selected slice on staging and confirm the UI still shows the intended critical data before closing the task.
- **Why:** Passing local tests is not enough when staging data and UI state can diverge from the implementation assumptions.

### Don't replace a real market surface with a proxy chart
- **Date:** 2026-04-14
- **Trigger:** I removed the duplicate Forward Curve widget from Market Terminal but left the top panel on the older orderbook-derived mini-chart, so the user lost the real forward-curve experience.
- **Rule:** When consolidating duplicate market panels, keep the canonical data surface and remove the proxy, not the other way around.
- **Why:** A visually similar chart can still be the wrong product surface if it is backed by a narrower or different data model.

### Dogfood live terminal changes before reporting success
- **Date:** 2026-04-14
- **Trigger:** I reported terminal fixes before reproducing the live authenticated staging UI, and the user had to point out the screen was still broken.
- **Rule:** For terminal and dashboard changes, dogfood the live authenticated UI before claiming a fix is ready.
- **Why:** Local tests and bundle verification do not catch real staging state, auth, or layout failures on their own.

### Check all sidebar sources before calling navigation removed
- **Date:** 2026-05-19
- **Trigger:** The user clarified that Compliance and Education should also be removed after I only checked the primary sidebar navigation.
- **Rule:** When removing sidebar navigation, inspect primary items, footer/admin items, and secondary partner/link sections before deciding the sidebar is clean.
- **Why:** The Verdaxis sidebar is assembled from multiple arrays, so a removed page can still appear through partner links or secondary navigation.


### Dogfood narrated walkthrough flows before declaring them ready
- **Date:** 2026-04-15
- **Trigger:** I drafted buyer and supplier walkthrough scripts and initially treated them as ready before fully replaying the live steps in the browser.
- **Rule:** Before handing off any recorded walkthrough script, replay the exact live flow end-to-end in the browser for each role and verify the backend side effects for every trade action.
- **Why:** A script is only usable if the clicks, modal states, and resulting orders or trades all work on the live staging surface the recorder will use.

### Benchmark labels must match benchmark semantics
- **Date:** 2026-04-15
- **Trigger:** I shipped listing price deltas against a seeded benchmark even though the user expected them to be derived from the visible product/port/window slice.
- **Rule:** When surfacing market-relative deltas in the trading UI, derive the benchmark from the live visible slice or label it explicitly as an external reference before shipping.
- **Why:** Users read signed row deltas as relative to the visible market, so an unlabeled external benchmark makes on-screen prices look internally contradictory.


### Keep listings and trades as separate operational objects
- **Date:** 2026-04-16
- **Trigger:** I initially treated the missing post-trade row in Marketplace as a bug, but the user clarified that `Marketplace > My Orders` should only show the user's outstanding listings while initiated trades belong in `Trade History`.
- **Rule:** Preserve the order-versus-trade separation in the product model unless the user explicitly wants a merged activity view; solve confusion with naming and walkthrough flow before changing the underlying UI contract.
- **Why:** Resting listings and negotiated trades are different lifecycle objects, and collapsing them into one view creates demo and product ambiguity.

### Confirmed trades are off-platform, not platform-fulfilled
- **Date:** 2026-04-16
- **Trigger:** I kept delivery and payment lifecycle states in the trade UI even after the user clarified that Verdaxis stops managing the trade once it is confirmed.
- **Rule:** When the user defines confirmation as the platform handoff point, reveal counterparties at confirmation and remove downstream delivery or payment workflow from the active product UX and demo data.
- **Why:** Leaving post-confirmation platform statuses in place makes the product promise and the demo flow internally inconsistent.

### Share role-based nav config
- **Date:** 2026-04-16
- **Trigger:** Buyer and supplier sidebars drifted in label text and ordering because each role had its own hardcoded nav array.
- **Rule:** When two roles share the same app shell, build the primary navigation from one shared config with role-specific page routing only where necessary.
- **Why:** Duplicate nav definitions drift quickly and create avoidable UX inconsistency.

### Audit Vertical Rhythm When Replacing Forms
- **Date:** 2026-05-05
- **Trigger:** The pilot page form was replaced with a CTA, and the user pointed out that the surrounding section spacing also needed optimization.
- **Rule:** When removing or replacing a tall form, rebalance the section padding, grid column widths, card padding, and adjacent vertical gaps in the same pass.
- **Why:** A functional component swap can leave an awkward visual footprint if the old component's height still dictates the layout rhythm.

### Keep Product Labels Separate From Stored Taxonomy
- **Date:** 2026-05-06
- **Trigger:** The user corrected the signup label from `Shipping Line` to `Ship Owner` while asking how disruptive a backend rename would be.
- **Rule:** Prefer label-only changes when the stored enum already anchors seeded data, tests, and permissions; rename stored values only with a deliberate compatibility migration.
- **Why:** User-facing terminology can move faster than internal taxonomy, and conflating the two creates unnecessary migration risk.

### Grill Dirty Marketplace Diffs Before Rebuilding
- **Date:** 2026-05-19
- **Trigger:** The user clarified that the Marketplace regression fix should also review unrelated dirty Marketplace logic before deciding what to keep, fix, or discard.
- **Rule:** When a live regression is caused by stale deployment but the working tree contains broad Marketplace edits, classify each behavior change with the user before rebuilding or deploying the dirty source.
- **Why:** A rebuild can accidentally promote unrelated UI, watchlist, filter, or trade-flow regressions if the dirty diff is treated as a simple restore.

### Do Not Show Trade Tape As Market Closed
- **Date:** 2026-05-19
- **Trigger:** The user corrected the Trade Tape status because Verdaxis should present physical fuel market activity as 24-hour, not exchange-session open/closed.
- **Rule:** Market activity badges should say `Live · 7D history` or an outage-style unavailable state, not `Market Closed`, unless Verdaxis later defines formal trading sessions.
- **Why:** A closed-market badge implies users cannot transact and conflicts with the intended operating model.

### Keep Trading And Monitoring Surfaces Separate
- **Date:** 2026-05-19
- **Trigger:** The user clarified that the Braemar/Bloomberg-style dashboard vision applies to the current Forward Curve page, not the Market Terminal trading page.
- **Rule:** Treat Market Terminal as the execution/trading surface and Forward Curve, unless renamed later, as the market monitoring workspace candidate. Do not revamp or merge Market Terminal when designing configurable dashboards.
- **Why:** Combining execution and monitoring would muddy the product model and risk destabilizing the current trade workflow.

### Keep Experimental Forward Curve Work On Staging
- **Date:** 2026-05-19
- **Trigger:** The user clarified that this Forward Curve monitoring feature should be worked on in staging for now.
- **Rule:** For exploratory Forward Curve/dashboard iterations, build, deploy, and dogfood staging only unless the user explicitly asks to promote the change to production.
- **Why:** The monitoring workspace is still being shaped, and production should not receive half-formed trader workflow changes by default.

### Use Diagnostic Empty States For Required Market Slices
- **Date:** 2026-05-22
- **Trigger:** The Orderbook exact-slice gate used a static instruction after the user wanted clear feedback on which filter was still missing.
- **Rule:** When a market surface requires multiple filters, show a dynamic checklist with selected/missing status for each requirement instead of only a generic instruction.
- **Why:** Static copy makes users guess which control is blocking the view, especially when some filters are already correctly selected.

### Derive Market Monitoring Taxonomy From Catalog
- **Date:** 2026-05-23
- **Trigger:** The user clarified that Forward Curve should use canonical products dynamically where possible instead of hardcoding the visible markets.
- **Rule:** Market monitoring surfaces should derive fuel, port, and window options from the same canonical marketplace/catalog sources, with static constants only as a narrow fallback.
- **Why:** Hardcoded market lists drift from executable marketplace surfaces and make users see products or ports they cannot actually list against.

### Verify Themed Selector Contrast
- **Date:** 2026-05-29
- **Trigger:** The language selector was functionally present but nearly invisible on both the pale public nav and dark app header until hover exposed the dropdown.
- **Rule:** When changing shared selector or language controls, explicitly verify the closed trigger contrast on every surface that uses it, not only the opened dropdown state.
- **Why:** Shared theme variants can invert meaning across contexts, making a control look missing even though its interaction still works.

### Keep Tutorial Navigation Bidirectional
- **Date:** 2026-06-02
- **Trigger:** User reported that Back on the Post a Bid tutorial step bounced back to the same step, and that the tooltip X behaved like a hidden force-next control.
- **Rule:** Guided tours must make click-required steps explicit with Back plus a labelled Skip Step action, remove ambiguous close/X controls, and make missing-target fallback respect whether the user was moving backward or forward.
- **Why:** State-changing tour steps can remove prior targets from the DOM; always jumping forward on target-not-found traps the user and makes Back feel broken.

### Undo Modal Side Effects On Tutorial Back
- **Date:** 2026-06-02
- **Trigger:** User reported that the Place Bid / Place Ask modal stayed open when pressing Back in the guided tutorial.
- **Rule:** When Back crosses from a modal-backed tutorial segment to a page-level segment, close the active modal before changing the tour step.
- **Why:** Joyride step navigation only moves the tooltip; it does not automatically undo UI side effects caused by earlier highlighted clicks.

### Keep One Vertical Scroll Owner Per App Page
- **Date:** 2026-06-02
- **Trigger:** User reported that Marketplace content was cut off at the bottom for some users and that switching to Listings pushed the top controls offscreen with no way to scroll back up.
- **Rule:** Authenticated app pages should let the shell `<main>` own vertical scrolling; page components must not add desktop `overflow-hidden` roots plus nested vertical `overflow-auto` tab bodies unless they are full-screen canvas tools.
- **Why:** Competing scroll containers trap wheel/trackpad input and can make headers or lower content unreachable on smaller viewports.

### Keep Tutorial Escape Controls Visible
- **Date:** 2026-05-27
- **Trigger:** The guided tutorial got stuck on an order-form step because click-driven steps hid the footer and targeted a footer cancel control instead of an always-visible modal close control.
- **Rule:** Click-to-advance tutorial steps must still expose Back, Skip, and Close controls, and modal-exit steps should target always-visible close affordances.
- **Why:** A tour that disables normal navigation while waiting for a specific click can trap users when the highlighted control is off-screen, covered, or not the control they expect.

### Anchor Tutorial Steps To Stable Surfaces
- **Date:** 2026-06-02
- **Trigger:** The guided tutorial skipped the orderbook/trade-modal steps when product, port, or window was missing because `orderbook-actionable-level` did not exist yet.
- **Rule:** Tutorial targets must point at elements that exist in every relevant state; use a separate `advanceOnSelector` for optional executable child controls.
- **Why:** Joyride treats missing targets as `TARGET_NOT_FOUND`, so state-dependent anchors can silently advance past the lesson the user needed.

### Guide Tutorial Prerequisites Before Dependent Surfaces
- **Date:** 2026-06-02
- **Trigger:** The orderbook tutorial stopped on a stable panel when the user had not selected fuel, port, and window, leaving them without a guided way to satisfy the checklist.
- **Rule:** If a tutorial step depends on required UI state, add explicit prior click steps that guide the user through creating that state.
- **Why:** Stable targets prevent skipping, but they can still dead-end when the user has not been walked through prerequisite controls.

### Cap Pinned Marketplace Controls
- **Date:** 2026-06-02
- **Trigger:** User clarified that pinned Marketplace controls must never consume so much vertical space that only a few rows remain visible.
- **Rule:** When pinning Marketplace filters/search/tabs, cap the pinned region to half the page height and put scrolling inside the lower market pane, with pagination fixed outside the row scroller.
- **Why:** Pinned controls improve orientation, but without a hard cap they can starve the actual trading/listing surface on shorter displays.

### Validate Tutorial State, Not Just Clicks
- **Date:** 2026-06-02
- **Trigger:** User found an edge case where Back plus Hide Filters let the guided tutorial skip prerequisite selection and land on a stuck orderbook step.
- **Rule:** Click-driven tutorial steps must advance only after the expected post-click state is true, and selected sample values must be validated explicitly.
- **Why:** Selector-only waits and timeout fallback let reversible controls, closed dropdown portals, or wrong option selections move the tour into impossible states.

### Give Optional Liquidity Steps Explicit Fallbacks
- **Date:** 2026-06-02
- **Trigger:** The guided tutorial could still stall on the orderbook click step if the selected slice had no clickable bid or ask level.
- **Rule:** Tutorial steps that depend on live or seeded market liquidity need an explicit, user-initiated fallback path to the next safe workflow.
- **Why:** Market data availability is not a stable UI invariant, even when the product, port, and window state is valid.

### Do Not Spotlight Portal Options
- **Date:** 2026-06-03
- **Trigger:** User reported the guided tutorial got stuck after selecting Shanghai because the required Singapore option portal closed, the highlighted option disappeared, and Skip Step had no recoverable target.
- **Rule:** Guided tutorial steps for dropdowns must anchor to the stable trigger, advance on the required option click, and provide a fallback that reopens the trigger before selecting the required option.
- **Why:** Portal-rendered dropdown options are transient DOM nodes; targeting them directly makes Joyride positioning fragile and traps users after wrong selections.

### Offset Tutorial Tooltips From Dropdown Menus
- **Date:** 2026-06-03
- **Trigger:** User reported the port dropdown remained hard to select because the tutorial tooltip was still occupying the vertical area used by the opened menu.
- **Rule:** Dropdown tutorial steps should use side placement by default and keep the dropdown menu above the tour overlay z-index.
- **Why:** Moving the tooltip above or below a selector can still collide with portal menus; side placement preserves the option list path.

### Keep Boundary Targets Visible
- **Date:** 2026-06-03
- **Trigger:** User reported the Submit Boundary tutorial instructions covered the Place Bid button, hiding the exact boundary being explained.
- **Rule:** Informational boundary steps should place tooltips to the side of the highlighted control, especially for dangerous or submit actions that must remain visible but unclicked.
- **Why:** A boundary warning loses meaning if it hides the button or state transition it is warning about.

### Scroll Modal Targets Before Spotlighting
- **Date:** 2026-06-03
- **Trigger:** User reported the Submit Boundary tutorial still errored because the Place Bid button required scrolling inside the modal to become visible.
- **Rule:** Before moving Joyride to a modal target, scroll the target's nearest scrollable container and the document viewport so the target is visible before measuring the spotlight.
- **Why:** Mounted-but-offscreen controls inside modal scroll layouts can still trigger missing or misplaced tutorial steps if Joyride measures before the target is visible.

### Cap Modals Without Forcing Height
- **Date:** 2026-06-03
- **Trigger:** User reported the Place Bid modal had a large empty area after the modal was changed to fixed `dvh` height.
- **Rule:** Use viewport `max-height` plus an internal scroll body for modals; do not force a fixed viewport-relative height unless the content is intentionally full-screen.
- **Why:** Fixed modal height prevents offscreen footers but creates large empty panels for compact forms; max-height preserves compact layout while still allowing overflow to scroll.

### Do Not Scroll Visible Tour Targets
- **Date:** 2026-06-03
- **Trigger:** User reported the Forward Curve tutorial pushed the whole terminal page upward when the Market Matrix tooltip overflowed below the viewport.
- **Rule:** Tutorial helpers should scroll only when the target is actually outside the visible viewport, and dense terminal steps should anchor to compact headers instead of full-height panels.
- **Why:** Centering already-visible or very tall targets makes Joyride move the workspace to fit the tooltip, which is disorienting in fixed terminal layouts.

### Include Admin Overrides In Entitlement Gates
- **Date:** 2026-06-03
- **Trigger:** User reported that admin accounts were still paywalled on the Analytics page.
- **Rule:** Feature gates should check both subscription entitlement and explicit role overrides such as `ADMIN`.
- **Why:** Subscription-only gates incorrectly block operational/admin accounts that need full platform visibility independent of billing tier.

### Make Guided Tour Placement Viewport-Aware
- **Date:** 2026-06-03
- **Trigger:** User reported Joyride instructions still being cut off on smaller screens after previous tutorial fixes.
- **Rule:** Guided tour steps must compute placement against the current target rect and viewport, then flip or center when the preferred side cannot fit.
- **Why:** Fixed Joyride placements can pass desktop testing but still overflow on smaller viewport widths or heights.

### Stage Feedback Branches Before Production
- **Date:** 2026-06-16
- **Trigger:** User clarified new Verdaxis feedback work should go into a new branch and deploy to staging only, not production.
- **Rule:** For feedback batches that users need to vet, create a dedicated branch based on the current staging branch, deploy only to staging, and wait for explicit production approval.
- **Why:** Main and staging can diverge, and deploying feedback directly to production risks exposing unvetted UX/product changes to users.

### Use Requested Frontier Model For Factory Review Agents
- **Date:** 2026-06-16
- **Trigger:** User corrected subagent model choice after I spawned feedback/planning reviewers on GPT 5.4 mini.
- **Rule:** When the user explicitly asks for GPT 5.5 on factory-loop planning or review agents, use GPT 5.5 for subsequent subagents instead of cheaper mini models.
- **Why:** The user is optimizing for maximum-quality adversarial review, not model cost or speed, in this feedback loop.

### Avoid Freezing Cosmetic Implementation Details In Tests
- **Date:** 2026-06-16
- **Trigger:** User challenged source-level tests that locked simple cart-icon replacements into the suite.
- **Rule:** Prefer behavior, data-contract, accessibility, and provenance tests; avoid source-grep tests for simple cosmetic choices unless a regression has real product or safety impact.
- **Why:** Over-specific cosmetic tests add maintenance bloat and make harmless UI refinements harder without materially improving product stability.

### Include Browser Dogfooding In UI Reviews
- **Date:** 2026-06-17
- **Trigger:** User corrected that reviewers should visually dogfood UI changes in the browser, not only inspect code.
- **Rule:** For UI-facing review passes, include browser dogfooding on the affected pages and viewport sizes before declaring the review clean.
- **Why:** Code review and unit tests can miss visual regressions, blocked interactions, viewport overflow, and misleading copy in the actual rendered app.
