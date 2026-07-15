
import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
// Copilot removed per Gavin feedback — was unreliable and exposed API key in client bundle
import { NotificationProvider } from './context/NotificationContext';
import { TutorialProvider } from './context/TutorialContext';
import { GuidedTutorial } from './components/GuidedTutorial';
import LoginPage from './pages/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MobileDesktopGate } from './components/MobileDesktopGate';
import { ToastProvider } from './components/Toast';
import { TradeNotifier } from './components/TradeNotifier';
import { AnalyticsProvider } from './components/AnalyticsProvider';
import { analytics } from './services/analytics';
import RegisterPage from './pages/RegisterPage';
import { InvitePage } from './pages/InvitePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ForcePasswordChangePage from './pages/ForcePasswordChangePage';
import MaintenancePage from './pages/MaintenancePage';
import { OnboardingPage } from './pages/OnboardingPage';
import CreateOrganizationPage from './pages/CreateOrganizationPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import KycPage from './pages/KycPage';
import { Layout } from './components/Layout';
import { BuyerDashboard, SupplierDashboard } from './components/CommandCenter';
import { SupplierQuotes } from './components/SupplierQuotes';
import { DataAnalytics } from './components/DataAnalytics';
import { Training } from './components/Training';
import { Settings } from './components/Settings';
import { TradeHistoryPage } from './components/TradeHistoryPage';
import { ForwardCurveWorkspace } from './components/ForwardCurveWorkspace';
import { Marketplace } from './components/Marketplace';
import { WatchlistPage } from './components/WatchlistPage';
import { OrderPlaceModal } from './components/OrderPlaceModal';
import { ViewMode, Page, PAGE_SLUGS, Port } from './types';
import { MarketSlice, parseSlicePath, sliceToPath } from './utils/sliceUrl';
import { recordDashboardContentReady, recordDashboardNavigationStart } from './utils/navigationPerformance';
import { PublicLayout } from './components/public/PublicLayout';
import LanguageRedirect from './components/public/LanguageRedirect';
import PublicLanguageWrapper from './components/public/PublicLanguageWrapper';
import LegacyRedirect from './components/public/LegacyRedirect';
import { LandingPage } from './pages/public/LandingPage';
import { HowItWorksPage } from './pages/public/HowItWorksPage';
import { FuelCoveragePage } from './pages/public/FuelCoveragePage';
import { ComplianceInfoPage } from './pages/public/ComplianceInfoPage';
import { ProducerUseCasePage } from './pages/public/ProducerUseCasePage';
import { BuyerUseCasePage } from './pages/public/BuyerUseCasePage';
import { TraderUseCasePage } from './pages/public/TraderUseCasePage';
import { FinancierUseCasePage } from './pages/public/FinancierUseCasePage';
import { GovernancePage } from './pages/public/GovernancePage';
import { PilotPage } from './pages/public/PilotPage';
import { EducationPage } from './pages/public/EducationPage';
import { PartnersPage } from './pages/public/PartnersPage';
import { EducationArticlePage } from './pages/public/EducationArticlePage';
import { RoadmapPage } from './pages/public/RoadmapPage';
import { EnergyCalculatorPage } from './pages/public/EnergyCalculatorPage';
import { PartnerShowcasePage } from './pages/public/PartnerShowcasePage';
import { PartnerLandingPage } from './pages/public/PartnerLandingPage';
import { PrivacyPage } from './pages/public/PrivacyPage';
import { TermsPage } from './pages/public/TermsPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

const loadBuyerMap = () => import('./components/BuyerMap').then((module) => ({ default: module.BuyerMap }));
const loadProducerMapPage = () => import('./pages/public/ProducerMapPage').then((module) => ({ default: module.ProducerMapPage }));

const CHUNK_RELOAD_FLAG = 'verdaxis_chunk_reloaded';

// After a deploy, bookmarked deep links can reference stale chunk URLs;
// reload once to pick up the new manifest instead of stranding the user
// on the ErrorBoundary. The sessionStorage flag guards against loops.
function retryImport<T>(load: () => Promise<T>): Promise<T> {
  return load().then((module) => {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
    return module;
  }).catch((error: unknown) => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(CHUNK_RELOAD_FLAG) !== 'true') {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG, 'true');
      window.location.reload();
      return new Promise<T>(() => {});
    }
    throw error;
  });
}

function lazyWithRetry<P extends object>(load: () => Promise<{ default: React.ComponentType<P> }>) {
  return lazy(() => retryImport(load));
}

