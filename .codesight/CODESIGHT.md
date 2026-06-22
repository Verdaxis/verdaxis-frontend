# verdaxis-exchange — AI Context Map

> **Stack:** raw-http | none | react | typescript

> 34 routes | 28 models | 114 components | 16 lib files | 4 env vars | 1 middleware | 3% test coverage
> **Token savings:** this file is ~7,000 tokens. Without it, AI exploration would cost ~79,700 tokens. **Saves ~72,700 tokens per conversation.**
> **Last scanned:** 2026-04-28 11:18 — re-run after significant changes

---

# Routes

## CRUD Resources

- **`/api/quotes`** GET | POST | GET/:id | PATCH/:id → Quote
- **`/api/listings`** GET | POST | GET/:id | PUT/:id | DELETE/:id → Listing

## Other Routes

- `PUT` `/api/auth/approve/:user_id` params(user_id) → out: UserResponse [auth]
- `GET` `/api/auth/me` → out: UserResponse [auth]
- `PUT` `/api/auth/switch-role/:target_role` params(target_role) → out: Token [auth]
- `GET` `/api/ports` → out: PortResponse[] ✓
- `GET` `/api/ports/:port_id` params(port_id) → out: PortResponse
- `GET` `/api/vessels` → out: VesselResponse[]
- `GET` `/api/vessels/:vessel_id` params(vessel_id) → out: VesselResponse
- `GET` `/api/inventory` → out: InventoryResponse[]
- `POST` `/api/inventory` → in: InventoryCreate, out: InventoryResponse
- `GET` `/api/compliance/ledger` → out: ComplianceLedgerResponse[]
- `POST` `/api/compliance/verify`
- `POST` `/api/ai/chat` → in: Body_chat_api_ai_chat_post
- `GET` `/api/listings/aggregated` → out: AggregatedListingResponse[] [listings]
- `GET` `/api/listings/my` → out: PublicListingSupplierResponse[] [listings]
- `GET` `/api/listings/regions/list` → out: array [listings]
- `GET` `/api/listings/fuel-types/list` → out: array [listings]
- `POST` `/api/rfq/request` → in: RFQRequestCreate, out: RFQMatchResponse [rfq]
- `GET` `/api/rfq/my-requests` → out: RFQMatchDetailResponse[] [rfq]
- `GET` `/api/rfq/incoming` → out: RFQMatchDetailResponse[] [rfq]
- `PUT` `/api/rfq/:match_id/respond` params(match_id) → in: RFQMatchUpdate, out: RFQMatchResponse [rfq]
- `PUT` `/api/rfq/:match_id/complete` params(match_id) → in: RFQMatchComplete, out: RFQMatchResponse [rfq]
- `GET` `/api/rfq/admin/commissions` → out: CommissionResponse[] [rfq]
- `GET` `/api/rfq/admin/commissions/summary` → out: CommissionSummary [rfq]
- `PUT` `/api/rfq/admin/commissions/:commission_id` params(commission_id) → in: CommissionUpdate, out: CommissionResponse [rfq]
- `GET` `/` ✓
- `GET` `/health`

---

# Schema

### AggregatedListingResponse
- region: string (required)
- fuel_type: string (required)
- min_price: string (required)
- max_price: string (required)
- total_quantity: string (required)
- listing_count: integer (required)

### Body_chat_api_ai_chat_post
- message: string (required)
- history: object[]

### Body_verify_document_api_compliance_verify_post
- file: string(binary) (required)

### CommissionResponse
- id: string(uuid) (required, uuid)
- match_id: string(uuid) (required, uuid)
- amount_usd: string (required)
- status: CommissionStatus (required)
- invoice_number: unknown
- invoice_date: unknown
- payment_date: unknown
- created_at: string(date-time) (required)

### CommissionSummary
- total_pending_usd: string (required)
- total_invoiced_usd: string (required)
- total_paid_usd: string (required)
- pending_count: integer (required)
- invoiced_count: integer (required)
- paid_count: integer (required)

