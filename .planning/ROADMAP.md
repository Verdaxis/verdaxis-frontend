# Verdaxis Factory Roadmap

## Phase 0 — Source Of Truth And Deploy Reliability

Make prod/staging builds reproducible and auditable.

Deliver:
- explicit prod/staging API target handling
- deploy docs matching Caddy topology
- live smoke script
- frontend CI build gate
- backend source/revision reconciliation
- auth/session contract decision and implementation plan

## Phase 1 — Market Contract Enforcement

Make the qualified executable orderbook enforceable.

Deliver:
- backend matching/crossing tests for product, delivery point, availability window, certification scheme, org, and demo status
- source catalog aligned to four products and eight delivery points
- backend support for frontend market-product filters
- demo listing enforcement below the UI
- shared docs/tests for approved market taxonomy

## Phase 2 — Activation

Improve the first actions once the market contract is stable.

Deliver:
- command center refinements
- post-bid/post-ask confirmation and match feedback
- supplier demand feed
- action-oriented empty states
- guided tour rewrite and dogfood

## Phase 3 — Trust And Compliance

Make the platform credible to maritime stakeholders.

Deliver:
- regulation/status surface
- verification/trust badges
- admin controls for demo/seed state
- public copy review for unsupported partner implications

## Phase 4 — Quality, Accessibility, Performance

Reduce long-term defect rate and improve perceived quality.

Deliver:
- accessible shared modal wrapper
- dense-screen color/token cleanup
- bundle/API budget checks
- synthetic monitoring
- dead-code/dependency cleanup