const BuyerMap = lazyWithRetry(loadBuyerMap);
const ProducerMapPage = lazyWithRetry(loadProducerMapPage);
const Compliance = lazyWithRetry(() => import('./components/Compliance').then((module) => ({ default: module.Compliance })));
const SupplierAnalytics = lazyWithRetry(() => import('./components/SupplierAnalytics').then((module) => ({ default: module.SupplierAnalytics })));
const AdminDashboard = lazyWithRetry(() => import('./components/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));

type Prefetcher = () => Promise<unknown>;

const shouldSkipIdlePrefetch = () => {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(connection?.saveData || connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g');
};

const scheduleIdlePrefetch = (prefetchers: Prefetcher[]) => {
  if (typeof window === 'undefined' || shouldSkipIdlePrefetch()) return undefined;

  const runPrefetch = () => {
    void Promise.allSettled(prefetchers.map((prefetch) => prefetch()));
  };
  const requestIdle = (window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  }).requestIdleCallback;
  const cancelIdle = (window as Window & {
    cancelIdleCallback?: (handle: number) => void;
  }).cancelIdleCallback;

  if (requestIdle) {
    const handle = requestIdle(runPrefetch, { timeout: 5000 });
    return () => cancelIdle?.(handle);
  }

  const handle = window.setTimeout(runPrefetch, 2500);
  return () => window.clearTimeout(handle);
};

const IdleRoutePrefetch: React.FC = () => {
  useEffect(() => scheduleIdlePrefetch([
    loadBuyerMap,
    loadProducerMapPage,
  ]), []);

  return null;
};

// Scroll to top on route change
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
    const { user, isAuthenticated, isLoading, isBackendUnavailable, checkAuth } = useAuth();
    const location = useLocation();

    if (isBackendUnavailable) {
        return <MaintenancePage onRetry={checkAuth} isRetrying={isLoading} />;
    }

    if (isLoading) {
        return <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-emerald-400">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.must_change_password) {
        return <ForcePasswordChangePage />;
    }

    return children;
};

const BackendRequiredRoute = ({ children }: { children: React.ReactElement }) => {
    const { isBackendUnavailable, isLoading, checkAuth } = useAuth();

    if (isBackendUnavailable) {
        return <MaintenancePage onRetry={checkAuth} isRetrying={isLoading} />;
    }

    return children;
};

// Guard: Forces user to onboarding if profile is incomplete
const RequireProfile = ({ children }: { children: React.ReactElement }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;

    // If user exists (valid auth) but has no role, send to onboarding
    // check user.role is falsy or not in allowed roles
    if (user && !user.role) {
        return <Navigate to="/onboarding" replace />; // No state.from to avoid loop
    }

    return children;
};

// Guard: Forces user to create/join organization
const RequireOrganization = ({ children }: { children: React.ReactElement }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;

    if (user && user.role !== 'ADMIN' && !user.organization_id) {
        return <Navigate to="/create-organization" replace />;
    }

    return children;
};

// Guard: Prevents users with completed profile from accessing onboarding
const OnboardingGuard = ({ children }: { children: React.ReactElement }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) return null;

    if (user && user.role) {
        return <Navigate to="/app" replace />;
    }

    return children;
};

const DASHBOARD_PAGES = new Set<Page>([
  'MAP',
  'MARKETPLACE',
  'COMPLIANCE',
  'TRAINING',
  'SETTINGS',
  'DASHBOARD',
  'QUOTES',
  'INVENTORY',
  'FORWARD_CURVE',
  'ANALYTICS',
  'ORDERBOOK',
  'DEMAND_FEED',
  'TRADES',
  'ADMIN',
  'WATCHLISTS',
  'DATA_ANALYTICS',
]);

const sanitizeDashboardPage = (page: string | null | undefined): Page => {
  if (!page) return 'DASHBOARD';
  if (page === 'ORDERBOOK') return 'MARKETPLACE';
  return DASHBOARD_PAGES.has(page as Page) ? page as Page : 'DASHBOARD';
};

interface DashboardLocationState {
  openOrderId?: string;
}

interface MarketplaceLocationState {
  initialPort?: Port;
}

interface DashboardOutletContext {
  viewMode: ViewMode;
  onNavigate: (page: Page) => void;
  onOpenSlice: (slice: MarketSlice) => void;
}

const useDashboard = () => useOutletContext<DashboardOutletContext>();

const pageToPath = (page: Page): string => `/app/${PAGE_SLUGS[sanitizeDashboardPage(page)]}`;

