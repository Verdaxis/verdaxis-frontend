# UCOME B100 RFQ pilot implementation plan

**Goal:** Make specified neat UCOME requests and supplier quotes usable on staging while preserving existing alcohol markets and correcting unsupported compliance pricing.

**Architecture:** Extend the canonical catalog with an RFQ-only UCOME B100 product. Reuse the existing admitted, organization-scoped RFQ service with validated contract and offer snapshots, quote deadlines, revisions, and audit history. Add a shared buyer/supplier RFQ workspace. Keep FAME outside executable orderbooks and keep the existing RFQ acceptance restriction.

**Tech stack:** React, TypeScript, i18next, FastAPI, Pydantic, SQLAlchemy, PostgreSQL, Alembic.

## Decisions

- The user authorized implementation and staging deployment with design discretion on 22 September 2026.
- Source: the open ChatGPT conversation `https://chatgpt.com/c/6ab2292a-e8ac-83ec-b7a5-1c0dd2500ef5`, read through the requested Browser. Its source review differs from current staging: RFQ execution is disabled and the old RFQ UI is absent.
- Start with wholesale UCOME B100 at Singapore. Preserve all four alcohol product identities. Do not seed synthetic FAME liquidity or present an indicative forward curve as an executable market.
- Model physical fuel requirements, supplier declarations, and documentary availability separately. Do not infer regulatory eligibility from a certification label or treat missing CI as zero.
- Do not enable live FAME execution before a reviewed bilateral contract, evidence milestones, and atomic batch/sustainability reservations exist. This is an explicit launch boundary, not a hidden or broken acceptance button.
- Alternative offers, delivered-to-vessel operations, additional feedstocks, licensed index pricing, and principal/credit operations remain later work. They require commercial inputs absent from the research chat.

## Tasks and acceptance checks

1. **Catalog and execution controls.** Extend `app/market_catalog.py`, catalog schemas, seed/migration, and execution entry points. Expose `execution_mode=RFQ_ONLY`. Test that catalog/RFQ reads allow UCOME while order placement, inventory publication, manual taking, negotiation, and automatic matching cannot execute it. Keep existing alcohol behavior.
2. **Structured RFQs.** Extend `app/models/rfq.py`, `app/schemas/rfq.py`, `app/routers/rfq.py`, and new FAME schemas/policy. Store versioned contract terms, offer declarations, deadlines and revisions. Validate quote compatibility, expiry, ownership and visibility; preserve row locks and audit records. Test wrong product/lane/specification, insufficient quantity, missing evidence, expiry and unauthorized revisions.
3. **Database release contract.** Add literal reviewed migrations after `fee_20260912_seller_per_mt`. Extend checkpoint edges and exact runtime ACLs for new columns. Verify PostgreSQL constraints and role policy on a disposable database. Never run `upgrade head` against staging.
4. **RFQ workspace.** Add `/app/rfqs` and role-consistent navigation. Buyer creates and cancels requests; supplier submits, revises and withdraws quotes. Display all commercial terms and documentary status, compare quote prices without invented benefits, and show no execution control. Check English/Chinese, keyboard labels, pending/error states and 1440/1024 widths.
5. **Compliance corrections.** Correct every FuelEU target boundary using official sources. Remove the lifecycle-CI-to-ETS-cash assumption. Preserve null values and explicit scenario assumptions. Verify numerical boundary tests and rendered labels.
6. **Release.** Freeze changes, run backend/unit and frontend tests, typecheck, recursive translations, staging build/API artifact checks, and browser review. Commit and consolidate into each `origin/staging`, then deploy through the guarded backend path and the staging static asset path. Verify exact backend release identity and rendered staging behavior.

## Commercial follow-up

The chat's outreach list, customer qualification, laboratory agreement, standard limits and named delivery partner cannot be established through software changes. No prospects are contacted in this task. Before enabling trade execution, obtain the agreed specification and physical/sustainability allocation ownership rules, then add atomic reservations and an immutable accepted contract.

## Status

- [x] Read research chat and current staging source.
- [x] Create isolated staging-based frontend/backend worktrees.
- [x] Catalog and non-execution safeguards verified.
- [x] Structured RFQ API and migration verified.
- [x] RFQ workspace and localization verified.
- [x] Compliance corrections verified.
- [x] Frozen-source acceptance and local browser checks completed.
- [ ] Staging branches consolidated.
- [ ] Staging deployment and authenticated live browser checks verified.

Validation: 625 frontend tests, 1,628 backend unit/security/monitor tests (one skipped), 58 Linux deployment-script tests, 17 new PostgreSQL RFQ cases, and 30 existing PostgreSQL checks pass. Typecheck, translation completeness, staging build and artifact checks pass. Local browser review covers buyer creation, quote submission/revision/withdrawal, missing CI, declarations, English/Chinese, 1440/1024 widths, and the existing mobile desktop-access message.

Deployment is currently blocked: the documented SSH account rejects available authentication keys. The final live deployment and authenticated staging review remain pending server access. No production change is authorized or made.
