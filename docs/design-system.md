# Design System — Verdaxis Market Radar

## 2026-09 Forward Curve Point Tooltip

Show an anchored, transient tooltip on point hover and keyboard focus. Keep the full delivery period first, followed by the plotted price in USD/MT, its source/demo status, best bid, best ask, spread, visible order volume, and observation age. Preserve cents and distinguish missing values from zero. Reuse the console palette, tabular figures, 8px radius, and the existing body-portal pattern. Keep the tooltip within the viewport, hoverable, and dismissible with Escape. No animation or new dependency. Hover must not select a period or request slice data; click, keyboard selection, and exact Marketplace handoff remain unchanged. Verify near/far points, short/all horizons, EN/ZH, both shell themes, and narrow desktop widths. Stage this feedback for review before production promotion.

## 2026-09 Forward Curve Horizon Repair

Keep the established operator-grade market console, palette, monospace market figures, 8px grid, 8px panel radius, and flat elevation. This is a chart-readability repair, not a rebrand. Fuel buyers and suppliers must be able to compare the full delivery curve without reading overlapping dates.

The owner chose chart-only **1Y / 3Y / All** delivery-horizon controls, defaulting to All, with sparse year labels on long curves. These are future delivery periods, not historical price-action ranges. Short ranges use month/quarter ticks with the year beneath. Labels adapt to the actual panel width, not only the viewport, and never grow as the panel narrows. Keep every data point and missing-period slot; omit labels, not data. Keep full period names in point names/tooltips and the selected-period inspector. If the selected period is outside a shorter chart horizon, say so and keep All available. Matrix and exact-slice Marketplace handoff remain unchanged.

Reuse the native SVG and existing button styles; no new component library, chart dependency, drag gesture, or decorative animation. Price lines retain sky blue, selected points retain emerald plus the selection ring, and axis text uses the existing readable muted slate. Range controls have visible pressed/focus states and at least 44px touch height. Use fixed 12px chart text and a fixed-height plot with width-aware geometry; test that labels have clear horizontal separation.

Reference: owner screenshot `/tmp/cmc-6c93671777f8b62c.png`. Review 1920, 1440, 1280, 1024, and 768px widths, expanded/collapsed sidebar, EN/ZH, and light/dark shell. Keep the authenticated mobile gate below 768px. Verify reduced motion, sparse/missing data, single-point/empty curves, and selection outside the visible horizon. Do not add chart transitions during live updates.

Browser iteration: keep the chart header to the market identity and range buttons on one row. Put the missing-evidence explanation beside the legend; the long subtitle otherwise wraps the controls into a wasteful extra row at 1280px.

## 2026-09 Site Checklist Repair Contract

Preserve `.impeccable.md` and the current public maritime-market identity. This is a completeness and accessibility pass, not a rebrand. Reuse current slate surfaces, blue/green brand accents, Montserrat/Lato typography, 8px spacing, restrained radii, and existing controls. Public sticky actions use one clear action, at least 44px touch height, safe-area padding, and content clearance. Consent choices have equal visual weight and remain available after dismissal; do not cover the action or form. No new decorative motion. Respect reduced motion and keep feedback near 150–200ms. Verify EN/ZH at 390×844, 768×1024, and 1440×1000. Keep the intentional authenticated mobile gate. Use original local brand assets, useful image alternatives, and neutral completion copy that matches real submission state.

## Aesthetic Direction
Market Radar should feel like an operations console rather than a consumer favorites list. The memorable trait is a signal-board presentation: compact slice cards, crisp status chips, and event-led summaries that read like live market surveillance.

## Color System
- `--radar-ink: #0f172a`
- `--radar-panel: #f8fafc`
- `--radar-panel-strong: #e2e8f0`
- `--radar-line: #cbd5e1`
- `--radar-accent: #0f9f6e`
- `--radar-accent-soft: rgba(15, 159, 110, 0.12)`
- `--radar-alert: #c2410c`
- `--radar-alert-soft: rgba(194, 65, 12, 0.12)`
- `--radar-info: #0369a1`
- `--radar-info-soft: rgba(3, 105, 161, 0.12)`
- `--radar-quiet: #64748b`

