# Verdaxis Product Roadmap

**Date:** 2026-07-10
**Companion:** `2026-07-10-ceiling-vision.md` (the north star this roadmap subsets), `2026-05-17-fsb-factory-roadmap.md` (tactical hardening baseline, largely burned down as of 2026-07).
**How to read:** Horizons are gated by proof, not dates. A horizon closes when its exit gate is demonstrated with real counterparties and real data — never with demo rows. Cross-cutting tracks (PWA, platform engineering, venue trust, commercial) advance in parallel with explicit stage gates inside each horizon.

---

## Current position (honest, 2026-07-10)

**Built and live:** qualified executable orderbook (4 products × 8 delivery points × canonical windows) with certification guardrails, org boundaries, and an absolute demo/real execution wall; match-on-insert with price-time priority; Forward Curve monitoring workspace with provenance-graded signal schema (REAL/demo trust predicate, redaction invariants); FuelEU/ETS/CII scoring engine with scenario support; Intelligence Map; Watchlist/Market Radar; trade lifecycle with SSE; public trade tape; audit-log registry (29 actions, meta-test enforced); hardened auth (memory-only tokens, cookie refresh, stream tokens); server-persisted preferences; staging/prod CI gates.

**Demo:** all orderbook liquidity and all Forward Curve signals. **Parked:** `PLAN-real-signal-ingestion.md` (fully specified, zero migrations needed — the schema is waiting). **Absent:** real counterparties transacting, revenue, mobile/PWA capabilities, public API, KYC/venue operations, certificate handling beyond declared metadata.

**Strategic window (from 2026 research):** FuelEU penalties are live (€2,400/t VLSFOe, pooling clears at ~⅓ of that); EU ETS hits full scope in 2026; IMO GFI slipped to a 2028+ horizon, so near-term demand is EU-corridor. Real green bunkering clusters at **Rotterdam and Singapore only** (Singapore licensed its first three methanol suppliers Jan 2026; Rotterdam bio-methanol volumes are real but volatile). No incumbent runs an executable certification-gated venue — but ZeroNorth/KPI/Integr8 are extending broker rails toward green SKUs and Platts/Argus are standing up assessments. **Speed to real liquidity beats feature count.**

**Funding reality:** this roadmap stands up a regulated-venue cost base (assessor and settlement-ops roles, SOC 2, legal opinions, banking/escrow partners) well before D3's first ARR covers it. Every horizon from H1 onward therefore carries a **financing gate**: it does not open without either a closed raise or explicit runway covering that horizon's new fixed costs. Capital is a kill risk (risk 6), not an assumption.

---

## Horizon 0 — Truth: real data or nothing

*Everything else in this roadmap is gated on the platform holding real rows that classify REAL through the existing trust predicate. Three independent lenses named this the unanimous first step.*

1. **Execute `PLAN-real-signal-ingestion.md` as written** (CSV importer + guarded CLI + trust round-trip tests), then a **named prod-promotion slice** — the plan itself is deliberately staging-only, so promoting the ingestion path to production is its own reviewed step, not an afterthought.
2. **First real sources:** hand-curated desk marks from published Platts/Argus-adjacent indications where licensing permits, MPA/Rotterdam port bulletins, producer announcements — anything that legitimately populates MARKET_INDICATION and PHYSICAL_STEM families for the two anchor slices (Bio-Methanol Rotterdam, Bio-Methanol Singapore).
3. **Internal provisional assessed mark** (not public): a **weekly** job composing qualified real orders + ingested indications into a provisional per-slice mark with confidence bands, human sign-off recorded as a verified FAIR_PRICE_BAND run. Weekly, not daily — the assessor is a founder-worn hat at this stage (see Track C headcount honesty); daily cadence is the H4 pre-publication upgrade, gated on hiring. This builds assessment history and operational muscle *before* anything is published.
4. **Slice URLs:** convert the Dashboard state machine to nested react-router routes (`/app/m/<product>/<port>/<window>`); react-router-dom v7 is already installed and the slice key is already canonical. Preserves the keep-mounted map via a layout route. Unblocks deep links, push targets, embeds, and the mobile companion.
5. **Counterparty onboarding spine:** org verification workflow (documents, sanctions screening via a provider, UBO capture), because every subsequent horizon's exit gate says "real counterparty" and onboarding is the venue function that makes that legal.