// Legacy Page value per route — feeds Sidebar active state, the
// <main data-dashboard-page> dogfood contract, and session persistence.
const pathToPage = (pathname: string, viewMode: ViewMode): Page => {
  if (pathname.startsWith('/app/admin')) return 'ADMIN';
  if (pathname.startsWith('/app/m/')) return 'MARKETPLACE';
  switch (pathname.split('/')[2] ?? '') {
    case 'home': return 'DASHBOARD';
    case 'map': return 'MAP';
    case 'marketplace': return 'MARKETPLACE';
    case 'curve': return 'FORWARD_CURVE';
    case 'watchlist': return 'WATCHLISTS';
    case 'analytics': return viewMode === 'SUPPLIER' ? 'ANALYTICS' : 'DATA_ANALYTICS';
    case 'trades': return 'TRADES';
    case 'quotes': return 'QUOTES';
    case 'compliance': return 'COMPLIANCE';
    case 'training': return 'TRAINING';
    case 'settings': return 'SETTINGS';
    default: return 'DASHBOARD';
  }
};

const DashboardLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = sessionStorage.getItem('verdaxis_viewMode');
    return (saved as ViewMode) || (user?.role === 'SUPPLIER' ? 'SUPPLIER' : 'BUYER');
  });
  const [sidebarModalSide, setSidebarModalSide] = useState<'BID' | 'ASK' | null>(null);

  // Bare /app only redirects; it must not clobber the stored page the
  // index redirect is about to restore, and it is not a navigation.
  const isBareAppPath = location.pathname === '/app' || location.pathname === '/app/';
  const currentPage = pathToPage(location.pathname, viewMode);

  // Session persistence: the sole writer of the legacy Page value.
  useEffect(() => {
    if (isBareAppPath) return;
    sessionStorage.setItem('verdaxis_currentPage', currentPage);
  }, [currentPage, isBareAppPath]);

  // Nav metrics: a single passive observer around the route commit covers
  // sidebar clicks, adapter navigations, deep links, and back/forward.
  const previousPageRef = useRef<Page | null>(null);
  useEffect(() => {
    if (isBareAppPath) return;
    const previousPage = previousPageRef.current;
    previousPageRef.current = currentPage;
    if (previousPage === null || previousPage === currentPage) return;
    recordDashboardNavigationStart(previousPage, currentPage, viewMode);
    recordDashboardContentReady(currentPage, viewMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, viewMode]);

  const handleSwitchView = (mode: ViewMode) => {
    setViewMode(mode);
    sessionStorage.setItem('verdaxis_viewMode', mode);
    navigate('/app/home');
  };

  const handleNavigate = (page: Page) => {
    analytics.track('platform_navigation', { destination: PAGE_SLUGS[sanitizeDashboardPage(page)], view_mode: viewMode });
    navigate(pageToPath(page));
  };

  const handleOpenSlice = (slice: MarketSlice) => {
    navigate(sliceToPath(slice));
  };

  const outletContext: DashboardOutletContext = {
    viewMode,
    onNavigate: handleNavigate,
    onOpenSlice: handleOpenSlice,
  };

  return (
    <Layout
      viewMode={viewMode}
      onSwitchView={handleSwitchView}
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onPrimaryAction={() => setSidebarModalSide(viewMode === 'BUYER' ? 'BID' : 'ASK')}
    >
      <GuidedTutorial viewMode={viewMode} />
      <ErrorBoundary>
        <Suspense fallback={<div className="p-10 flex justify-center text-emerald-500">Loading...</div>}>
          <Outlet context={outletContext} />
        </Suspense>
      </ErrorBoundary>
      <OrderPlaceModal
        isOpen={sidebarModalSide !== null}
        onClose={() => setSidebarModalSide(null)}
        side={sidebarModalSide || 'BID'}
      />
    </Layout>
  );
};

// /app bare entry: restore the last page (legacy Page value in
// sessionStorage, sanitized: ORDERBOOK→marketplace, INVENTORY/junk→home).
const DashboardIndexRedirect: React.FC = () => {
  const page = sanitizeDashboardPage(sessionStorage.getItem('verdaxis_currentPage'));
  return <Navigate to={pageToPath(page)} replace />;
};

const HomeRoute: React.FC = () => {
  const { viewMode, onNavigate, onOpenSlice } = useDashboard();
  const location = useLocation();
  const [openOrderId, setOpenOrderId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const state = location.state as DashboardLocationState | null;
    if (state?.openOrderId) {
      setOpenOrderId(state.openOrderId);
    }
  }, [location]);

  return viewMode === 'SUPPLIER'
    ? <SupplierDashboard onNavigate={onNavigate} onOpenSlice={onOpenSlice} openOrderId={openOrderId} />
    : <BuyerDashboard onNavigate={onNavigate} onOpenSlice={onOpenSlice} openOrderId={openOrderId} />;
};