## Typography
- Keep the existing Verdaxis dashboard stack.
- Slice headings: bold, condensed-feeling uppercase labels.
- Event text: smaller muted system text, but never below `text-[11px]`.
- Numeric deltas: monospace emphasis for benchmark and price movements.

## Spacing & Layout
- Use a dense 8px grid.
- Slice cards should read in three bands:
  1. identity row
  2. signal row
  3. pin/event row
- Prefer stacked cards on mobile and a two-column radar layout on desktop.

## Components
- `Market Radar` panel in Command Center:
  - compact stacked cards
  - active count chip
  - unread badge
  - latest event summary
- `WatchlistPage`:
  - slice-first cards
  - expandable event feed
  - nested pinned-item rows inside the slice card
- `Marketplace` actions:
  - `Track slice` as a pill button in the table row
  - `Pin listing` / `Pin bid` as a secondary ghost action
- Use existing panel primitives and Verdaxis styling; do not introduce browser-default controls.

## Motion
- Hover elevation only: 150-180ms ease-out.
- Unread badge/state transitions: 180ms.
- Expand/collapse sections: 220ms, transform/opacity only.
- No decorative looping animation.

## Anti-Patterns
- No stars, hearts, or consumer "saved items" language.
- No isolated watchlist page that is disconnected from Marketplace and Command Center.
- No full-width empty whitespace cards.
- No native browser select/button styling in new radar controls.


## 2026-09-07 Core Workspace Review

Audience: fuel buyers, suppliers, and market operators comparing qualified low-carbon fuel offers and confirming commercial introductions. Tone: precise, restrained, maritime-industrial. The memorable element is clear market data and accountable next actions.

Forward Curve is intentionally dark by the creator's explicit instruction. Preserve that independent dark console while retaining the shared product identity. Marketplace and Command Center continue to honor the normal app theme.

Use existing font assets and existing Tailwind/shared controls. Headings 24–28px, section titles 16–18px, actionable data 13–14px, supporting data 12px where space allows (11px minimum for dense metadata). Use tabular numbers for price/quantity and proportional type for labels; monospace is reserved for numeric data and short console metadata.

Keep an 8px rhythm, compact 8px panel/control radii, thin separators, and restrained shadows. Avoid huge CTA tiles, ornamental icons, decorative gradients, or new component libraries.

Dark console palette: retain blue-black surfaces and cyan/emerald chart accents; raise supporting text to a readable slate-blue. Use a distinct border plus background for selected cells and visible keyboard focus. Never use color as the only provenance or action cue. Preserve chart gaps and demo labels.

Use 150–180ms color/opacity transitions for state changes, disable unnecessary motion under prefers-reduced-motion, and keep data tables stable while refreshing.

Review viewports: 1024x900, 1440x1000, 1920x1080 desktop; 390x844 verifies existing mobile gate. Reference evidence lives in /home/jons-openclaw/artifacts/reports/verdaxis-review-20260907. Compare legibility and operational hierarchy against the existing screenshots; pixel matching is not the objective.


## Shared Loading Screen

Cookie preferences in the authenticated desktop app use an in-flow sidebar footer control below Settings. Match existing navigation colors and focus rings; use a named icon-only button when the sidebar is collapsed. Hide the duplicate floating control only while the desktop sidebar exists. Public footer and mobile/auth-page controls remain unchanged. Do not place consent controls over navigation or trade actions.

Use one centered loading mark from the HTML startup shell through route, session, and full-page data loading. Match the logo: marine blue `#24558A`, leaf green `#78AA36`, and silver `#AEB7C2`. The mark is a fuel droplet with two slow liquid flows and a small silver ripple. Keep the existing font stack, a 96px mark, a 16px gap, and a 14px status label. Use existing light/dark surfaces and readable muted text.

Use one local SVG asset and one shared stylesheet for HTML and React. Animate only transforms and opacity: a 3.2-second continuous flow and a 2.4-second ripple. Reduced motion shows a still droplet. No artificial wait, progress percentage, extra library, remote asset, or full-screen overlay during background refresh. Keep button indicators and table skeletons in their existing contexts. Review desktop, mobile startup, dark/light mode, and reduced motion.
