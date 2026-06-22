# Libraries

> **Navigation aid.** Library inventory extracted via AST. Read the source files listed here before modifying exported functions.

**16 library files** across 7 modules

## Hooks (5 files)

- `src/hooks/useDemoMode.ts` — useDemoMode, isDemoMode
- `src/hooks/useLocalePath.ts` — useLocalePath
- `src/hooks/useNamespace.ts` — useNamespace
- `src/hooks/useSSE.ts` — useSSE
- `src/hooks/useWatchlist.ts` — useWatchlist

## Services (3 files)

- `src/services/ai-engine/generators.ts` — generateMarketNarrative, generateArbitrageInsight, analyzeRisk, fetchLiveMarketData, performWebSearch, MarketDataResult
- `src/services/ai-engine/chat.ts` — chatWithCopilot, ChatResponse, SYSTEM_INSTRUCTION
- `src/services/ai-engine/cache.ts` — getCachedData, setCachedData

## Utils (3 files)

- `src/utils/fuel.ts` — getFuelRowClasses, getFuelBadgeClasses, getFuelStickyBg, getFuelChipClasses, getStatusConfig, formatExpiry, …
- `src/utils/tradeAnalytics.ts` — tradeSliceKey, buildTradePerformanceModel, VolumeByFuel, MonthlyTradeCount, FuelComparison, TradePerformanceModel
- `src/utils/marketProduct.ts` — getProductDisplayName, getProductDisplayNameFromReference, ProductReference

## Data (2 files)

- `src/data/calculatorDefaults.ts` — calculateVoyage, CalculatorInputs, VoyageResult, defaultInputs
- `src/data/educationArticles.ts` — getEducationArticles, EducationArticle, educationArticles

## I18n.ts (1 files)

- `src/i18n.ts` — isSupportedLang, loadNamespace, SupportedLang, SUPPORTED_LANGS

## Scripts (1 files)

- `scripts/geocode_projects.py` — parse_cod_year, load_cache, save_cache, geocode, main

## Utils.ts (1 files)

- `src/utils.ts` — createCustomIcon, calculateHeading, getArbitrageRoute, formatTierLabel

---
_Back to [overview.md](./overview.md)_