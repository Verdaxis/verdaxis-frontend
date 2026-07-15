# Compliance-Adjusted Pricing Overlay — Implementation Plan (H1.2 prototype)

**Status:** reviewed (4-lens panel, 2026-07-10); all findings incorporated. Ready to implement.
**Goal:** an authenticated buyer sees, on Marketplace **ASK listings**, what the green premium actually buys them under FuelEU: **tCO₂e avoided per MT** and **FuelEU penalty avoided per MT (USD)**. Additive overlay only — the public book, its endpoints, and its ordering are untouched. Server owns the math (single source of truth for the future CFO defense pack).

## The math (exact, with the two roles of intensity kept separate)

For fuel displacement, the **displaced intensity is fixed**: `CI_displaced = VLSFO 91.16 gCO₂e/MJ`. The **Annex IV marginal-rate denominator is the fleet's actual intensity** `GHGIE_actual` (= 91.16 in the prototype's default fleet, but a lower-intensity fleet must not silently shrink the displacement term — keep the symbols distinct so the H1.1 fleet engine can drop in):

- CB improvement per MT green fuel = `(CI_displaced − CI_g) × LCV_g × 1000` grams (CI in gCO₂e/MJ, LCV in MJ/kg)
- marginal penalty rate = `2400 EUR / (GHGIE_actual × 41000)` per gram of CB
- **penalty avoided EUR/MT = (CI_displaced − CI_g) × LCV_g × 1000 × 2400 / (GHGIE_actual × 41000)**, floored at 0
- `tCO₂e avoided/MT = (CI_displaced − CI_g) × LCV_g × 1000 / 1e6` (same conversion `ci_pricing.py` uses; one baseline: 91.16 — `ci_pricing`'s 91.0 is the outlier, noted, untouched)

**Golden (bio-methanol CI 31, LCV 19.9):** `(91.16−31) × 19.9 × 1000 × 2400 / (91.16 × 41000)` = **€768.75/MT** → **$830.25/MT** at EUR/USD 1.08. tCO₂e avoided = 1.197/MT. Put these exact numbers in the test comments.

**Named exclusions (in the assumptions object — the trust posture requires them):** the RFNBO ×2 reward multiplier (materially understates E_METHANOL / SYNTHETIC_ETHANOL value through 2033), consecutive-deficit escalation (×(1+(n−1)/10)), and the 50% extra-EU voyage scope. `excluded_factors: ["RFNBO_MULTIPLIER", "DEFICIT_ESCALATION", "EXTRA_EU_VOYAGE_SCOPE"]`.

**`year` is annotation-only** — the marginal displacement formula has no year term. `year_target` in assumptions uses an explicit step function (2025-2029 → 89.34, 2030-2034 → 80.04, 2035-2049 → 65.08, 2050+ → 9.12), NOT `FUELEU_TARGETS.get(year, default)` which mis-reports 2031+.

## Design decisions

1. **New pure service `app/services/compliance_pricing.py`** — do NOT modify `compliance_scoring.py` (its simplified penalty math has known issues: misnamed `compliance_balance_gco2`, `/1e9` divisor; follow-up, not this slice).
2. **ASK rows only.** Bids carry no listing CI; attaching "penalty avoided" to a buyer's own bid is meaningless. Bid ids in the request → `null`.
3. **CI and LCV per listing:** listing's own `carbon_intensity_gco2_mj` / `energy_density_mj_kg` when set — **read from the ORM model; the public OrderResponse doesn't carry energy_density** — else product defaults (labelled in the per-row basis):
   - `PRODUCT_DEFAULT_CI` (gCO₂e/MJ): BIO_METHANOL 31, E_METHANOL 8 (from FUEL_GHG_INTENSITIES), BIO_ETHANOL 35 (Biofuel-class proxy), SYNTHETIC_ETHANOL 10 (e-fuel-class proxy); `ci_basis: "LISTING" | "PRODUCT_DEFAULT"`.
   - `PRODUCT_DEFAULT_LCV` (MJ/kg): methanol family 19.9, ethanol family 26.8; `lcv_basis` likewise.
   - **Never route through `FUEL_GHG_INTENSITIES`** (Ethanol is absent; unknown fuels silently become VLSFO 91.16 and zero the advantage).
   - Note (accepted, documented): tCO₂e/MT + public CI makes a listing-specific LCV arithmetically recoverable — a physical fuel property, not commercially sensitive.
4. **Endpoint:** `POST /api/compliance/pricing-overlay` (**`API_V1_STR` is `/api`, not `/api/v1`** — config.py:9), authenticated (`get_current_user`), body `{order_ids: [uuid], year?: int}` (≤100, else 422). **Visibility scoping is mandatory:** load orders through the same filters the public book applies (status OPEN/PARTIALLY_FILLED + `_apply_public_marketplace_scope`) — a non-visible, cancelled, off-spec, or nonexistent id returns `null` indistinguishably (no existence oracle). Response `{overlays: {order_id: {...} | null}, assumptions: {...}}`; unpriceable rows → `null`, never 500. POST-for-read documented in the OpenAPI description.
5. **Relationship to `GET /orderbook/with-ci` (exists, public, contradictory):** its `CIAdjustedPrice` prices CO₂ at ETS $70 (~$84/MT) — a different, much smaller number than FuelEU penalty math (~$830/MT). The overlay endpoint's docstring states the distinction (ETS carbon value vs FuelEU penalty avoidance). Marketplace UI does not render with-ci today; **follow-up filed: reconcile or deprecate `/orderbook/with-ci`** — not this slice.
6. **Org awareness (prototype-honest):** vessels exist for the org ⇒ `fleet_intensity_basis: "ORG_FLEET"`, else `"DEFAULT_VLSFO"`. **In both cases the prototype computes with GHGIE_actual = 91.16** — the basis field + `fleet_vessel_count` exist so the UI can label the assumption and H1.1 can change the number without an API break. Staging's vessels table is empty; the default path is the real path — first-class, not an error.
7. **Assumptions object** in every response: `{eur_usd_rate, vlsfo_baseline_gco2_mj, ghgie_actual_gco2_mj, fleet_intensity_basis, fleet_vessel_count, penalty_eur_per_tonne, year, year_target, excluded_factors}`. `EUR_USD_RATE = Decimal("1.08")` module constant marked ASSUMED, overridable via settings (`COMPLIANCE_EUR_USD_RATE`).
8. **Demo listings get overlays** (indicative math; benchmarks already render on demo rows); the Demo badge stays the risk communicator.
9. **Decimal throughout; quantize money 0.01, tCO₂e 0.001.** JSON emits Decimals as strings; fe coerces with `Number()` (Marketplace.tsx:616 pattern). Pin the string contract in a schema test.

## Backend files

- `app/services/compliance_pricing.py` — constants + `compute_listing_overlay(...) -> ListingOverlay | None` + `overlay_assumptions(year, fleet_vessel_count)` (pure).
- `app/schemas/compliance_pricing.py` — request (`extra="forbid"`) / response models.
- `app/routers/compliance_api.py` — endpoint (org read pattern per `/fleet`; visibility scope shared with orderbook reads — import, don't copy).
- `tests/unit/test_compliance_pricing.py` — goldens **768.75 EUR / 830.25 USD / 1.197 tCO₂e** in comments; e-methanol case; listing-CI override beats default; zero-floor when CI ≥ baseline; ethanol never touches FUEL_GHG_INTENSITIES; year step-function (2031 → 80.04, 2036 → 65.08); assumptions contents incl. `excluded_factors` and basis labels; Decimal-as-string JSON contract; EUR_USD settings override; endpoint: auth 401, 101 ids 422, unknown id → null, **cancelled/hidden id → null**, bid id → null, demo ask priced.

## Frontend files

- `src/services/api.ts` — `api.compliance.pricingOverlay(orderIds)`.
- `src/components/Marketplace.tsx` — **no dedupe convention exists in this repo (verified); build the minimal correct one:** overlay state is an id-keyed map; an effect keyed on the sorted visible ASK-id signature fires one batched fetch; guard staleness by comparing the signature at resolve time against current (drop stale), and tolerate the 60s silent refresh + filter changes. Fetch failures → empty map (never break the table).
- `src/components/trading/CompliancePriceHint.tsx` — under `BenchmarkPriceBlock` in the price cell. **The cell is `w-[160px]` below xl (Marketplace.tsx:613):** two stacked `text-[10px]` lines (`FuelEU −$830/MT` / `1.20 tCO₂e/MT`) with truncate + full detail in `title` tooltip (assumptions, basis, "indicative estimate — excludes RFNBO multiplier"). Emerald tone when penalty avoided > 0; renders nothing when overlay null/absent (logged-out unchanged). **All displayed figures are USD.**
- `src/tests/compliance-price-hint.test.tsx` + Marketplace integration cases (authed fetch merges; logged-out no hint; string coercion; stale-response dropped on filter change).
- i18n EN + ZH.

## Acceptance

- [ ] Golden unit tests green (768.75 / 830.25 / 1.197 hand-derived in comments); full be suite green.
- [ ] `POST /api/compliance/pricing-overlay` on staging with itest buyer token returns overlays for visible ask ids; anonymous 401; 101 ids 422; a cancelled order id → null.
- [ ] Marketplace (staging, authed) shows the two-line hint on asks with resolvable CI at both 1280px and 1440px widths; logged out pixel-identical to today; screenshot.
- [ ] Assumptions object present and surfaced in the tooltip; every proxy labelled; excluded factors named.
- [ ] Neutral book untouched (no public endpoint/schema changes); fetch failure degrades to no-hint.
- [ ] Follow-ups filed: engine `/1e9`+naming bug; ci_pricing 91.0 baseline; `/orderbook/with-ci` reconcile-or-deprecate; vessel-derived GHGIE_actual (H1.1).
