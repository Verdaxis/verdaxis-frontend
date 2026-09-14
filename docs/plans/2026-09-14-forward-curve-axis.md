# Forward Curve Axis Implementation Plan

**Goal:** Keep the five-year forward curve legible, with owner-approved 1Y / 3Y / All horizons and sparse long-range year labels, then dogfood and deploy to staging and production.

**Architecture:** Preserve the native SVG and market data/selection flow. A small pure axis helper filters canonical delivery windows and chooses non-overlapping ticks. Chart-local horizon state changes only the chart; the matrix and Marketplace slice remain intact. Measure the chart container through ResizeObserver so SVG units correspond to CSS pixels.

**Tech Stack:** Existing React 19, TypeScript, Tailwind 3, SVG, Vitest, agent-browser.

## Diagnosis and design

- `ForwardCurveWorkspace.tsx`: each priced period gets a full label inside a fixed 900-unit SVG, regardless of horizon length.
- `index.css`: narrow-container overrides enlarge those labels from 12px to 18/22px, while the plotted slots get narrower.
- Options proposed: two-tier quarter/year labels; time-range buttons; horizontally scrolling full labels.
- Owner revision: combine range buttons with sparse year labels for long curves. All remains the default; no need for scroll on the normal chart.
- Preserve `.impeccable.md` and the repair contract in `docs/design-system.md`. No Shadcn installation; it is not the current stack. Use static UI/UX rules because the optional search helper is absent. The CSS-only redesign recipe cannot implement horizon filtering; keep changes confined to chart rendering and display state, with no API/business-rule change.

## Implementation and checks

1. Add failing helper tests in `src/tests/forward-curve-axis.test.ts`: rolling 4/12-quarter horizons, 2031 retention in All, sparse years, minimum tick spacing at narrow widths, EN/ZH, empty and singleton input.
2. Add `src/utils/forwardCurveAxis.ts` using existing availability-window parsing/formatting; no new dependency. Run `npm run test -- src/tests/forward-curve-axis.test.ts`.
3. Update `src/components/ForwardCurveWorkspace.tsx`, its existing tests, `src/index.css`, and EN/ZH `trading.json`: chart-local range buttons, adaptive axis, accessible point selection, and truthful outside-range state. Preserve gap segments and Marketplace handlers. Run both focused suites and `npm run typecheck`.
4. Start a task-owned loopback frontend against staging. Use approved test login; do not submit orders, trades, or customer forms. Dogfood range controls, far-quarter selection, matrix selection, exact Marketplace handoff, refresh, themes, locales, widths, and mobile gate. Capture screenshots and iterate on observed defects.
5. Freeze source; run full tests, translations, release-guard tests, target-strict build validation, and review the diff against current Web Interface Guidelines.
6. Commit under the repository owner. Integrate the scoped commit into current staging without unrelated changes; back up the live staging artifact, deploy, and repeat browser checks. Promote the same reviewed source to prod through the protected Vercel release workflow only. Verify canary, all production aliases, and live forward curve. Record commit, run/deployment IDs, screenshots and limitations in the report.

Execution: main agent only, per owner instruction. No production mutation before staging acceptance.
