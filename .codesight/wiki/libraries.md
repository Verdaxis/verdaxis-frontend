# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**26 library files** across 7 modules

## Utils (10 files)

- `src/utils/tradeAnalytics.ts` — isActiveTradeStatus, isCompletedTradeStatus, isConfirmedLikeTrade, normalizeTradeLifecycleStatus, tradeDisplayQuantityMt, tradeDisplayPricePerMt, …
- `src/utils/marketProducts.ts` — isMarketplaceProductFilter, getMarketplaceProductOption, getMarketplaceProductValue, getMarketplaceFuelType, getMarketplaceProductLabel, MarketplaceProductOption, …
- `src/utils/availabilityWindow.ts` — normalizeAvailabilityWindow, compareAvailabilityWindows, formatAvailabilityWindow, formatAvailabilityWindowPeriod, getAvailabilityWindowOptions, getAvailabilityWindowSummary, …
- `src/utils/fuel.ts` — getFuelRowClasses, getFuelBadgeClasses, getFuelStickyBg, getFuelChipClasses, getStatusConfig, formatExpiry, …
- `src/utils/watchlist.ts` — getWatchlistSliceKeyFromParts, getWatchlistSliceKey, formatWatchlistSliceLabel, describeWatchlistEvent, getLatestEventForSlice, getLatestEventForTarget
- `src/utils/marketProduct.ts` — formatMarketProduct, getProductDisplayName, getProductDisplayNameFromReference, getOrderDisplayName, ProductReference
- `src/utils/buyerMapMarket.ts` — isGreenFuel, computePortMarketData, PortMarketRow, PortMarketData
- `src/utils/navigationPerformance.ts` — recordDashboardNavigationStart, recordDashboardContentReady, getDashboardNavigationEventName, DashboardNavigationMetric
- `src/utils/curveChart.ts` — serializeChartTime, availabilityWindowToChartTime
- `src/utils/marketPorts.ts` — filterPortsByActiveDeliveryPoints

## Hooks (5 files)

- `src/hooks/useDemoMode.ts` — useDemoMode, isDemoMode
- `src/hooks/useLocalePath.ts` — useLocalePath
- `src/hooks/useNamespace.ts` — useNamespace
- `src/hooks/useSSE.ts` — useSSE
- `src/hooks/useWatchlist.ts` — useWatchlist

## Services (5 files)

- `src/services/ai-engine/generators.ts` — generateMarketNarrative, generateArbitrageInsight, analyzeRisk, fetchLiveMarketData, performWebSearch, MarketDataResult
- `src/services/api.ts` — mapPortResponse, __resetApiReadCachesForTests, PaginatedResult, api
- `src/services/ai-engine/chat.ts` — chatWithCopilot, ChatResponse, SYSTEM_INSTRUCTION
- `src/services/authToken.ts` — getAccessToken, setAccessToken, clearAccessToken
- `src/services/ai-engine/cache.ts` — getCachedData, setCachedData

## Data (2 files)

- `src/data/calculatorDefaults.ts` — calculateVoyage, CalculatorInputs, VoyageResult, defaultInputs
- `src/data/educationArticles.ts` — getEducationArticles, EducationArticle, educationArticles

## Scripts (2 files)

- `scripts/smoke_navigation.py` — static_server, get_auth_config, percentile, classify_cause, navigation_init_script, page_url, …
- `scripts/geocode_projects.py` — parse_cod_year, load_cache, save_cache, geocode, main

## I18n.ts (1 files)

- `src/i18n.ts` — isSupportedLang, loadNamespace, SupportedLang, SUPPORTED_LANGS

## Utils.ts (1 files)

- `src/utils.ts` — createCustomIcon, calculateHeading, getArbitrageRoute, formatTierLabel

---
_Back to [overview.md](./overview.md)_