**Exit gate:** real signals render REAL on production Forward Curve with the demo-exclusion wall provably intact (after the prod-promotion slice); ≥5 verified real organizations onboarded; four consecutive weekly signed internal marks for both anchor slices.

## Horizon 1 — The buyer's unit: compliance-denominated market

*The one capability only Verdaxis can build — it owns both the compliance engine and the book. This is the wedge that makes a conservative buyer care.*

1. **Fleet compliance position engine:** extend the existing FuelEU/ETS/CII scoring service from scenario tool to live position — per-vessel and fleet GHG-intensity balance, ETS liability, banking/borrowing state, forward exposure under the 2030/2035 intensity steps.
2. **Compliance-adjusted pricing overlay:** every Marketplace listing and orderbook row annotated with the viewing org's fleet-specific penalty-parity $/MT, $/tCO₂e-avoided, and EUA-netted cost. **Overlay only — the book's neutral price-time ranking is constitutionally untouched** (the future index depends on venue neutrality).
3. **RFNBO qualifier:** design doc + implementation making RFNBO qualification a first-class executable qualifier (the FuelEU 2× multiplier makes e-methanol and bio-methanol economically non-fungible; one lane must not price two assets). This is a market-identity change — treat with the same rigor as the availability-window rewrite.
4. **CFO defense pack:** cost-of-compliance P&L per fleet — green premium paid vs penalty avoided vs pooling parity, marked against the trade tape and reference VWAP, exportable.
5. **Forward demand telemetry v0 (internal only):** anonymized aggregation of fleet deficits by fuel/port/window. Not published until the sample is large enough that anonymization is real.

**Exit gate:** one real buyer organization loads its real fleet, and the platform's penalty-parity numbers reconcile against their verifier's math for the most recent completed compliance year. Financing gate: H1's new fixed costs are funded before it opens.

## Horizon 2 — The venue: liquidity mechanics honest about scale

*~200 global counterparties cannot sustain a continuous CLOB. Concentrate liquidity; keep the book as the resting/negotiation layer.*

1. **Term strips as executable instruments:** monthly/quarterly/CAL strips (the research shows early activity will be term-weighted compliance buying, not spot) — one order, one match, N delivery windows, with ±volume-flex encoded.
2. **Anchor market-maker program:** named producers/traders commit two-sided quotes within max spread on 2–4 anchor slices for fee rebates + data-revenue share + priority stem placement. Formalized, contracted, measured.
3. **Fortnightly uniform-price call auctions** on the anchor slices: timed submission window (credit-vetted, firm, executable — the existing guardrails already enforce executability), uniform-price cross, unmatched interest rolls to the resting book. Auction calendar published quarterly. **Go-live includes minimal wash-trade/self-dealing checks** (full surveillance arrives in H3.6 — a real auction never runs unwatched). Anchor slices are reviewed against real volume each quarter, with a **bio-LNG anchor-slice contingency** if methanol-family flow disappoints (see SKU trigger below).
4. **Credit boxes:** pre-cleared bilateral counterparty tiers; firm orders visible-executable only inside the credit box; payment-security terms (LC/open account) bound at match.
5. **Supplier ATP ladder v1:** production capacity per port registered with certification metadata, auto-generating and retiring forward asks across canonical windows on the existing publish-to-ASK path.
6. **Trade-to-cash rail v1:** post-match workflow on the existing trade lifecycle — delivery scheduling, e-BDN capture, certificate attachment, invoice status. *A platform trade must close faster than a direct one; that is the switching argument.*

