# Design System — Verdaxis Market Radar

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