### CommissionUpdate
- status: unknown
- invoice_number: unknown
- invoice_date: unknown
- payment_date: unknown
- notes: unknown

### ComplianceLedgerResponse
- transaction_type: string (required)
- amount: number (required)
- currency: string
- units: unknown
- description: unknown
- reference_id: unknown
- id: string(uuid) (required, uuid)
- organization_id: unknown
- created_at: string(date-time) (required)

### HTTPValidationError
- detail: ValidationError[]

### InventoryCreate
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: number (required)
- incoming_stock_mt: number
- reserved_stock_mt: number
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean

### InventoryResponse
- port_id: string (required)
- fuel_type: FuelType (required)
- product_name: unknown
- current_stock_mt: number (required)
- incoming_stock_mt: number
- reserved_stock_mt: number
- price_per_mt_usd: unknown
- energy_density_mj_kg: unknown
- is_certified: boolean
- id: string(uuid) (required, uuid)
- supplier_id: string(uuid) (required, uuid)
- updated_at: string(date-time) (required)

### PortIntelligenceBase
- congestion_level: unknown
- methanol_price_avg: unknown
- biofuel_price_avg: unknown
- captured_at: string(date-time) (required)

### PortResponse
- id: string (required)
- name: string (required)
- country: string (required)
- location: unknown
- timezone: unknown
- is_active: boolean
- lat: unknown
- lng: unknown
- intelligence: unknown

### PublicListingCreate
- region: string (required)
- fuel_type: string (required)
- fuel_grade: FuelGrade
- quantity_mt: unknown (required)
- price_per_mt_usd: unknown (required)
- availability_window: AvailabilityWindow
- certifications: string[]
- tier_label: TierLabel