const MapRoute: React.FC = () => {
  const { onNavigate } = useDashboard();
  const navigate = useNavigate();

  // Port-only handoff (no slice): Marketplace consumes router state
  // exactly where the initialPort prop feeds it. No partial-slice URLs.
  const openMarketplaceAtPort = (port: Port) => {
    navigate('/app/marketplace', { state: { initialPort: port } satisfies MarketplaceLocationState });
  };

  return <BuyerMap onPortSelect={openMarketplaceAtPort} onNavigate={onNavigate} onOrderClick={openMarketplaceAtPort} />;
};

const MarketplaceRoute: React.FC = () => {
  const { viewMode } = useDashboard();
  const location = useLocation();
  const params = useParams();

  const isSlicePath = params.product !== undefined;
  const slice = isSlicePath ? parseSlicePath(params.product, params.port, params.window) : null;
  if (isSlicePath && !slice) {
    return <Navigate to="/app/marketplace" replace />;
  }

  const initialPort = (location.state as MarketplaceLocationState | null)?.initialPort ?? null;
  return <Marketplace initialPort={initialPort} viewMode={viewMode} initialSlice={slice} />;
};

const CurveRoute: React.FC = () => {
  const { onNavigate, onOpenSlice } = useDashboard();
  return <ForwardCurveWorkspace onNavigate={onNavigate} onOpenSlice={onOpenSlice} />;
};

const AnalyticsRoute: React.FC = () => {
  const { viewMode } = useDashboard();
  return viewMode === 'SUPPLIER' ? <SupplierAnalytics /> : <DataAnalytics />;
};

const QuotesRoute: React.FC = () => {
  const { viewMode } = useDashboard();
  if (viewMode !== 'SUPPLIER') return <Navigate to="/app/home" replace />;
  return <SupplierQuotes />;
};

const ComplianceRoute: React.FC = () => {
  const { viewMode } = useDashboard();
  if (viewMode !== 'BUYER') return <Navigate to="/app/home" replace />;
  return <Compliance />;
};

const TrainingRoute: React.FC = () => {
  const { viewMode } = useDashboard();
  if (viewMode !== 'BUYER') return <Navigate to="/app/home" replace />;
  return <Training />;
};

const SettingsRoute: React.FC = () => {
  const { viewMode } = useDashboard();
  return <Settings viewMode={viewMode} />;
};

const AdminRoute: React.FC = () => {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to="/app/home" replace />;
  return <AdminDashboard />;
};

