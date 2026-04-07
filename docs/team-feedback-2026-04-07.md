# Team Feedback on Design Forge Audit — Verdaxis Exchange

**Date:** 2026-04-07
**Participants:** Jon (MarinaChain), Gavin McGrath, Chris Chatterton (Green Marine)
**Input:** Design Forge Audit + BMAD UX Assessment + External Advisor PDF

---

## Summary

The team broadly accepted the audit's core findings — action dashboard, post-action feedback, form streamlining, empty states. Two important strategic clarifications emerged: (1) the anonymous orderbook is the RIGHT model because green fuel suppliers have no pre-existing relationships with buyers, making now the ideal time to set market norms; and (2) the RFQ system should be archived because the orderbook IS the single source of truth — an RFQ is functionally a bid, a counteroffer is functionally an ask, and the whole point is to replace the 1-1 opacity of conventional fuels with many-many transparency in the green fuels blue ocean.

---

## Agreements

- **Replace MAP with Action Dashboard** — Universally agreed, highest activation impact
- **Post-action match feedback** — Flagged from direct user experience ("this morning")
- **Form streamlining** — Endorsed Coinbase "advanced options" analogy. 5-field quick form, collapse the rest.
- **Empty states are dismissive** — Need action-oriented CTAs, not "explore the map"
- **Supplier demand visibility gap** — Real gap, suppliers are blind to buyer intent
- **MatchSuggestions buried** — Needs to be first-class on dashboard
- **Modal code duplication** — 7 types, 200+ redundant lines acknowledged
- **Sidebar passive language** — Rename to action-oriented labels
- **Anonymous orderbook is correct** — Green fuel suppliers DON'T have pre-existing relationships with buyers. This is a blue ocean moment to set the transparency norm for the entire green fuels market. Anonymity ensures best-price-wins behavior from day one.
- **CI-adjusted pricing is a differentiator** — Keep it, but defer heavy investment until market signals demand. Build slowly.
- **KYC/onboarding friction points** — Acknowledged. T&Cs should embed in verification email, not a separate wall.

## Pushbacks / Corrections

- **~~Anonymity-first orderbook~~** — NOT a pushback. Jon was thinking aloud; Gavin and Chris confirmed anonymous is correct. Green fuel producers have no legacy relationships — now is the time to establish transparent many-many trading as the default.
- **RFQ system** — Not "integrate," but **archive**. The orderbook is the single source of truth:
  - Buyer wanting to RFQ = functionally equivalent to placing a Bid
  - Seller wanting to counteroffer = functionally equivalent to placing an Ask
  - The 1-1 opacity of conventional fuel negotiations is exactly what Verdaxis displaces
  - Many-many transparency is the product thesis
  - Don't delete RFQ code, but remove from active UI. May resurface later for specific use cases.
- **Audit timeline estimates** — "1-2 weeks" is human-dev time; with Claude implementing, it's hours.

## New Context That Changes Priorities

- **Demo next week** — Seeded supply data is an immediate blocker
- **Launch scope: 4-6 ports only** — Singapore, Shanghai, ARA (Rotterdam), Houston, possibly Santos + Long Beach
- **Fuel scope: Methanol + Ethanol first**, then expand
- **Green fuel producers are ALL new market entrants** — Both sides need onboarding guidance, not just buyers
- **Supply-constrained market** — The cold-start problem is supply-side (pilot-scale production, truck logistics, prices 25% above scale cost). Platform needs to make posting supply dead simple.
- **Prior art: Prosmar** did $22M in trading and was "very basic" — simplicity wins

## New Ideas from Team

- **T&Cs in verification email** — Reduce legal friction by embedding acceptance in the email click flow
- **Relationship-aware trust layer** — Verification badges and reputation matter more than UI polish for building trust between unknown counterparties
- **Port-scoped launch** — Only show 4-6 ports in the UI at launch, not the full global map

---

## Revised Priority List

### Immediate (this week — demo blocker)
1. **Seed demo data** — Get supply listings into the platform for the demo

### Phase 1: Activation (post-demo, hours not weeks)
2. **New BuyerActionDashboard** — Replace MAP as default landing
3. **Post-action feedback screen** — Match feedback after bid/ask submission
4. **Archive RFQ from UI** — Hide RFQ panel; orderbook is the single source of truth
5. **Sidebar CTA button** — "Post a Bid" / "Post Supply" in navigation
6. **Empty state rewrites** — Action-oriented messaging

### Phase 2: Visibility
7. **MatchSuggestions promotion** — Move to dashboard, SSE, always-visible
8. **Supplier Demand Feed** — Show inbound buyer intent
9. **Form streamlining** — 5-field quick form + "Advanced" collapse

### Phase 3: Polish
10. **Modal accessibility + consolidation**
11. **Page transitions** (AnimatePresence)
12. **Color token migration** (hardcoded hex → Tailwind tokens)
13. **Port scoping** — Limit UI to launch ports only

### Phase 4: Trust & Signals
14. **Activity indicators** — Live order/trade counts
15. **Verification badges** on counterparty profiles
16. **T&Cs in email flow**

---

## Key Strategic Insight

> The 1-1 opacity of conventional fuel brokerage is exactly what Verdaxis displaces.
> The orderbook is the single source of truth — many-many, transparent, best-price-wins.
> Green fuel producers have no legacy relationships. Now is the time to set the market norm.

This isn't just a UX decision — it's the product thesis. Every UI choice should reinforce: **post publicly, match transparently, trade on merit.**
