# Gavin Feedback Implementation — Intel Map Restyle + AI News Feed

**Date:** 2026-03-25
**Status:** Approved
**Branch:** `feat/data-products` (production v1)

---

## Quick Wins (DONE)

1. ~~Tighten order book spreads~~ — zero crosses, realistic non-overlapping bid/ask ranges
2. ~~CI score on ASK rows in order book~~ — colored pill badge (green >85, amber 60-85, red <60)
3. ~~Notification badge~~ — subtle green dot replacing numeric count

---

## Feature A: Intel Map Restyle

### Vessel Markers
- Replace triangle markers with small ship silhouette SVGs (~16x12px)
- Color by fuel capability: green (dual-fuel methanol/ammonia), blue (LNG), gray (conventional)
- Rotate to heading if course data available
- Hover tooltip: vessel name, fuel type, CII grade

### Port Popups
- Click port → popup shows live best bid/ask per fuel type
- Data source: `GET /api/orderbook/aggregated?region={portName}`
- Table format: fuel type | best bid | best ask | order count
- "Trade at {port} →" button navigates to Marketplace with port pre-selected
- Empty fuel types omitted

### Port Circle Sizing
- Size by total open order volume at that port
- Border color by spread tightness: green (<5%), amber (5-15%), red (>15%)

### Files to Modify
- `src/components/BuyerMap.tsx` — main map component
- `src/components/map/VesselMarkers.tsx` — vessel icon rendering
- `src/components/map/IntelligencePanel.tsx` — port popup content
- Create: ship silhouette SVG asset

---

## Feature B: AI News Feed

### Backend — News Pipeline

**New service:** `app/services/news_feed.py`

RSS sources (6 feeds):
- TradeWinds (tradewindsnews.com/rss)
- Lloyd's List (lloydslist.com/LL/rss/)
- Ship & Bunker (shipandbunker.com/rss)
- Splash247 (splash247.com/feed/)
- The Maritime Executive (maritime-executive.com/rss)
- Hellenic Shipping News (hellenicshippingnews.com/feed/)

Processing pipeline:
1. Fetch RSS feeds via `feedparser` (pip install)
2. Deduplicate by URL
3. Each headline → Gemini Flash Lite (`gemini-flash-lite-latest`, key: `[revoked and removed]`)
   - Categorize: shipping | bunkers | regulation | carbon | commodities | markets
   - Relevance score 1-5 (to fuel trading / maritime compliance)
   - One-line summary if title is vague
4. Store in `news_items` table
5. Refresh every 15 minutes via background task in FastAPI lifespan

**New model:** `app/models/news.py`
```
NewsItem
  id: UUID
  title: str
  summary: str (nullable, from Gemini)
  source: str (feed name)
  source_url: str
  url: str (article link)
  category: str (shipping|bunkers|regulation|carbon|commodities|markets)
  relevance: int (1-5)
  published_at: datetime
  fetched_at: datetime
```

**New router:** `app/routers/news.py`
- `GET /api/news?limit=20&category=bunkers&min_relevance=3` — public, no auth needed

### Frontend — News Components

**Dashboard card** (`src/components/NewsCard.tsx`):
- Latest 5 headlines with source icon, category badge, relative timestamp
- "View all →" link expands or navigates

**Market tab panel** (`src/components/NewsFeed.tsx`):
- Compact vertical feed alongside Order Book on Marketplace Market tab
- 8-10 headlines, auto-refresh every 60s
- Category filter chips at top

**Styling:**
- Source favicons as 16px icons
- Category badges: green (bunkers), blue (shipping), amber (regulation), purple (carbon), gray (markets)
- Relative timestamps ("2h ago", "15m ago")
- Headlines truncated at 2 lines, click opens URL in new tab

---

## Remaining Gavin Items

4. **Market Terminal = supply-side curve only** — already correct in v1 (shows live bid/ask from order book). V2 branch has the 3-tier supply-side curve. No change needed for v1.
7. **Marketplace demo with functioning trade tape** — already working (E2E tested, 40 seeded trades populate the tape).