// Exported for route-level tests: everything inside the router, without
// the BrowserRouter/provider shell.
export const AppRoutes: React.FC = () => {
  return (
                <Suspense fallback={<div className="min-h-screen bg-white p-10 text-center text-emerald-600 dark:bg-slate-950">Loading...</div>}>
                <Routes>
                    {/* Auth routes */}
                    <Route path="/login" element={<BackendRequiredRoute><LoginPage /></BackendRequiredRoute>} />
                    <Route path="/register" element={<BackendRequiredRoute><RegisterPage /></BackendRequiredRoute>} />
                    <Route path="/invite/:code" element={<BackendRequiredRoute><InvitePage /></BackendRequiredRoute>} />
                    <Route path="/invite" element={<Navigate to="/register" replace />} />
                    <Route path="/verify-email" element={<BackendRequiredRoute><VerifyEmailPage /></BackendRequiredRoute>} />
                    <Route path="/forgot-password" element={<BackendRequiredRoute><ForgotPasswordPage /></BackendRequiredRoute>} />
                    <Route path="/reset-password" element={<BackendRequiredRoute><ResetPasswordPage /></BackendRequiredRoute>} />

                    {/* Root → detect language → redirect */}
                    <Route path="/" element={<LanguageRedirect />} />

                    {/* Public pages under /:lang */}
                    <Route path="/:lang" element={<PublicLanguageWrapper />}>
                      <Route element={<PublicLayout />}>
                        <Route index element={<LandingPage />} />
                        <Route path="how-it-works" element={<HowItWorksPage />} />
                        <Route path="fuels" element={<FuelCoveragePage />} />
                        <Route path="fuels/:sector" element={<FuelCoveragePage />} />
                        <Route path="compliance" element={<ComplianceInfoPage />} />
                        <Route path="for-producers" element={<ProducerUseCasePage />} />
                        <Route path="for-buyers" element={<BuyerUseCasePage />} />
                        <Route path="for-traders" element={<TraderUseCasePage />} />
                        <Route path="for-financiers" element={<FinancierUseCasePage />} />
                        <Route path="governance" element={<GovernancePage />} />
                        <Route path="pilot" element={<PilotPage />} />
                        <Route path="partners" element={<PartnersPage />} />
                        <Route path="partners/:slug" element={<PartnerLandingPage />} />
                        <Route path="education" element={<EducationPage />} />
                        <Route path="education/:slug" element={<EducationArticlePage />} />
                        <Route path="roadmap" element={<RoadmapPage />} />
                        <Route path="tools/energy-calculator" element={<EnergyCalculatorPage />} />
                        <Route path="map/producers" element={<ProducerMapPage />} />
                        <Route path="privacy" element={<PrivacyPage />} />
                        <Route path="terms" element={<TermsPage />} />
                      </Route>
                    </Route>

                    {/* Legacy redirects for old un-prefixed URLs */}
                    <Route path="/how-it-works" element={<LegacyRedirect />} />
                    <Route path="/fuels/*" element={<LegacyRedirect />} />
                    <Route path="/compliance" element={<LegacyRedirect />} />
                    <Route path="/for-producers" element={<LegacyRedirect />} />
                    <Route path="/for-buyers" element={<LegacyRedirect />} />
                    <Route path="/for-traders" element={<LegacyRedirect />} />
                    <Route path="/for-financiers" element={<LegacyRedirect />} />
                    <Route path="/governance" element={<LegacyRedirect />} />
                    <Route path="/pilot" element={<LegacyRedirect />} />
                    <Route path="/partners/*" element={<LegacyRedirect />} />
                    <Route path="/education/*" element={<LegacyRedirect />} />
                    <Route path="/roadmap" element={<LegacyRedirect />} />
                    <Route path="/tools/*" element={<LegacyRedirect />} />
                    <Route path="/map/*" element={<LegacyRedirect />} />
                    <Route path="/privacy" element={<LegacyRedirect />} />
                    <Route path="/terms" element={<LegacyRedirect />} />

                    {/* partners-preview remains unprefixed (special showcase) */}
                    <Route path="/partners-preview" element={<PartnerShowcasePage />} />

                    {/* Authenticated routes */}
                    <Route path="/onboarding" element={
                        <ProtectedRoute>
                            <OnboardingGuard>
                                <OnboardingPage />
                            </OnboardingGuard>
                        </ProtectedRoute>
                    } />

                    <Route path="/create-organization" element={<BackendRequiredRoute><CreateOrganizationPage /></BackendRequiredRoute>} />

                    <Route path="/kyc" element={
                        <ProtectedRoute>
                            <KycPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/app" element={
                        <ProtectedRoute>
                            <RequireOrganization>
                                <RequireProfile>
                                    <MobileDesktopGate>
                                        <DashboardLayout />
                                    </MobileDesktopGate>
                                </RequireProfile>
                            </RequireOrganization>
                        </ProtectedRoute>
                    }>
                        <Route index element={<DashboardIndexRedirect />} />
                        <Route path="home" element={<HomeRoute />} />
                        <Route path="map" element={<MapRoute />} />
                        <Route path="marketplace" element={<MarketplaceRoute />} />
                        <Route path="m/:product/:port/:window" element={<MarketplaceRoute />} />
                        <Route path="curve" element={<CurveRoute />} />
                        <Route path="watchlist" element={<WatchlistPage />} />
                        <Route path="analytics" element={<AnalyticsRoute />} />
                        <Route path="trades" element={<TradeHistoryPage />} />
                        <Route path="quotes" element={<QuotesRoute />} />
                        <Route path="compliance" element={<ComplianceRoute />} />
                        <Route path="training" element={<TrainingRoute />} />
                        <Route path="settings" element={<SettingsRoute />} />
                        <Route path="admin/*" element={<AdminRoute />} />
                        <Route path="*" element={<Navigate to="/app/home" replace />} />
                    </Route>
                    <Route path="/admin/*" element={<Navigate to="/app/admin" replace />} />

                    {/* Fallback */}
                    <Route path="*" element={<PublicLayout />} />
                </Routes>
                </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
        <NotificationProvider>
            <TutorialProvider>
            <BrowserRouter>
                <AnalyticsProvider>
                <ScrollToTop />
                <IdleRoutePrefetch />
                <AppRoutes />
                </AnalyticsProvider>
            </BrowserRouter>
        </TutorialProvider>
        <TradeNotifier />
        </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