**Exit gate:** first real physical stem executed and fully papered on-platform end-to-end; first auction with ≥3 independent submitters per side on one anchor slice. Financing gate: the market-operations roles H2 assumes (settlement ops, credit oversight) are funded before auctions go live.

## Horizon 3 — The record: certificate-native settlement and the verifier seat

*"The certificate IS the product" — four lenses converged. This horizon builds the moat ledgers.*

1. **Machine-verifiable trade dossier:** digital PoS (ISCC-EU/RSB), certificate-chain hashes, WtW intensity per FuelEU Annex, BDN linkage, feedstock attestation — emitted per settled trade onto the existing append-only provenance tables.
2. **Certificate-native settlement:** PoS escrowed at trade, validated against BDN mass-balance, transferred at settlement; the trade is not done until the certificate clears. **Honest dependency:** ISCC/RSB registry verification is still largely manual in 2026 — the fallback is hash-anchored attestation (documents fingerprinted and chained on the provenance tables) without registry-verified transfer, upgraded scheme-by-scheme as registries expose APIs. A forged or double-counted PoS on-platform would be existentially damaging; manual verification stays in the loop until the registries are machine-checkable.
3. **Delivered-vs-declared:** ingestion of surveyor reports, mass-flow-meter data, and e-BDNs (Singapore mandate; SGTraDex/ZeroNorth rails exist) reconciled against declared GHG intensity — per supplier, per batch. This is the measurement layer the reputation moat requires; without it, "performance records" are self-reporting.
4. **Verifier room:** third role with scoped read access — dossiers, chain-of-custody, audit log; one-click evidence bundle in FuelEU verification format. Every auditor working inside Verdaxis pulls their client fleet onto it.
5. **FuelEU pooling bridge (partner, don't build):** data-bridge linking Verdaxis physical fixtures to compliance value, routing pooling flow to OceanScore/BetterSea-class venues. Owning pooling is a Horizon-5 reevaluation, not a Horizon-3 build.
6. **Venue surveillance:** wash-trade/self-dealing/spoofing detection across org boundaries on book + auctions; sanctions re-screening; the audit registry grows the market-abuse action family. Required function of a real venue, not a feature.

**Exit gate:** a real FuelEU verifier accepts a Verdaxis evidence bundle in a real verification; first trade settles with certificate transfer on-platform.

## Horizon 4 — The authority: the index and the data business

*Benchmark status is winner-take-all, and Platts/Argus are already assessing Rotterdam/Shanghai/US methanol. Publish only when the demo-exclusion wall is externally auditable.*

1. **Verdaxis assessed price, public, two anchor slices:** transaction-anchored where prints exist, assessment-composed where they don't; daily human assessor sign-off recorded as a verified run; published methodology + contributor policy; IOSCO-principles governance stood up from day one (assessor independence, complaints procedure, methodology review).
2. **Data products:** end-of-day and intraday feeds, derived FuelEU compliance-cost curves (fuel price + EUA + penalty math per slice), forward demand telemetry (now publishable), redistribution licensing. Data revenue monetizes the venue before trading volumes do — proven ICE/Platts economics.
3. **Embeddable curve widget** (now legitimate — real data only) and public read API/SDK: the slice grammar becomes the industry addressing scheme.
4. **Derivatives pathway:** with two years of index history, co-list cash-settled contracts with an established exchange (ICE/EEX-class) as benchmark administrator under EU BMR — capture index economics without early clearinghouse capital. Own-MTF/OTF is deliberately deferred until auction volumes justify multi-year licensing cost.

**Exit gate:** first external data-licensing revenue; first third-party contract (charter party, offtake, pool agreement) referencing the index.

## Horizon 5 — The ceiling: agentic execution and the global market

1. **Copilot that works orders:** observe → propose → act progression, org-signed mandates (price caps, quantity, slice whitelist), every action through the audit registry and the demo/real wall. Act-mode ships only after propose-mode has a clean multi-month record with real users.
2. **Agent-to-agent negotiation rails:** structured counteroffer protocol, venue-enforced guardrails and mandate limits, append-only negotiation corpus.
3. **Voyage fuel-decision optimizer:** PostGIS routes × compliance engine × forward book → recommended postable bid per voyage.
4. **SKU expansion is an any-horizon evidence trigger, not an H5 feature:** bio-LNG ships whenever a real counterparty demands it — at H0 if that's when demand shows (it grew 6× at Rotterdam while bio-methanol fell 82% YoY Q1'26, so the H2 auction contingency names it explicitly); ammonia at port-readiness milestones (Singapore/Rotterdam APRL 6-7, 123 vessels ordered); synthetic ethanol honestly demoted if flow never materializes. What lives here in H5 is only the *generalization*: RFNBO/GFI-tier attributes as first-class dimensions of the market identity rather than per-fuel special cases.
5. **IMO GFI products** (position tracking, remedial-unit pricing) built when the 2026 vote fixes the mechanism design — not before.
6. **Signal refinery at scale:** LLM extractors for AIS bunkering events, port calls, certificate issuance, tender awards — every row still gated by the trust predicate and human verifier queue; the extraction pipeline never gets write access to the REAL tier on its own.
7. **FuelEU pooling ownership reevaluation** with real network mass; **MTF/OTF licensing decision**; multi-region HA.

