# Grill Resolution

## Proceed Decision

Proceed.

The next Verdaxis factory loop should be brownfield, audit-first, and market-contract-led. The core direction is not another broad redesign; it is to make the existing qualified executable orderbook, market intelligence surfaces, onboarding, and deployment pipeline coherent enough that repeated bugs stop reappearing across Marketplace, Intelligence Map, Forward Curve, and signup.

This session moved from interview mode into autonomous grill mode with a reviewer subagent pushing back on each decision. The accepted pushback is that "complete" must mean backend-enforced contracts and live verification, not just frontend UI consistency.

## Canonical Terms

- Qualified Executable Orderbook: transparent bid/ask market with hard execution qualifiers.
- Market Slice: market product + delivery point + availability window.
- Demo Listing: seeded preview liquidity, not user-posted executable production liquidity.
- Benchmark: indicative reference price, not a firm quote.
- Forward Curve: indicative price-path surface, not a tradable futures board.
- RFQ: non-primary bilateral workflow; buyer intent should normally become a bid.

## Assumptions

- Verdaxis' core promise remains many-many transparent price discovery and execution for green marine fuels.
- The approved market products remain `BIO_METHANOL`, `E_METHANOL`, `BIO_ETHANOL`, and `SYNTHETIC_ETHANOL`.
- The current approved delivery points are Dalian, Busan, Shanghai, Singapore, Rotterdam, Houston, Los Angeles, and Santos.
- Production may temporarily contain demo liquidity, but it must be clearly identified and non-executable unless the business explicitly decides otherwise.
- RFQ code may stay dormant, but every primary UI journey should teach users to post bids or asks.

## Resolved Decisions

- Direction: stabilize the market contract before adding more feature surface. Recent regressions came from inconsistent product/port/window semantics and deployment drift.
- Factory track: use a large brownfield FSB loop with GSD-style persistent planning state and repeated plan -> implement -> review -> dogfood cycles.
- First loop: market-contract and deploy invariants. Enforce product/port/window/certification execution rules, fix environment/deploy truth, source-of-truth docs, seeded data alignment, canonical selectors, auth/session consistency, and core smoke tests.
- Second loop: activation. Improve command center, post-action match feedback, supplier demand visibility, and empty states only after the market contract is enforceable.
- Third loop: compliance/trust. Add/upgrade regulations status, verification badges, demo-data policy, and admin controls.
- Fourth loop: quality and performance. Accessibility, modal consolidation, color/token cleanup, bundle/API optimization, and monitoring.

## Open Decisions

- Production demo-data policy: user/business owner. Blocker only for final production posture, not for staging or clearly labeled preview data.
- Legal/compliance depth in-app: user/business owner. We can build a regulation status tab, but exact jurisdictions and update liability should be approved.
- Auto-match posture: now guarded by the shared backend execution-policy service and demo-boundary checks. Keep monitoring this as explicit-hit and auto-match semantics converge.
- Certification scheme semantics: recommended default is asks declare the exact scheme, bids declare acceptable schemes; a missing bid preference means "any Verdaxis-approved scheme" only for discovery, not automatic execution.
- Auth/session contract: frontend now uses in-memory access tokens and HttpOnly refresh-cookie retry consistently. Backend still returns refresh tokens in JSON for compatibility; removing that exposure remains a separate migration decision.
- Forward-curve source semantics: unresolved. Current implementation is orderbook-derived indicative depth; product language should not imply an independent benchmark curve until that source exists.

## Documentation Updates

- CONTEXT.md: updated.
- ADRs: deferred. No new ADR yet because the main product decisions already exist in prior docs, and the remaining production demo-data policy needs business approval.

## Executed In This Pass

- Fixed frontend production/staging API build targets and added `.env.staging`.
- Replaced the stale Vite-dev-server deployment script with a static build script that validates the baked API target.
- Added `npm run smoke:live` to verify prod/staging HTML, bundle API target, backend health, catalog products, delivery points, and forward curve params.
- Tightened frontend CI to run tests, i18n, and production build before deploy.
- Patched prod and staging backend matching so availability window is enforced and certification preferences are checked before auto-created trades.
- Added matching regression tests for window mismatch, disjoint certifications, and overlapping certifications.
- Fixed the seed-window unit test so it is no longer pinned to April 2026.
- Patched prod and staging backend trade creation to reject demo listings server-side.
- Patched prod and staging backend auto-match to skip real/demo boundary crossings and reuse `orders_execution_compatible`.
- Added matching regression tests for normalized certification schemes, off-spec asks, missing supplier certification declaration, and demo-boundary crossings.
- Migrated legacy frontend API service calls for ports, vessels, compliance, inventory, notifications, and alerts onto the central refresh-retry layer.
- Deployed frontend artifacts to prod and staging and restarted prod/staging backends.
- Verified prod and staging with `npm run smoke:live`.
- Replaced prod/staging backend deploy scripts with systemd-aware helpers that infer `prod` vs `staging`, run Alembic, restart the correct service, and verify the public health URL.
- Added dirty-worktree deploy refusal by default, with `ALLOW_DIRTY=1` only for intentional hotfix deployment.
- Updated backend README/CLAUDE operator docs in both live backend trees to point at the current systemd topology.
- Cleared the frontend `npm audit` vulnerabilities with narrow package-lock updates and redeployed the rebuilt prod/staging artifacts.
- Restored backend price discovery market-slice support for `market_product` and `availability_window` across summaries, reference prices, and CSV export paths.
- Added price discovery regression tests proving Bio Methanol/Bio Ethanol filtered slices do not mix with E/Synthetic fuel rows at the same port.
- Restarted prod/staging backend services and verified live filtered price endpoints plus invalid-filter 422 behavior.
- Accepted reviewer pushback that Market Terminal was passing selected port names as price `region` filters; fixed it to resolve delivery-point IDs before calling price APIs.
- Accepted reviewer pushback that live smoke was too shallow; expanded smoke coverage to orderbook bid/ask slices, price summaries, reference prices, and invalid filter validation.
- Accepted reviewer pushback that `/orderbook/aggregated` ignored market-slice query params; added slice filters and regression coverage.
- Accepted reviewer pushback that demo liquidity execution was only half-enforced; auto-match now skips demo orders entirely.
