# Verdaxis Factory Requirements

## Non-Negotiables

1. The platform must present one market model across Marketplace, Orderbook, Intelligence Map, Market Terminal, Forward Curve, Trade Tape, and seeded data.
2. The active product catalog must be the four approved market products unless explicitly changed by the business.
3. The active delivery point set must be Dalian, Busan, Shanghai, Singapore, Rotterdam, Houston, Los Angeles, and Santos unless explicitly changed by the business.
4. Execution must not cross products, delivery points, availability windows, certification schemes, organization boundaries, or demo/non-demo boundaries.
5. Demo listings must be visually and programmatically distinguishable from user-posted liquidity.
6. Production and staging deploys must be reproducible from clean source or verified build artifacts, not dirty live checkouts.
7. Auth/session behavior must use one coherent frontend/backend contract.
8. RFQ must remain outside the primary user journey unless intentionally reintroduced later.

## Current Acceptance Baseline

- Frontend tests: 199 passing.
- Backend unit tests via staging virtualenv: 354 passing.
- Live prod/staging catalog products: four approved products.
- Live prod/staging delivery points: eight approved delivery points.

## First Phase Requirements

- Fix environment and deployment truth.
- Reconcile backend source with live catalog behavior.
- Add smoke checks for live prod/staging.
- Add backend tests for full execution-slice matching behavior.
- Update docs where old ARA/six-port/legacy-fuel assumptions remain.
