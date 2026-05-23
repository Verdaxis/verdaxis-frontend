# Forward Curve Monitoring Workspace — Design Brief

**Date:** 2026-03-25
**Status:** Updated for V1 direction on 2026-05-19
**Priority:** Phase 2/3
**Reference:** Braemar trading platform screenshots (March 2026)

---

## Vision

Build a Braemar-style market monitoring workspace under the existing `Forward Curve` product surface. The existing Market Terminal remains the trading-oriented terminal; this page is for scanning markets, reading hybrid benchmark/orderbook context, and explicitly handing a selected market slice into Marketplace.

V1 is a fixed, sales-ready preset workspace rather than a drag-and-drop dashboard. Saved layouts, user-defined widgets, news, regulations, compliance, and education panels remain later work.

## Reference: What Braemar Does

From the screenshots analyzed:

- **Left panels:** Multiple order books (CAPE, PMAX, SMAX) as resizable/stackable grids — each showing a forward curve with bid/ask/qty columns per delivery period
- **Right panels:** TradingView-style candlestick/line charts with indicators (SMA, Volume), timeframe selectors (1h, 4h, D), and drawing tools
- **Bottom bar:** Trade tape (CLEARER/SCREEN tabs) + News feed with search
- **Top bar:** Dashboard selector ("Create Dashboard"), view toggles (Home, Chart, Grid, Dashboard)
- **Key UX:** Drag-and-drop panel layout, multiple instruments side-by-side, saved layouts, real-time price streaming with green/red flash

## Recommended V1 Approach: In-House Fixed Workspace

### Why This Approach

The immediate product need is a credible monitoring screen, not a layout-builder. Verdaxis should avoid TradingView-branded UI in V1 and use its existing charting/UI stack so the page looks in-house built. `react-grid-layout` and saved dashboard CRUD can be revisited after users validate the fixed board.

### Architecture

```
ForwardCurveWorkspace (page)
├── Toolbar
│   ├── availability window selector
│   ├── refresh
│   └── explicit Open Marketplace CTA
├── Market Matrix
│   └── 8 approved ports × 4 public market products
├── Focus Panels
│   ├── hybrid forward curve
│   ├── selected-slice depth
│   └── trade tape
└── Source legend
    └── benchmark/demo/orderbook context labels
```

### Deferred Widget Types

The widget list below is a future direction for a configurable workspace. It is not V1 scope.

| Widget | Content | Data Source |
|--------|---------|-------------|
| **Order Book** | Bid/ask grid for a specific fuel×port, depth bars, CI badges, instant trade buttons | `GET /api/orderbook/bids` + `/asks` with SSE updates |
| **Forward Curve Chart** | TradingView Advanced Chart embed with our custom datafeed | TradingView widget + our `GET /api/curves/forward` |
| **Price Chart** | Candlestick/line chart for a specific instrument over time | TradingView widget + historical trade data |
| **Trade Tape** | Live trade feed, filterable by fuel/port | `GET /api/trade-tape` + SSE |
| **News Feed** | Categorized headlines from RSS + Gemini | `GET /api/news` |
| **Price Alert Panel** | Active alerts with trigger status | `GET /api/alerts` |
| **Watchlist** | Starred fuel×port combos with live best bid/ask | `GET /api/watchlists` + aggregated orderbook |
| **Compliance Summary** | FuelEU gap, CII grade, IMO 2030 progress | `GET /api/compliance/summary` |

### Deferred TradingView Integration

Do not use TradingView-branded widgets in V1. This section is retained as a future option only if Verdaxis chooses a licensed or white-labelled charting path.

- Use TradingView's **Advanced Charts** library (free tier available, or paid for white-label)
- Implement `IDatafeedChartApi` interface to feed our price data:
  - `resolveSymbol()` — map "METHANOL-SG" to our product+port combo
  - `getBars()` — return historical OHLCV from trade tape / reference prices
  - `subscribeBars()` — SSE-driven real-time bar updates
- Indicators available out of the box: SMA, EMA, MACD, RSI, Volume, Bollinger Bands
- Drawing tools (trend lines, fibonaccis) come free with TradingView

### Deferred Layout Persistence

Do not add layout persistence in V1.

New backend model:
```
DashboardLayout
  id: UUID
  user_id: FK → users
  name: str (e.g., "Default", "Methanol Focus", "Multi-Fuel")
  layout_json: JSON (react-grid-layout serialized state)
  widgets_json: JSON (widget configs — type, instrument, timeframe per widget)
  is_default: bool
  created_at: datetime
  updated_at: datetime
```

Endpoints:
- `GET /api/dashboards` — list user's saved dashboards
- `POST /api/dashboards` — create new dashboard
- `PUT /api/dashboards/{id}` — save layout changes (auto-save on drag/resize)
- `DELETE /api/dashboards/{id}` — delete dashboard

### Real-Time Price Streaming

Current: SSE (Server-Sent Events) via `/api/stream/`
Future upgrade path: WebSocket for lower latency + bidirectional communication

For the initial version, SSE is sufficient. Each widget subscribes to relevant channels:
- Order book widget → `orderbook:{product_id}:{delivery_point_id}` channel
- Trade tape widget → `trades` channel
- News widget → `news` channel

### Estimated Effort

| Component | Estimate |
|-----------|----------|
| react-grid-layout integration + widget wrapper system | 2-3 days |
| TradingView Advanced Charts embed + custom datafeed | 3-4 days |
| Widget types (8 widgets, most reuse existing components) | 3-4 days |
| Dashboard persistence (model + API + frontend save/load) | 1-2 days |
| Dashboard management UI (create, rename, switch, delete) | 1 day |
| Polish, testing, responsive behavior | 2-3 days |
| **Total** | **~2-3 weeks** |

### Dependencies

- `react-grid-layout` npm package
- TradingView Advanced Charts library (or lightweight `lightweight-charts` as alternative)
- Backend: DashboardLayout model + migration + CRUD router
- WebSocket upgrade (optional, SSE works for v1)

### Key Decisions Deferred

1. **TradingView licensing** — free tier has "Powered by TradingView" branding. Paid tier removes it. Decision: start with free, upgrade when revenue justifies.
2. **Mobile support** — react-grid-layout supports responsive breakpoints but the experience degrades on phones. Decision: desktop-first, tablet acceptable, phone deferred.
3. **Shared dashboards** — can users share layouts with teammates? Decision: deferred to v2, start with per-user only.
4. **Default dashboard templates** — pre-built "Buyer Overview", "Supplier Monitor", "Multi-Fuel Trader" layouts. Decision: build 2-3 templates after the widget system works.

---

## Comparison: Build Approaches

| Approach | Effort | Quality | Maintenance |
|----------|--------|---------|-------------|
| **A: From scratch (Chart.js + react-grid-layout)** | 3-4 weeks | 70% of Braemar | High — charting is hard |
| **B: TradingView + react-grid-layout (recommended)** | 2-3 weeks | 85% of Braemar | Low — TradingView handles charts |
| **C: OpenFin/Finsemble desktop container** | 4-6 weeks | 95% of Braemar | Medium — platform lock-in |

**Recommendation: Option B** — gets us 85% of Braemar quality at 50% of the effort. TradingView is the industry standard (Braemar uses it). react-grid-layout is proven at scale (Grafana).

---

*Confidential — Verdaxis platform design brief. Not for distribution.*
