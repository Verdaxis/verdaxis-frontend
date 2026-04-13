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
