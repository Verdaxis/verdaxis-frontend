# Forward Curve V1 Design

**Date:** 2026-04-14
**Status:** Draft
**Branch:** `staging`
**Depends on:** `2026-04-13-qualified-executable-orderbook-design.md`

---

## Goal

Define a clean first version of the Verdaxis forward curve that supports market context and discovery without pretending to be a tradable forward market.

The curve should help users answer:

- what is the indicative forward price path for this product and port?
- how does the current window relate to later windows?
- where should I go in Marketplace / Orderbook if I care about a specific future period?

It should not imply that users can trade the curve directly.

---

## Product Position

Forward Curve V1 is an **indicative benchmark surface**.

It is:

- directional market context
- benchmark-centric
- slice-aware by product and port
- click-through navigation into executable market slices

It is not:

- a tradable futures board
- a full broker screen
- a synthetic ARA bucket view
- a private negotiation surface

---

## Scope

### Supported products

Only the four approved market products:

- `BIO_METHANOL`
- `E_METHANOL`
- `BIO_ETHANOL`
- `SYNTHETIC_ETHANOL`

### Supported ports

Only the eight approved ports:

- `Dalian`
- `Busan`
- `Shanghai`
- `Singapore`
- `Rotterdam`
- `Houston`
- `Los Angeles`
- `Santos`

No aggregate delivery buckets:

- no `ARA`
- no broad `Asia`
- no broad `Europe`

### Supported identity

Forward Curve V1 is keyed by:

- `market_product`
- `delivery_point`

The curve displays future windows for that exact product-port pair.

---

## Window Set

Use a fixed, comprehensible horizon.

Recommended V1 windows:

- `SPOT`
- next 6 monthly windows
- next 4 quarterly windows
- next 2 calendar-year windows

Example if current month is April 2026:

- `SPOT`
- `2026-05`
- `2026-06`
- `2026-07`
- `2026-08`
- `2026-09`
- `2026-10`
- `2026-Q3`
- `2026-Q4`
- `2027-Q1`
- `2027-Q2`
- `2027-CAL`
- `2028-CAL`

Rules:

- windows must sort in economic time order
- no duplicate semantic periods shown twice in adjacent ways unless intentionally designed
- if the API has fewer points, show fewer points rather than inventing fake extra horizons

---

## Data Model

### Primary curve line

The main line should represent the **indicative benchmark mid** for each window.

This is the line users should read first.

### Optional supporting band

If available, show a soft indicative band around the mid:

- upper edge: indicative offer-side context
- lower edge: indicative bid-side context

This band is visual context only.

It must not be styled like firm executable depth.

### No fake liquidity bars

Do not imply traded volume or firm depth unless actual data exists.

If volume/order-count exists for a point, it may be shown in tooltip/detail copy, but not as a misleading firm-book visualization.

---

## Visual Semantics

### Required labels

The curve must clearly say it is indicative.

Required cues:

- title or subtitle contains `Indicative`
- benchmark line visually dominant
- supporting band visually softer than the main line
- export and refresh controls remain secondary

### Tooltip content

Tooltip should show:

- product
- port
- window
- indicative mid
- indicative bid if available
- indicative ask if available
- spread if available
- order count / volume if available

Tooltip should not suggest the point itself is executable.

### Empty state

If no curve exists for the selected product-port pair, show:

- a clear empty state
- a short reason
- a CTA or hint to check Marketplace / Orderbook for live spot or near-dated liquidity

Recommended copy direction:
- `No indicative curve is available for this product and port yet.`

---

## Interaction Model

### Product and port control

When embedded in Market Terminal, the curve should inherit:

- selected `market_product`
- selected `delivery_point`

It should not expose a second conflicting product taxonomy.

### Click-through behavior

Clicking a curve point should navigate into Marketplace with:

- `market_product`
- `delivery_point`
- `availability_window`

This is the most important behavioral rule in V1.

The curve is informative; Marketplace / Orderbook is where action happens.

### No direct trade CTA on the curve

Do not place `Buy`, `Sell`, `Hit Bid`, or `Lift Ask` directly on the curve itself in V1.

---

## Relationship To Other Verdaxis Surfaces

### Marketplace

Marketplace is the actionable filtered list view for a selected market slice.

The curve should drive users into Marketplace when they care about a specific window.

### Orderbook

Orderbook is the exact executable bid/ask ladder for a selected slice.

The curve should not try to become a compressed orderbook.

### Trade Tape

Trade Tape is historical executed activity.

The curve may optionally reference that a point has recent supporting trade activity, but it should not duplicate the tape.

### Benchmarks

Forward Curve V1 is benchmark-led.

That means:

- benchmark semantics stay primary
- certification scheme does not split the curve in V1
- off-spec rows do not influence standard curve presentation by default

---

## Data Integrity Rules

- curve ports must match the approved six-port list exactly
- curve products must match the approved four-product list exactly
- curve points must not use aggregate regions or bucket ports
- if product/port is unsupported, do not silently map to another market
- missing data is preferable to fake curve continuity

---

## Recommended V1 UX Summary

For a selected `Bio Methanol + Singapore` view:

- show one indicative benchmark line
- optionally show a soft bid/ask context band
- show windows in fixed order from `SPOT` outward
- on click, send the user to Marketplace filtered to that exact future window
- make it obvious that the curve is indicative, not tradable

---

## Explicit Non-Goals

Do not add in V1:

- tradable forward orders
- private RFQ / negotiation from the curve
- certification-split curves
- ARA aggregate curves
- volume-driven depth bars that imply firm executable futures liquidity
- algorithmic projected prices beyond the chosen horizon without a clear label

---

## Follow-On Work

After V1 is stable, the natural next upgrades are:

1. canonical benchmark/reference APIs keyed by `market_product + delivery_point + availability_window`
2. better seeded/demo curve shapes by product and port
3. confidence/source labels if multiple signal sources exist
4. optional certification-aware curve segmentation if the market genuinely prices that way later
