# Verdaxis Market Context

This glossary fixes the language for Verdaxis' market model so frontend, backend, decks, and seeded data use the same commercial concepts.

## Language

**Qualified Executable Orderbook**:
A transparent market where verified buyers post bids, verified suppliers post asks, and counterparties can execute against live orders when the executable qualifiers match.
_Avoid_: RFQ-first marketplace, inquiry board, listings-only marketplace

**Order**:
A posted buy or sell intent in the orderbook.
_Avoid_: listing, RFQ, quote

**Bid**:
A buyer-side order to purchase a market product at a delivery point and availability window.
_Avoid_: buyer RFQ, demand listing

**Ask**:
A supplier-side order to sell a market product at a delivery point and availability window.
_Avoid_: supplier listing, seller quote

**Market Product**:
The canonical tradable fuel identity used by Verdaxis.
_Avoid_: fuel family, generic fuel type

**Market Slice**:
The stable market identity used to group liquidity and context: market product, delivery point, and availability window.
_Avoid_: fuel family, region bucket, generic product

**Executable Qualifier**:
An order attribute that must match or be acceptable before an order can be executed, such as certification scheme.
_Avoid_: display-only metadata

**Certification Scheme**:
The sustainability or fuel-origin certification used to qualify execution compatibility.
_Avoid_: certification note, document tag

**Filterable Attribute**:
A visible order attribute that helps users screen liquidity but does not define a separate book by default.
_Avoid_: execution key

**Demo Listing**:
Seeded preview liquidity used to demonstrate the platform before sufficient user-posted liquidity exists.
_Avoid_: real listing, live liquidity

**Benchmark**:
An indicative reference price for a market slice that anchors price discovery without being a firm executable quote.
_Avoid_: tradable quote, listed order

**Forward Curve**:
An indicative price-path surface for a selected product and delivery point.
_Avoid_: futures board, direct trading screen, executable quote

**Trade Tape**:
The anonymized public evidence layer for recent completed market activity.
_Avoid_: private negotiation log

**Market Terminal**:
The consolidated monitoring surface for one selected product and delivery point.
_Avoid_: separate trading model

**Watchlist**:
A user-owned surveillance layer for market slices and pinned orders.
_Avoid_: second orderbook, matchmaking source, generic bookmark list

**Market Radar**:
The default Watchlist container automatically used to monitor market-slice changes and pinned order updates.
_Avoid_: custom watchlist, saved search, trading engine

**Demand Signal**:
An anonymized aggregate of buyer bid interest by fuel family, region, and availability urgency.
_Avoid_: executable order, RFQ, named buyer lead

**RFQ**:
A bilateral negotiation workflow that is not the primary Verdaxis market model because buyer intent should normally be posted as a bid.
_Avoid_: primary buying flow

**Delivery Point**:
An approved port or fuel corridor where users can list or trade a market product.
_Avoid_: broad region, aggregate bucket

## Relationships

- A **Market Product** is traded through one or more **Market Slices**.
- A **Market Slice** has many **Bids** and **Asks** in the **Qualified Executable Orderbook**.
- An **Order** is either one **Bid** or one **Ask**.
- A **Benchmark** belongs to one **Market Slice**.
- A **Forward Curve** is composed of benchmark points for one product and delivery point across future availability windows.
- A **Watchlist** observes **Market Slices** and pinned **Orders**; it does not change matching or execution rules.
- A **Demand Signal** summarizes buyer interest for supplier activation; execution still happens in the **Qualified Executable Orderbook**.
- A **Demo Listing** may appear in market-intelligence surfaces but must not be presented as user-posted liquidity or executable production activity.
- **RFQ** may exist for future optional workflows, but the primary user journey must route buyer intent into **Bids** and supplier intent into **Asks**.

## Example Dialogue

> **Dev:** "Should this supplier quote open the RFQ panel?"
> **Domain expert:** "No. In Verdaxis language, supplier intent is an **Ask** in the **Qualified Executable Orderbook**. RFQ is legacy and should not be the primary surface."
>
> **Dev:** "Can the curve point be clicked to buy?"
> **Domain expert:** "The **Forward Curve** is indicative only. Click-through may open the matching **Market Slice** in Marketplace, but execution happens against orders, not against the curve."

## Flagged Ambiguities

- "Listing" has been used for both user-posted liquidity and seeded preview rows. Resolved: use **Demo Listing** for seeded rows and **Order**, **Bid**, or **Ask** for user-posted executable liquidity.
- "Fuel type" has been used for both broad families and tradable products. Resolved: user-facing market selection uses **Market Product**, not broad fuel family.
- "Port" and "region" have been mixed with aggregate buckets such as ARA. Resolved: execution surfaces use approved **Delivery Points** only.
- "RFQ archived" can overstate the current state. Resolved language: **RFQ** is not the primary Verdaxis market model; operational RFQ code is separate from the orderbook language.