---

## Cross-cutting tracks

### Track A — The PWA (staged to match who the user physically is)
- **A1 (H0–H1): installable + push.** Service worker, manifest, push notifications for fills/alerts/approvals; notification preferences already exist server-side. The desktop trading gate stays.
- **A2 (H1–H2): mobile approvals companion.** Phone-scale surface strictly for push-notified fills, price/compliance alerts, and maker-checker approve/reject. Four-eyes order approval (drafts, approval chains, per-user limits on the audit spine) ships with it — it encodes how maritime procurement actually signs off spend.
- **A3 (H2–H3): offline read.** Signed cached market snapshot with explicit "as of" watermarks — the provenance contract extended to offline staleness. Stale can never masquerade as live.
- **A4 (H3+): offline order drafting.** Hard price-protection bounds + expiry + reconnect reconciliation. Late and careful: one bad reconnect fill ends a conservative buyer's pilot.

### Track B — Platform engineering
- **B1 (H0):** URL routing (roadmap item; prerequisite for everything client-facing).
- **B2 (H1):** resumable event fabric — SSE on cursor-resumable streams (Last-Event-ID) over durable append-only event tables, replacing the in-process bus (200-subscriber cap); one log serves reconnecting clients, webhooks, and push.
- **B3 (H2):** public API v1 (read: slices, curves, tape) + webhooks (fills, curve moves, compliance alerts) + TS/Python SDKs; write API (post demand) follows credit boxes. Versioned from day one — the API freezes the slice grammar, so the RFNBO market-identity decision (H1) lands first.
- **B4 (H3–H4):** HA: managed Postgres with failover, ≥2 API nodes, blue-green deploys, status page with orderbook-freshness SLOs. Exchange-grade reliability is a sales document for a venue.

### Track C — Venue trust & operations
- **C1 (H0):** KYC/sanctions onboarding (provider-backed), org verification tiers, security baseline (SOC 2 Type I scope definition, pen test).
- **C2 (H2):** credit framework with banking/escrow partner (who holds escrow is a partner decision, not a build); trade credit insurance evaluation.
- **C3 (H3):** market-abuse surveillance, SOC 2 Type II, counterparty confidentiality review (competing counterparties share one database — isolation guarantees documented and tested).
- **C4 (H4):** benchmark governance (IOSCO), BMR registration counsel; instrument-classification legal opinion (are physical forwards MiFID instruments? does the pooling bridge touch emissions-unit regulation?) — **commissioned during H1**, so the answer exists before the H2 auction it must clear, not discovered at H4.
- **Market operations headcount honesty:** the assessor, verifier-queue operator, settlement ops, and credit officer are *roles the roadmap creates*. Horizons 2+ assume a market-operations function exists; that is a hiring plan, not a software feature.

