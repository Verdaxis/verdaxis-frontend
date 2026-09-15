# Focused Orderbook design QA

**Superseded, 15 September 2026:** The owner withdrew this concept. The implementation and preview data were removed from staging. The checks below are historical evidence, not approval of the current product direction. See `docs/plans/2026-09-15-remove-pathway-preview.md`.

Source visual truth: `/home/jons-openclaw/.codex/generated_images/01a093b8-a470-7c93-96e2-d0b677878d28/exec-73bfecfe-ef68-4287-b2bd-1fb985c51a4d.png` (selected concept A).

Implementation evidence directory: `/home/jons-openclaw/artifacts/reports/verdaxis-orderbook-pathways-20260915/screenshots/`.

## Comparison

- Full view: source A and `local-book-1440-final.png` were opened together in the same comparison input, after reviewing `local-book-1440.png` and correcting its title and row scale.
- Focused region: `local-book-detail.png` records the actual book, columns, rows and footer; these were checked against A's corresponding book region. Family/pathway controls were also checked in `local-preview-1440-settled.png`.
- Viewports: 1440×1000, 1024×900, 768×1024/900, and a 390px preview-component resilience check. Source A is 1488×1060. No pixel-exact claim is made across these sizes.
- States: selected book, five supplied offers, empty filters, loading, error/retry, EN/ZH, light/dark, enquiry dialog and keyboard dismissal.
- Local screenshots show the actual components in an isolated fixture without the authenticated shell. The staging origin protection was not changed. Full-shell staging verification is a separate release check.

## Findings and changes

- Fixed P2: the first pass kept the old small title and 28px rows. The exact market now has an 18px heading; price rows are at least 44px with larger, tabular values.
- Fixed P2: old filter navigation could drop the selected tab. URL query state is preserved when the canonical slice changes.
- Fixed P2: generic page refresh did not directly refresh the book. The displayed book now owns refresh and retry controls.
- Fixed P2: Chinese pathway buttons had English accessible labels. Their labels now follow the visible locale.
- Fixed correctness issue: demo-only prices could label the footer as crossed. Only non-demo orders define the live spread.

## Required fidelity surfaces

- Fonts/typography: existing Verdaxis font stack is retained, including monospace/tabular prices. The hierarchy follows A without copying distorted Image Gen text. Dense data remains smaller than marketing-style mock text so the 15-row book remains useful.
- Spacing/layout: existing shell and content width are retained. Fuel controls precede pathway selection; the book occupies the full content column. Filters wrap at tablet widths. The exact-slice warning is compact. Recent trades remain accessible below the book.
- Colors/tokens: existing slate, emerald, red and amber styles are reused. Active selections have high contrast in both themes; error, preview and demo states also have text labels.
- Images/assets: no generated artwork or hand-drawn logo was added. The existing app assets and icon library remain unchanged. The local component fixture deliberately omits the shell rather than faking it.
- Copy/content: precise port and period remain visible. Supplied indications keep their original quantities and dates. They do not invent a price, certification, exact delivery port, or verified emissions saving.

## Accepted differences from A

- Live books expose only supported canonical products. The staging preview exposes RCF, Gasoil and Fuel Oil as non-executable indications; they do not become live API product IDs.
- Invented mock prices, counts and spread are not copied. Only actual visible row counts are shown; the 15-per-side limit is explicit.
- The mock's misaligned ask headers are corrected. The existing bid/ask depth bar direction is retained.
- Details are reached through existing order inspection; no non-working Specifications action is added.
- Preview data is kept out of production builds. The existing mobile desktop gate is not removed.

## Checklist

- [x] Compare source and rendered implementation together.
- [x] Correct actionable layout, accessibility and state findings.
- [x] Check compact and large viewports, both themes and languages.
- [x] Check preview filters, all five original offers, enquiry focus and Escape.
- [x] Retain exact market identity and trading restrictions.

No actionable P0/P1/P2 design findings remain in the local component pass. Live staging acceptance is recorded in the release report.

final result: passed