### PublicListingResponse
- id: string(uuid) (required, uuid)
- region: string (required)
- fuel_type: string (required)
- fuel_grade: FuelGrade (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: AvailabilityWindow (required)
- tier_label: TierLabel (required)
- certifications: string[] (required)
- is_verdaxis_verified: boolean (required)
- status: ListingStatus (required)
- created_at: string(date-time) (required)

### PublicListingSupplierResponse
- id: string(uuid) (required, uuid)
- region: string (required)
- fuel_type: string (required)
- fuel_grade: FuelGrade (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- availability_window: AvailabilityWindow (required)
- tier_label: TierLabel (required)
- certifications: string[] (required)
- is_verdaxis_verified: boolean (required)
- status: ListingStatus (required)
- created_at: string(date-time) (required)
- supplier_id: string(uuid) (required, uuid)
- match_count: integer

### PublicListingUpdate
- quantity_mt: unknown
- price_per_mt_usd: unknown
- availability_window: unknown
- status: unknown
- certifications: unknown

### QuoteCreate
- vessel_id: string(uuid) (required, uuid)
- port_id: string (required)
- fuel_type: FuelType (required)
- quantity_mt: number (required)
- delivery_window_start: unknown
- delivery_window_end: unknown

### QuoteResponse
- vessel_id: string(uuid) (required, uuid)
- port_id: string (required)
- fuel_type: FuelType (required)
- quantity_mt: number (required)
- delivery_window_start: unknown
- delivery_window_end: unknown
- id: string(uuid) (required, uuid)
- buyer_id: unknown
- status: QuoteStatus (required)
- awarded_supplier_id: unknown
- final_price_usd: unknown
- final_price_per_mt: unknown
- created_at: string(date-time) (required)
- updated_at: string(date-time) (required)

### QuoteUpdate
- status: unknown
- final_price_usd: unknown
- final_price_per_mt: unknown
- awarded_supplier_id: unknown

### RFQMatchComplete
- final_quantity_mt: unknown (required)
- final_price_per_mt: unknown (required)

### RFQMatchDetailResponse
- id: string(uuid) (required, uuid)
- listing_id: string(uuid) (required, uuid)
- buyer_id: string(uuid) (required, uuid)
- status: MatchStatus (required)
- buyer_accepted_terms_at: string(date-time) (required)
- created_at: string(date-time) (required)
- region: string (required)
- fuel_type: string (required)
- fuel_grade: FuelGrade (required)
- quantity_mt: string (required)
- price_per_mt_usd: string (required)
- supplier_id: string(uuid) (required, uuid)
- supplier_name: string (required)
- buyer_name: string (required)
- final_quantity_mt: unknown
- final_price_per_mt: unknown
- final_total_usd: unknown

### RFQMatchResponse
- id: string(uuid) (required, uuid)
- listing_id: string(uuid) (required, uuid)
- buyer_id: string(uuid) (required, uuid)
- status: MatchStatus (required)
- buyer_accepted_terms_at: string(date-time) (required)
- created_at: string(date-time) (required)

### RFQMatchUpdate
- status: MatchStatus (required)

### RFQRequestCreate
- listing_id: string(uuid) (required, uuid)
- accepted_terms: boolean (required)

### Token
- access_token: string (required)
- token_type: string (required)

### UserResponse
- email: string(email) (required)
- first_name: unknown
- last_name: unknown
- role: UserRole (required)
- id: string(uuid) (required, uuid)
- status: UserStatus (required)
- organization_id: unknown

### ValidationError
- loc: any[] (required)
- msg: string (required)
- type: string (required)

### VesselResponse
- name: string (required)
- imo_number: string (required)
- vessel_type: unknown
- flag_state: unknown
- dwt: unknown
- cii_rating: unknown
- eu_ets_status: unknown
- fueleu_status: unknown
- current_location: unknown
- previous_location: unknown
- lat: unknown
- lng: unknown
- prev_lat: unknown
- prev_lng: unknown
- id: string (required)
- organization_id: unknown
- updated_at: string(date-time) (required)

---

# Components

- **ScrollToTop** — `src/App.tsx`
- **ActivityFeed** — `src/components/ActivityFeed.tsx`
- **BuyerMap** — props: onPortSelect, onNavigate, onOrderClick — `src/components/BuyerMap.tsx`
- **CommandCenter** — props: viewMode, onNavigate, openOrderId — `src/components/CommandCenter.tsx`
- **BuyerDashboard** — `src/components/CommandCenter.tsx`
- **SupplierDashboard** — `src/components/CommandCenter.tsx`
- **Compliance** — `src/components/Compliance.tsx`
- **DataAnalytics** — `src/components/DataAnalytics.tsx`
- **ErrorFallback** — props: fallback — `src/components/ErrorBoundary.tsx`
- **Fleet** — `src/components/Fleet.tsx`
- **ForwardCurve** — props: initialProductId, fuelType, deliveryPointName, onPeriodClick — `src/components/ForwardCurve.tsx`
- **GuidedTutorial** — props: viewMode — `src/components/GuidedTutorial.tsx`
- **LanguageSelector** — props: onLanguageChange, variant — `src/components/LanguageSelector.tsx`
- **Layout** — props: viewMode, onSwitchView, currentPage, onNavigate, onPrimaryAction — `src/components/Layout.tsx`
- **MarketFeed** — props: viewMode, onNavigate — `src/components/MarketFeed.tsx`
- **MarketTerminal** — props: onNavigate — `src/components/MarketTerminal.tsx`
- **Marketplace** — props: initialPort — `src/components/Marketplace.tsx`
- **MatchSuggestions** — props: onViewTrade, onCountChange, onNavigate — `src/components/MatchSuggestions.tsx`
- **MyTrades** — `src/components/MyTrades.tsx`
- **NeedsAttentionFeed** — props: trades, viewMode, onNavigate, onConfirmTrade, onPostOrder — `src/components/NeedsAttentionFeed.tsx`
- **NewsCard** — `src/components/NewsCard.tsx`
- **NewsFeed** — `src/components/NewsFeed.tsx`
- **OrderBook** — props: fuelType, region, onPriceClick, onInstantTrade — `src/components/OrderBook.tsx`
- **OrderPlaceModal** — props: isOpen, onClose, side, prefillFuelType, prefillRegion, prefillPrice — `src/components/OrderPlaceModal.tsx`
- **PriceAlertManager** — props: isOpen, onClose — `src/components/PriceAlertManager.tsx`
- **RFQPanel** — props: role, sortBy, onSortChange — `src/components/RFQPanel.tsx`
- **ReferralsTab** — `src/components/ReferralsTab.tsx`
- **Settings** — props: viewMode — `src/components/Settings.tsx`
- **Stats** — `src/components/Stats.tsx`
- **SupplierAnalytics** — `src/components/SupplierAnalytics.tsx`
- **SupplierDemandFeed** — props: onNavigate — `src/components/SupplierDemandFeed.tsx`
- **SupplierInventory** — `src/components/SupplierInventory.tsx`
- **SupplierListingConsole** — `src/components/SupplierListingConsole.tsx`
- **SupplierQuotes** — `src/components/SupplierQuotes.tsx`
- **SupplierStats** — `src/components/SupplierStats.tsx`
- **TradeHistoryPage** — `src/components/TradeHistoryPage.tsx`
- **TradeNotifier** — `src/components/TradeNotifier.tsx`
- **TradeTape** — props: fuelType, region — `src/components/TradeTape.tsx`
- **Training** — `src/components/Training.tsx`
- **WatchlistPage** — `src/components/WatchlistPage.tsx`
- **AdminDashboard** — `src/components/admin/AdminDashboard.tsx`
- **Copilot** — props: viewMode, currentPage — `src/components/ai/Copilot.tsx`
- **CreateBidModal** — props: onSubmit, onCancel, isLoading — `src/components/buyer/CreateBidModal.tsx`
- **ComplianceDashboard** — props: onOpenLedger — `src/components/compliance/ComplianceDashboard.tsx`
- **ComplianceDataInput** — `src/components/compliance/ComplianceDataInput.tsx`
- **ComplianceLedgerModal** — props: onClose — `src/components/compliance/ComplianceLedgerModal.tsx`
- **ComplianceTracing** — `src/components/compliance/ComplianceTracing.tsx`
- **VesselDetailModal** — props: vessel, onClose — `src/components/fleet/VesselDetailModal.tsx`
- **Header** — props: viewMode, onSwitchView, onOpenMobileSidebar — `src/components/layout/Header.tsx`
- **IntelligencePanel** — props: isOpen, onClose, selectedPort, onPortSelect, onNavigate, ports, onArbitrageUpdate — `src/components/map/IntelligencePanel.tsx`
- **MapLegend** — `src/components/map/MapLegend.tsx`
- **MarketWatchTicker** — props: isPanelOpen, onOpenPanel — `src/components/map/MarketWatchTicker.tsx`
- **VesselMarkers** — `src/components/map/VesselMarkers.tsx`
- **NotificationBell** — `src/components/notifications/NotificationBell.tsx`
- **NotificationList** — props: onClose — `src/components/notifications/NotificationList.tsx`
- **DataOcean** — props: style — `src/components/public/DataOcean.tsx`
- **HeroSection** — `src/components/public/HeroSection.tsx`
- **LanguageRedirect** — `src/components/public/LanguageRedirect.tsx`
- **LegacyRedirect** — `src/components/public/LegacyRedirect.tsx`
- **PilotApplicationForm** — `src/components/public/PilotApplicationForm.tsx`
- **PriceTicker** — `src/components/public/PriceTicker.tsx`
- **PublicFooter** — `src/components/public/PublicFooter.tsx`
- **PublicLanguageWrapper** — `src/components/public/PublicLanguageWrapper.tsx`
- **PublicLayout** — `src/components/public/PublicLayout.tsx`
- **PublicNav** — `src/components/public/PublicNav.tsx`
- **Reveal** — props: delay, y, className, style — `src/components/public/motionUtils.tsx`
- **HoverCard** — props: style, className — `src/components/public/motionUtils.tsx`
- **HoverButton** — props: style — `src/components/public/motionUtils.tsx`
- **StaggerGrid** — props: style, className — `src/components/public/motionUtils.tsx`
- **StaggerItem** — props: style, className — `src/components/public/motionUtils.tsx`
- **LeafDecor** — props: style, color — `src/components/public/motionUtils.tsx`
- **DotGrid** — props: style, color — `src/components/public/motionUtils.tsx`
- **CircuitLines** — props: style, color — `src/components/public/motionUtils.tsx`
- **GradientOrb** — props: style, color, size — `src/components/public/motionUtils.tsx`
- **RFQOfferAlert** — props: onNavigateToRFQ — `src/components/rfq/RFQOfferAlert.tsx`
- **CreateListingModal** — props: onSubmit, onCancel, isLoading, marketData — `src/components/supplier/CreateListingModal.tsx`
- **CreateQuoteModal** — props: requestId, onClose, onSubmit — `src/components/supplier/CreateQuoteModal.tsx`
- **OrderbookDepth** — props: bids, asks, fuelType, region — `src/components/trading/OrderbookDepth.tsx`
- **AuthProvider** — `src/context/AuthContext.tsx`
- **CopilotProvider** — `src/context/CopilotContext.tsx`
- **NotificationProvider** — `src/context/NotificationContext.tsx`
- **ThemeProvider** — `src/context/ThemeContext.tsx`
- **TutorialProvider** — `src/context/TutorialContext.tsx`
- **COUNTRIES** — props: value, onChange, placeholder, searchPlaceholder, noResults — `src/pages/CreateOrganizationPage.tsx`
- **ForgotPasswordPage** — `src/pages/ForgotPasswordPage.tsx`
- **InvitePage** — `src/pages/InvitePage.tsx`
- **KycPage** — `src/pages/KycPage.tsx`
- **LoginPage** — `src/pages/LoginPage.tsx`
- **OnboardingPage** — `src/pages/OnboardingPage.tsx`
- **RESEND_COOLDOWN** — `src/pages/RegisterPage.tsx`
- **ResetPasswordPage** — `src/pages/ResetPasswordPage.tsx`
- **VerifyEmailPage** — `src/pages/VerifyEmailPage.tsx`
- **BuyerUseCasePage** — `src/pages/public/BuyerUseCasePage.tsx`
- **ComplianceInfoPage** — `src/pages/public/ComplianceInfoPage.tsx`
- **EducationArticlePage** — `src/pages/public/EducationArticlePage.tsx`
- **EducationPage** — `src/pages/public/EducationPage.tsx`
- **EnergyCalculatorPage** — `src/pages/public/EnergyCalculatorPage.tsx`
- **FinancierUseCasePage** — `src/pages/public/FinancierUseCasePage.tsx`
- **FuelCoveragePage** — `src/pages/public/FuelCoveragePage.tsx`
- **GovernancePage** — `src/pages/public/GovernancePage.tsx`
- **HowItWorksPage** — `src/pages/public/HowItWorksPage.tsx`
- **LandingPage** — `src/pages/public/LandingPage.tsx`
- **NotFoundPage** — `src/pages/public/NotFoundPage.tsx`
- **PartnerLandingPage** — `src/pages/public/PartnerLandingPage.tsx`
- **PartnerShowcasePage** — `src/pages/public/PartnerShowcasePage.tsx`
- **PartnersPage** — `src/pages/public/PartnersPage.tsx`
- **PilotPage** — `src/pages/public/PilotPage.tsx`
- **PrivacyPage** — `src/pages/public/PrivacyPage.tsx`
- **ProducerMapPage** — `src/pages/public/ProducerMapPage.tsx`
- **ProducerUseCasePage** — `src/pages/public/ProducerUseCasePage.tsx`
- **RoadmapPage** — `src/pages/public/RoadmapPage.tsx`
- **TermsPage** — `src/pages/public/TermsPage.tsx`
- **TraderUseCasePage** — `src/pages/public/TraderUseCasePage.tsx`
- **AllProviders** — `src/tests/test-utils.tsx`

---

# Libraries

- `scripts/geocode_projects.py`
  - function parse_cod_year: (cod_estimated, cod_announced) -> int | None
  - function load_cache: () -> dict
  - function save_cache: (cache)
  - function geocode: (city, country) -> tuple[float, float] | None
  - function main: ()
- `src/data/calculatorDefaults.ts`
  - function calculateVoyage: (energyDensity, fuelPrice, dailyConsumption, inputs) => VoyageResult
  - interface CalculatorInputs
  - interface VoyageResult
  - const defaultInputs: CalculatorInputs
- `src/data/educationArticles.ts`
  - function getEducationArticles: () => EducationArticle[]
  - interface EducationArticle
  - const educationArticles: EducationArticle[]
- `src/hooks/useDemoMode.ts` — function useDemoMode: () => [boolean, () => void], function isDemoMode: () => boolean
- `src/hooks/useLocalePath.ts` — function useLocalePath: () => void
- `src/hooks/useNamespace.ts` — function useNamespace: (ns) => void
- `src/hooks/useSSE.ts` — function useSSE: (channel, onEvent, enabled) => void
- `src/hooks/useWatchlist.ts` — function useWatchlist: () => UseWatchlistResult
- `src/i18n.ts`
  - function isSupportedLang: (lang) => lang is SupportedLang
  - function loadNamespace: (ns) => Promise<void>
  - type SupportedLang
  - const SUPPORTED_LANGS
- `src/services/ai-engine/cache.ts` — function getCachedData, function setCachedData
- `src/services/ai-engine/chat.ts`
  - function chatWithCopilot
  - interface ChatResponse
  - const SYSTEM_INSTRUCTION
- `src/services/ai-engine/generators.ts`
  - function generateMarketNarrative
  - function generateArbitrageInsight
  - function analyzeRisk
  - function fetchLiveMarketData
  - function performWebSearch
  - interface MarketDataResult
- `src/utils/fuel.ts`
  - function getFuelRowClasses: (fuelType) => string
  - function getFuelBadgeClasses: (fuelType) => string
  - function getFuelStickyBg: (fuelType) => string
  - function getFuelChipClasses: (fuelType) => string
  - function getStatusConfig: (status) => StatusConfig
  - function formatExpiry: (order) => React.ReactNode
  - _...2 more_
- `src/utils/marketProduct.ts`
  - function getProductDisplayName: (product) => string
  - function getProductDisplayNameFromReference: (reference, products) => string
  - type ProductReference
- `src/utils/tradeAnalytics.ts`
  - function tradeSliceKey: (trade) => string
  - function buildTradePerformanceModel: (trades, referenceBySlice, number>) => TradePerformanceModel
  - interface VolumeByFuel
  - interface MonthlyTradeCount
  - interface FuelComparison
  - interface TradePerformanceModel
- `src/utils.ts`
  - function createCustomIcon
  - function calculateHeading
  - function getArbitrageRoute
  - function formatTierLabel

---

# Config

## Environment Variables

- `VITE_API_URL` (has default) — .env.example
- `VITE_AUTHENTIK_CLIENT_ID` (has default) — .env.example
- `VITE_AUTHENTIK_URL` (has default) — .env.example
- `VITE_ENABLE_RFQ` **required** — src/components/Marketplace.tsx

## Config Files

- `.env.example`
- `Dockerfile`
- `tailwind.config.js`
- `tsconfig.json`
- `vite.config.ts`

## Key Dependencies

- react: ^19.2.0

---

# Middleware

## auth
- authentik-guide — `docs/authentik-guide.md`

---

# Dependency Graph

## Most Imported Files (change these carefully)

- `src/types.ts` — imported by **62** files
- `src/hooks/useNamespace.ts` — imported by **62** files
- `src/services/api.ts` — imported by **34** files
- `src/services/config.ts` — imported by **19** files
- `src/context/AuthContext.tsx` — imported by **15** files
- `src/i18n.ts` — imported by **9** files
- `src/context/CopilotContext.tsx` — imported by **8** files
- `src/components/Toast.tsx` — imported by **6** files
- `src/context/ThemeContext.tsx` — imported by **5** files
- `src/components/ui/Tooltip.tsx` — imported by **5** files
- `src/context/NotificationContext.tsx` — imported by **4** files
- `src/context/TutorialContext.tsx` — imported by **4** files
- `src/services/ai-engine/generators.ts` — imported by **4** files
- `src/components/OrderPlaceModal.tsx` — imported by **3** files
- `src/components/ui/ConfirmModal.tsx` — imported by **3** files
- `src/hooks/useSSE.ts` — imported by **3** files
- `src/data.ts` — imported by **3** files
- `src/services/ai.ts` — imported by **3** files
- `src/components/ui/MarkdownRenderer.tsx` — imported by **3** files
- `src/hooks/useLocalePath.ts` — imported by **3** files

## Import Map (who imports what)

- `src/types.ts` ← `src/App.tsx`, `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/DataAnalytics.tsx`, `src/components/Fleet.tsx` +57 more
- `src/hooks/useNamespace.ts` ← `src/components/ActivityFeed.tsx`, `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/Compliance.tsx`, `src/components/Fleet.tsx` +57 more
- `src/services/api.ts` ← `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/DataAnalytics.tsx`, `src/components/Fleet.tsx`, `src/components/ForwardCurve.tsx` +29 more
- `src/services/config.ts` ← `src/components/ActivityFeed.tsx`, `src/components/RFQPanel.tsx`, `src/components/ReferralsTab.tsx`, `src/components/Settings.tsx`, `src/components/rfq/RFQOfferAlert.tsx` +14 more
- `src/context/AuthContext.tsx` ← `src/App.tsx`, `src/components/Layout.tsx`, `src/components/Marketplace.tsx`, `src/components/MyTrades.tsx`, `src/components/RFQPanel.tsx` +10 more
- `src/i18n.ts` ← `src/components/LanguageSelector.tsx`, `src/components/public/LanguageRedirect.tsx`, `src/components/public/LegacyRedirect.tsx`, `src/components/public/PublicLanguageWrapper.tsx`, `src/components/public/PublicNav.tsx` +4 more
- `src/context/CopilotContext.tsx` ← `src/components/BuyerMap.tsx`, `src/components/CommandCenter.tsx`, `src/components/Fleet.tsx`, `src/components/MarketTerminal.tsx`, `src/components/Marketplace.tsx` +3 more
- `src/components/Toast.tsx` ← `src/App.tsx`, `src/components/ForwardCurve.tsx`, `src/components/MyTrades.tsx`, `src/components/PriceAlertManager.tsx`, `src/components/TradeHistoryPage.tsx` +1 more
- `src/context/ThemeContext.tsx` ← `src/App.tsx`, `src/components/BuyerMap.tsx`, `src/components/ForwardCurve.tsx`, `src/components/MarketTerminal.tsx`, `src/components/Settings.tsx`
- `src/components/ui/Tooltip.tsx` ← `src/components/BuyerMap.tsx`, `src/components/SupplierQuotes.tsx`, `src/components/fleet/VesselDetailModal.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Sidebar.tsx`

---

# Test Coverage

> **3%** of routes and models are covered by tests
> 24 test files found

## Covered Routes

- GET:/api/ports
- GET:/

---

_Generated by [codesight](https://github.com/Houseofmvps/codesight) — see your codebase clearly_