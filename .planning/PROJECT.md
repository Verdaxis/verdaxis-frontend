# Verdaxis Factory Project

## Purpose

Verdaxis is a maritime green-fuels market platform. The current factory objective is to make the platform internally coherent, credible for demos, and robust enough for repeated production/staging deploys without recurring regressions.

## Current Product Thesis

Verdaxis is a qualified executable orderbook with supporting intelligence layers.

- Buyers post bids.
- Suppliers post asks.
- Market intelligence surfaces support action but do not replace the orderbook.
- RFQ is archived from the primary UI.
- Demo liquidity is permitted only when clearly identified and blocked from being mistaken for user-posted production liquidity.

## Active Milestone

Market contract and operational reliability.

The immediate priority is not adding more feature surface. It is to make the current product model enforceable across backend, frontend, seeded data, docs, CI, and deployment.

## Repositories

- Frontend canonical working tree: `/home/jons-openclaw/verdaxis-staging-fe`
- Backend mirror/reference: `/home/jons-openclaw/verdaxis-backend-mirror`
- Live prod frontend served from: `/home/verdaxis-prod/verdaxis/prod/fe/dist`
- Live staging frontend served from: `/home/verdaxis-prod/verdaxis/staging/fe/dist`

## Quality Gates

- Frontend: tests, i18n, production build, live smoke checks.
- Backend: unit tests from deployed virtualenv until local mirror dependencies are fixed.
- User-facing changes: staging dogfood before production deploy.
- Market-model changes: backend and frontend tests must assert product, delivery point, availability window, and certification behavior together.