### Track D — Commercial (business development)
*The liquidity bootstrap is a BD program with product support, not a product feature. Market smallness is the opportunity: with ~200 real counterparties globally, qualifying ~60 closes the market to a second venue — KYC records, certification verification, and pooling agreements are sticky annual artifacts. The first credible step needs calls, flights, and a PDF — not new code.*
- **D1 (H0): the verified-indications network.** Convert the demo-seeded pilot into 10–15 real organizations posting ISCC-verified indicative bids/asks under NDA — this IS Horizon 0's data source. Named targets: **supply side** — Singapore's three licensed methanol bunker suppliers (Global Energy Trading, Golden Island, PetroChina International) plus the unsuccessful licence applicants as a pre-qualified lead list; merchant producers selling beyond committed offtake (European Energy/Kassø, Goldwind merchant volume, GIDARA — 90kt/yr waste-to-methanol at Rotterdam — HIF, OCI/Methanex HyFuels, Proman). **Demand side** — land a methanol-fleet operator that isn't Maersk first: X-Press Feeders or Hapag-Lloyd (ZEMBA e-fuel tender winner); majors buy via offtake, while mid-tier liners and feeder operators lack green-procurement desks and need spot discovery most. Free seats, white-glove posting; the first logo unlocks supply.
- **D2 (H0–H1): publish before you trade.** A monthly **Green Bunker Monitor** built from verified indications (the internal signed marks made public at monthly cadence with methodology notes) — credibility and demand-gen for a market this small, and the on-ramp to the H4 index. **The H4 publication bar applies from Monitor #1:** every public price artifact, starting with the first, ships with the provable demo-exclusion attestation and a methodology note — there is no "informal" phase where the wall is optional. Cooperate with Argus/Platts while the tape is thin; the transaction-evidenced index they cannot replicate comes later, from strength. **Launch moment: SIBCON 2026 (October, Singapore)** — live venue, Monitor #1, and a Singapore-specific green bunker price report aligned with MPA's digital-bunkering/e-BDN agenda.
- **D3 (H1): the first paying product is compliance + monitoring, not trading.** Supplier listing/demand-signal seats and buyer monitoring (Forward Curve/Radar + fleet compliance position + CFO defense pack) at $30–60k/yr; a realistic first book is 5–10 logos ≈ $200–400k ARR. It funds the pre-liquidity years and every subscriber deepens the demand-telemetry moat. Trading fees stay at zero until liquidity is real — fees on a thin book kill it; market makers get rebates, not fees.
- **D4 (H2): channels and rails.** **Brokers as channel, not target:** broker seats for KPI OceanConnect, Integr8, Monjasa — they bring flow Verdaxis cannot originate, and disintermediation is a losing fight this decade. **ZEMBA tender rails:** offer Verdaxis as execution/evidence infrastructure for coalition tenders (run manually today) — instant credible demand aggregation including cargo owners. Port authorities (MPA, Port of Rotterdam) for regulatory legitimacy; one class society (DNV-class) as verifier design partner for the H3 evidence bundle; one FuelEU pooling provider (OceanScore/BetterSea) for the compliance bundle; SGTraDex-style documentation rails rather than rebuilding them.
- **D5 (H2–H4): revenue stack matures.** Success fees on matched trades ($2–4/mt is tolerable for green versus $1–2 conventional brokerage) → compliance-bundle fees → data licensing (index feeds, offtake indexation, derived FuelEU cost curves) → certification/qualification services ("qualified" as the brand). Honest sizing: through 2028 the addressable merchant spot market may be under 1 Mt/yr — revenue is subscription/services-led until roughly 2029. The ceiling: 10–20 Mt/yr green bunkers in the early 2030s at $700–1,100/mt is $10–20B notional; touching 15–25% of merchant flow at ~25bps blended plus data/SaaS is a **$50–120M ARR** business at boutique headcount.

