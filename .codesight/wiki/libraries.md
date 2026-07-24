# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**33 library files** across 8 modules

## Utils (14 files)

- `src/utils/tradeAnalytics.ts` — isActiveTradeStatus, isCompletedTradeStatus, isConfirmedLikeTrade, normalizeTradeLifecycleStatus, tradeDisplayQuantityMt, tradeDisplayPricePerMt, …
- `src/utils/availabilityWindow.ts` — normalizeAvailabilityWindow, compareAvailabilityWindows, formatAvailabilityWindow, formatAvailabilityWindowPeriod, getAvailabilityWindowOptions, getAvailabilityWindowSummary, …
- `src/utils/marketActivity.ts` — isDemoMarketActivity, describeMarketActivity, describeForwardCurveSignal, marketActivityTextClass, marketActivityBadgeClass, MarketActivityDescriptor, …
- `src/utils/marketProducts.ts` — isMarketplaceProductFilter, getMarketplaceProductOption, getMarketplaceProductValue, getMarketplaceFuelType, getMarketplaceProductLabel, MarketplaceProductOption, …
- `src/utils/fuel.ts` — getFuelRowClasses, getFuelBadgeClasses, getFuelStickyBg, getFuelChipClasses, getStatusConfig, formatExpiry, …
- `src/utils/watchlist.ts` — getWatchlistSliceKeyFromParts, getWatchlistSliceKey, formatWatchlistSliceLabel, describeWatchlistEvent, getWatchlistEventActivity, getLatestEventForSlice, …
- `src/utils/complianceEstimator.ts` — estimateCompliancePlanning, FuelAssumption, ComplianceEstimatorInput, ComplianceEstimatorResult, GREEN_FUEL_ASSUMPTIONS, DEFAULT_COMPLIANCE_ESTIMATOR_INPUT
- `src/utils/marketProduct.ts` — formatMarketProduct, getProductDisplayName, getProductDisplayNameFromReference, getOrderDisplayName, ProductReference
- `src/utils/navigationPerformance.ts` — recordDashboardNavigationStart, recordDashboardContentReady, getDashboardNavigationEventName, DashboardNavigationMetric
- `src/utils/buyerMapMarket.ts` — computePortMarketData, PortMarketRow, PortMarketData
- `src/utils/sliceUrl.ts` — sliceToPath, parseSlicePath, MarketSlice
- `src/utils/tradingPorts.ts` — normalizeTradingPortName, isApprovedTradingPortName, filterApprovedTradingPorts
- `src/utils/curveChart.ts` — serializeChartTime, availabilityWindowToChartTime
- `src/utils/marketPorts.ts` — resolveApprovedMapPorts, filterPortsByActiveDeliveryPoints

## Services (6 files)

- `src/services/analytics.ts` — normalizeAnalyticsPath, createAnalytics, routeFamilyFromPath, navigationLatencyBucket, createReliabilityReporter, AnalyticsEventMap, …
- `src/services/api.ts` — mapPortResponse, isAbortError, PaginatedResult, ProductUsageResponse, ProductUsagePeriod, ProductUsageStatus, …
- `src/services/authToken.ts` — getAccessToken, setAccessToken, clearAccessToken, refreshSession, refreshAccessToken, RefreshOutcome
- `src/services/ai-engine/cache.ts` — getCachedData, setCachedData, clearCache
- `src/services/backendAvailability.ts` — isBackendUnavailableStatus, notifyBackendUnavailable, BACKEND_UNAVAILABLE_EVENT
- `src/services/ai-engine/generators.ts` — analyzeRisk

## Hooks (5 files)

- `src/hooks/useProductAnalyticsFilters.ts` — parseProductAnalyticsFilters, serializeProductAnalyticsFilters, useProductAnalyticsFilters, ProductAnalyticsFilters, AnalyticsPeriod, ANALYTICS_TABS, …
- `src/hooks/useLocalePath.ts` — useLocalePath
- `src/hooks/useNamespace.ts` — useNamespace
- `src/hooks/useSSE.ts` — useSSE
- `src/hooks/useWatchlist.ts` — useWatchlist

## Data (3 files)

- `src/data/calculatorDefaults.ts` — calculateVoyage, CalculatorInputs, VoyageResult, defaultInputs
- `src/data/educationArticles.ts` — getEducationArticles, EducationArticle, educationArticles
- `src/data/fuelPrices.ts` — fetchFuelPrices, FuelPrice

## Scripts (2 files)

- `scripts/smoke_navigation.py` — static_server, get_auth_config, percentile, classify_cause, navigation_init_script, page_url, …
- `scripts/geocode_projects.py` — parse_cod_year, load_cache, save_cache, geocode, main

## I18n.ts (1 files)

- `src/i18n.ts` — isSupportedLang, loadNamespace, SupportedLang, SUPPORTED_LANGS

## Map (1 files)

- `src/map/addEcaLayers.ts` — addEcaLayers, setEcaLayersVisible

## Utils.ts (1 files)

- `src/utils.ts` — createCustomIcon, calculateHeading, getArbitrageRoute, formatTierLabel

---
_Back to [overview.md](./overview.md)_