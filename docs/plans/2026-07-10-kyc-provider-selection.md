# KYC/KYB Provider Selection — Research & Recommendation

**Date:** 2026-07-10
**Roadmap:** Track C1 / Horizon 0 item 5 (counterparty onboarding spine). Decision-ready; contracting and the regulated-status legal read are Jon's calls.
**Scope:** ~10–60 B2B orgs/year (shipping operators, producers, traders) across EU/SG/CN/KR/US/BR; corporate KYB with UBO discovery, sanctions/PEP screening with ongoing re-screening, document collection, FastAPI-callable API, pilot-friendly pricing.

## Recommendation

**Primary: Sumsub (KYB + AML bundle, regulated tier).** One vendor covers the full C1 need: corporate registry checks and UBO discovery across 220+ countries, sanctions/PEP/adverse-media screening with continuous monitoring, hosted document collection, and a clean REST API. Public pricing fits the pilot (~$1.85/verification, $299/mo minimum regulated tier — ~$2–4k/yr at our volume, estimate); 14-day self-serve trial, live in days. Caveat: registry data is aggregator-cached, weakest for CN/BR — mitigated by requiring counterparty-supplied official registry extracts at Tier 1.

**Budget alternative: OpenSanctions API (€0.10/match PAYG) + manual KYB.** Nightly re-screen cron over ~300 entities ≈ €30/mo; registry pulls (ACRA/Handelsregister/CNPJ) and officer-signed UBO charts done manually. Defensible at this volume; adjudication burden lands on us.

**Middle path worth 30 minutes:** ComplyAdvantage Starter ($99/mo, ongoing monitoring up to 1,000 entities) + its ComplyLaunch program (free 12 months for early-stage startups — check eligibility before signing anything).

## Comparison (2026)

| Provider | KYB/UBO depth (CN/BR/SG) | Sanctions + monitoring | API | Entry price | Time-to-live |
|---|---|---|---|---|---|
| **Sumsub** | Good; UBO in-flow, 220+ countries; CN/BR cached | Full suite, continuous | Good REST | $149–299/mo min + per-check | Days |
| **ComplyAdvantage** | Company screening only — no UBO discovery | Excellent, real-time | Very good | $99/mo; ComplyLaunch free 12mo | Days |
| **OpenSanctions** | None (screening only) | Very good; DIY cron | Excellent, open | €0.10/match PAYG | Hours |
| **Trulioo** | Strong UBO (81% SG coverage) | Add-on | Good | Est. $10k+/yr commitment | Weeks |
| **Moody's Kompany/Orbis** | Best-in-class live registries, audit-grade | Add-on (Grid) | Good | Est. $12–25k+/yr | Weeks–months |
| **Persona** | Affordable tier US-only KYB | Good | Excellent DX | $250/mo; global = enterprise | Weeks |
| **LSEG World-Check One** | KYB add-ons | Gold standard | Dated | Est. $75k+/yr | Months |
| **Dow Jones R&C** | Limited | Gold standard | Extra cost | Est. $15k+/yr | Months |
| **Shufti Pro** | Moderate | OK | OK | $2,500 setup, opaque | Weeks |
| **Windward / Kharon / Pole Star** | Vessel/ownership-network intel, not org KYB | Maritime-specific | Varies | Enterprise | — |

## Onboarding flow (maps to the roadmap's verification tiers)

- **Tier 0 — expression of interest:** automated name-screen (OpenSanctions or Sumsub) before commercial conversations.
- **Tier 1 — full onboarding (before first trade):** Sumsub KYB — registry check, UBO discovery to 25%, screen entity + UBOs + directors; collect certificate of incorporation and officer-signed ownership chart; CN/BR additionally supply official registry extracts (translated, cross-checked); ID-verify the authorized signatory; require an LEI.
- **Tier 2 — enhanced due diligence (triggered):** complex/offshore chains, any screening hit, unverifiable CN UBOs → manual review with four-eyes sign-off and documented rationale.
- **Ongoing:** continuous monitoring on all approved entities/UBOs; annual KYB refresh; event-driven re-review on ownership changes; cheap re-screen at each trade confirmation.

## Open questions (Jon)

1. **Regulated status:** legal read on whether Verdaxis counts as "regulated" — sets the Sumsub tier and the standard regulators/partners will hold the venue to.
2. **Data residency:** EU counterparty PII — is EU hosting required? Sumsub data-residency options are enterprise-tier; confirm GDPR DPA on self-serve.
3. **Startup programs:** apply to ComplyLaunch (free 12mo) / Persona startup program before contracting?
4. **Hit adjudication:** who is compliance officer of record; is a documented manual process acceptable for the pilot?
5. **Vessel exposure:** if pilot trades tie to specific delivery vessels, budget a maritime screening add-on (Pole Star PurpleTRAC / Windward) — the EU's 21st sanctions package extends liability to servicing shadow-fleet vessels.

*Sources: sumsub.com/pricing + docs, complyadvantage.com (pricing/complylaunch/starter), opensanctions.org (licensing/api), withpersona.com (pricing/startups), trulioo.com, moodys.com (Kompany/UBO), Vendr/TrustRadius estimates (LSEG, Dow Jones), windward.ai (EU 21st package), kharon.com.*