---

## Next 90 days (concrete)

**Core — a 1–2 person team recruiting counterparties before SIBCON does these five, in this order:**

1. Execute `PLAN-real-signal-ingestion.md` (staging first; prod-promotion as its own reviewed slice). *(H0.1)*
2. Stand up two real signal sources for the anchor slices and begin weekly internal signed marks. *(H0.2–0.3)*
3. RFNBO market-identity design doc (decision needed before API v1 freezes the grammar). *(H1.3 prep)*
4. KYC/onboarding provider selection + org verification workflow. *(H0.5, C1)*
5. D1 outreach: the named verified-indications-network list (Singapore licensee trio, 3 merchant producers, 2 feeder/mid-tier operators, 2 traders) with the NDA + free-seat design-partner offer; hold the SIBCON 2026 (October) date as the public launch moment. *(Track D)*

**Stretch — only after the core is moving, in this order:**

6. Green Bunker Monitor #1 drafted from the first month of verified indications, with demo-exclusion attestation. *(D2)*
7. URL routing conversion design doc + implementation. *(H0.4, B1)*
8. Compliance-adjusted pricing overlay prototype with one design-partner fleet. *(H1.2 seed)*
9. PWA A1 (manifest + service worker + push) — deferred until the first real counterparty is live; push notifications for a demo book serve no one. *(Track A)*

## The six risks that kill (watch continuously)

1. **Demo taint and first impressions.** Any perception that index history, dossiers, or demand telemetry ever mixed demo data is fatal to the entire authority thesis — and with ~200 counterparties there is no room for a botched first impression: one failed trade or one counterparty-identity leak poisons the whole pond. The wall must be provable to outsiders, not just tested internally.
2. **Liquidity never arrives.** The specific failure mode is offtake dominance: if majors keep locking supply bilaterally (Maersk–Goldwind-style multi-hundred-kt deals), merchant/spot volume never reaches venue viability. Mitigation is the sequencing itself: compliance SaaS revenue first (D3), auctions not CLOB (H2), the verified-indications network feeding real data before anyone trades (D1) — the platform is valuable to each side before the other side shows up, and the venue is positioned as the *balancing market around offtakes*, the way power exchanges grew around PPAs.
3. **Incumbent speed and retaliation.** ZeroNorth/KPI/Integr8 bolt green SKUs onto existing broker rails before Verdaxis concentrates flow; Platts/Argus plus incumbent brokers can bundle assessments with voice brokerage to freeze out a venue that threatens both. Answer: brokers get seats (D4), PRAs get cooperation before competition (D2), and the compliance-denominated wedge (H1) plus certificate-native settlement (H3) are things broker rails structurally don't have.
4. **Regulatory misclassification.** Physical forwards, pooling instruments, or the index tripping MiFID/BMR/emissions-trading rules unprepared. Answer: C4 legal opinions commissioned at H2.
5. **Trust-tier pollution.** LLM-extracted or partner-fed signals corrupting the REAL tier under volume pressure. Answer: the trust predicate + human verifier queue are constitutionally unbypassable; extraction pipelines never write REAL directly.
6. **Running out of money before liquidity.** The venue cost base (ops roles, legal, security certs, partners) arrives horizons before trading revenue does, and D3's first ARR (~$200–400k) does not cover it. Answer: the per-horizon financing gates — no horizon opens unfunded, and the roadmap degrades gracefully (H0+D1+D2 alone form a fundable data/BD story) rather than half-building H2.
