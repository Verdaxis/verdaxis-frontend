# Customizable Trading Dashboard — Design Brief

**Date:** 2026-03-25
**Status:** Future Sprint
**Priority:** Phase 2/3
**Reference:** Braemar trading platform screenshots (March 2026)

---

## Vision

Build a Braemar-style customizable multi-panel trading workstation where users can arrange order books, charts, trade tape, and news feeds in a drag-and-drop layout. Each user saves their preferred dashboard configuration.

## Reference: What Braemar Does

From the screenshots analyzed:

- **Left panels:** Multiple order books (CAPE, PMAX, SMAX) as resizable/stackable grids — each showing a forward curve with bid/ask/qty columns per delivery period
- **Right panels:** TradingView-style candlestick/line charts with indicators (SMA, Volume), timeframe selectors (1h, 4h, D), and drawing tools
- **Bottom bar:** Trade tape (CLEARER/SCREEN tabs) + News feed with search
- **Top bar:** Dashboard selector ("Create Dashboard"), view toggles (Home, Chart, Grid, Dashboard)
- **Key UX:** Drag-and-drop panel layout, multiple instruments side-by-side, saved layouts, real-time price streaming with green/red flash

## Recommended Approach: TradingView Embed + react-grid-layout

### Why This Approach

TradingView's Advanced Charts widget handles the hardest 60% of the work (candlestick rendering, indicators, drawing tools, timeframe switching, responsive resizing). Braemar itself embeds TradingView — the TV logo is visible in their charts. We provide our own price data via TradingView's Datafeed API.

`react-grid-layout` (used by Grafana, Kibana, Metabase) handles drag-and-drop resizable panel arrangement with layout persistence.

### Architecture

```
DashboardBuilder (page)
├── DashboardToolbar
│   ├── Dashboard name + rename
│   ├── "Add Widget" button → widget picker modal
│   ├── "Save Layout" button
│   └── Dashboard switcher dropdown (named layouts)
├── ReactGridLayout (drag-and-drop container)
│   ├── Widget[] (each widget is a resizable panel)
│   │   ├── WidgetHeader (title, instrument selector, close button, drag handle)
│   │   └── WidgetContent (one of the widget types below)
│   └── Layout JSON (persisted per user in DB)
└── StatusBar (bottom)
    └── Connection status, last update time
```

### Widget Types

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

### TradingView Integration

- Use TradingView's **Advanced Charts** library (free tier available, or paid for white-label)
- Implement `IDatafeedChartApi` interface to feed our price data:
  - `resolveSymbol()` — map "METHANOL-SG" to our product+port combo
  - `getBars()` — return historical OHLCV from trade tape / reference prices
  - `subscribeBars()` — SSE-driven real-time bar updates
- Indicators available out of the box: SMA, EMA, MACD, RSI, Volume, Bollinger Bands
- Drawing tools (trend lines, fibonaccis) come free with TradingView

### Layout Persistence

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
