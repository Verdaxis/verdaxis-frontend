import { BuyerDashboard } from './components/CommandCenter';
import { SupplierDashboard } from './components/CommandCenter';
import { SupplierQuotes } from './components/SupplierQuotes';
import { TradeHistoryPage } from './components/TradeHistoryPage';
import { Marketplace } from './components/Marketplace';
import { WatchlistPage } from './components/WatchlistPage';

import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
// Copilot removed per Gavin feedback — was unreliable and exposed API key in client bundle
import { NotificationProvider } from './context/NotificationContext';
import { TutorialProvider } from './context/TutorialContext';
import { MarketSupportProvider, useMarketSupport } from './context/MarketSupportContext';
import { defaultMarketSupportView } from './types/marketSupport';
import { GuidedTutorial } from './components/GuidedTutorial';
import { ErrorBoundary } from './components/ErrorBoundary';
import { MobileDesktopGate } from './components/MobileDesktopGate';
import { ToastProvider } from './components/Toast';
import { TradeNotifier } from './components/TradeNotifier';
import { AnalyticsProvider } from './components/AnalyticsProvider';
import { DeploymentUpdateNotice } from './components/DeploymentUpdateNotice';
import { analytics } from './services/analytics';
import { Layout } from './components/Layout';
import { OrderPlaceModal } from './components/OrderPlaceModal';
import { ViewMode, Page, PAGE_SLUGS, Port } from './types';
import { MarketSlice, parseSlicePath, sliceToPath } from './utils/sliceUrl';
import {
  cancelDashboardNavigation,
  recordDashboardNavigationStart,
  recordDashboardRouteCommit,
} from './utils/navigationPerformance';
import { PublicLayout } from './components/public/PublicLayout';
import LanguageRedirect from './components/public/LanguageRedirect';
import PublicLanguageWrapper from './components/public/PublicLanguageWrapper';
import LegacyRedirect from './components/public/LegacyRedirect';
import { useTranslation } from 'react-i18next';

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
const AdminDashboard = lazyWithRetry(() => import('./components/admin/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));

// Route code loads when needed; reuse the existing deploy-safe chunk retry.
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage'));
const InvitePage = lazyWithRetry(() => import('./pages/InvitePage').then((module) => ({ default: module.InvitePage })));
const ForgotPasswordPage = lazyWithRetry(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazyWithRetry(() => import('./pages/ResetPasswordPage'));
const AcceptInvitationPage = lazyWithRetry(() => import('./pages/AcceptInvitationPage'));
const ForcePasswordChangePage = lazyWithRetry(() => import('./pages/ForcePasswordChangePage'));
const MaintenancePage = lazyWithRetry(() => import('./pages/MaintenancePage'));
const OnboardingPage = lazyWithRetry(() => import('./pages/OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const CreateOrganizationPage = lazyWithRetry(() => import('./pages/CreateOrganizationPage'));
const VerifyEmailPage = lazyWithRetry(() => import('./pages/VerifyEmailPage'));
const KycPage = lazyWithRetry(() => import('./pages/KycPage'));
const DataAnalytics = lazyWithRetry(() => import('./components/DataAnalytics').then((module) => ({ default: module.DataAnalytics })));
const Training = lazyWithRetry(() => import('./components/Training').then((module) => ({ default: module.Training })));
const Settings = lazyWithRetry(() => import('./components/Settings').then((module) => ({ default: module.Settings })));
const ForwardCurveWorkspace = lazyWithRetry(() => import('./components/ForwardCurveWorkspace').then((module) => ({ default: module.ForwardCurveWorkspace })));
const LandingPage = lazyWithRetry(() => import('./pages/public/LandingPage').then((module) => ({ default: module.LandingPage })));
const HowItWorksPage = lazyWithRetry(() => import('./pages/public/HowItWorksPage').then((module) => ({ default: module.HowItWorksPage })));
const FuelCoveragePage = lazyWithRetry(() => import('./pages/public/FuelCoveragePage').then((module) => ({ default: module.FuelCoveragePage })));
const ComplianceInfoPage = lazyWithRetry(() => import('./pages/public/ComplianceInfoPage').then((module) => ({ default: module.ComplianceInfoPage })));
const ProducerUseCasePage = lazyWithRetry(() => import('./pages/public/ProducerUseCasePage').then((module) => ({ default: module.ProducerUseCasePage })));
const BuyerUseCasePage = lazyWithRetry(() => import('./pages/public/BuyerUseCasePage').then((module) => ({ default: module.BuyerUseCasePage })));
const TraderUseCasePage = lazyWithRetry(() => import('./pages/public/TraderUseCasePage').then((module) => ({ default: module.TraderUseCasePage })));
const FinancierUseCasePage = lazyWithRetry(() => import('./pages/public/FinancierUseCasePage').then((module) => ({ default: module.FinancierUseCasePage })));
const GovernancePage = lazyWithRetry(() => import('./pages/public/GovernancePage').then((module) => ({ default: module.GovernancePage })));
const PilotPage = lazyWithRetry(() => import('./pages/public/PilotPage').then((module) => ({ default: module.PilotPage })));
const EducationPage = lazyWithRetry(() => import('./pages/public/EducationPage').then((module) => ({ default: module.EducationPage })));
const PartnersPage = lazyWithRetry(() => import('./pages/public/PartnersPage').then((module) => ({ default: module.PartnersPage })));
const EducationArticlePage = lazyWithRetry(() => import('./pages/public/EducationArticlePage').then((module) => ({ default: module.EducationArticlePage })));
const RoadmapPage = lazyWithRetry(() => import('./pages/public/RoadmapPage').then((module) => ({ default: module.RoadmapPage })));
const EnergyCalculatorPage = lazyWithRetry(() => import('./pages/public/EnergyCalculatorPage').then((module) => ({ default: module.EnergyCalculatorPage })));
const PartnerShowcasePage = lazyWithRetry(() => import('./pages/public/PartnerShowcasePage').then((module) => ({ default: module.PartnerShowcasePage })));
const PartnerLandingPage = lazyWithRetry(() => import('./pages/public/PartnerLandingPage').then((module) => ({ default: module.PartnerLandingPage })));
const PrivacyPage = lazyWithRetry(() => import('./pages/public/PrivacyPage').then((module) => ({ default: module.PrivacyPage })));
const TermsPage = lazyWithRetry(() => import('./pages/public/TermsPage').then((module) => ({ default: module.TermsPage })));
const NotFoundPage = lazyWithRetry(() => import('./pages/public/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

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
    const { t } = useTranslation('common');

    if (isBackendUnavailable) {
        return <MaintenancePage onRetry={checkAuth} isRetrying={isLoading} />;
    }

    if (isLoading) {
        return <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-emerald-400">{t('loading')}</div>;
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
const pathToPage = (pathname: string): Page => {
  if (pathname.startsWith('/app/admin')) return 'ADMIN';
  if (pathname.startsWith('/app/m/')) return 'MARKETPLACE';
  switch (pathname.split('/')[2] ?? '') {
    case 'home': return 'DASHBOARD';
    case 'map': return 'MAP';
    case 'marketplace': return 'MARKETPLACE';
    case 'curve': return 'FORWARD_CURVE';
    case 'watchlist': return 'WATCHLISTS';
    case 'analytics': return 'DATA_ANALYTICS';
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
  const { context, isLoading: isMarketSupportLoading } = useMarketSupport();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = sessionStorage.getItem('verdaxis_viewMode');
    return (saved as ViewMode) || (user?.role === 'SUPPLIER' ? 'SUPPLIER' : 'BUYER');
  });
  const [sidebarModalSide, setSidebarModalSide] = useState<'BID' | 'ASK' | null>(null);
  const [visitedMapScope, setVisitedMapScope] = useState<string | null>(null);
  const initializedSupportContext = useRef<string | null>(null);

  const effectiveViewMode: ViewMode = viewMode;

  useEffect(() => {
    if (!context) {
      initializedSupportContext.current = null;
      return;
    }
    if (initializedSupportContext.current === context.id) return;
    initializedSupportContext.current = context.id;

    const defaultView = defaultMarketSupportView(context.organization.type);
    if (!defaultView) return;
    setViewMode(defaultView);
    sessionStorage.setItem('verdaxis_viewMode', defaultView);
  }, [context]);

  useEffect(() => {
    if (context && location.pathname.startsWith('/app/admin')) {
      navigate('/app/home', { replace: true });
    }
  }, [context, location.pathname, navigate]);

  // Bare /app only redirects; it must not clobber the stored page the
  // index redirect is about to restore, and it is not a navigation.
  const isBareAppPath = location.pathname === '/app' || location.pathname === '/app/';
  const currentPage = pathToPage(location.pathname);
  const isMapActive = !isBareAppPath && currentPage === 'MAP';
  const mapScopeKey = `${user?.id ?? 'account'}:${user?.organization_id ?? 'no-organization'}:${context?.id ?? 'direct'}`;
  const shouldRenderMap = isMapActive || visitedMapScope === mapScopeKey;

  useEffect(() => {
    if (isMapActive) setVisitedMapScope(mapScopeKey);
  }, [isMapActive, mapScopeKey]);

  useEffect(() => () => cancelDashboardNavigation(), []);

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
    recordDashboardNavigationStart(previousPage, currentPage, effectiveViewMode);
    recordDashboardRouteCommit(currentPage, effectiveViewMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveViewMode, location.pathname]);

  const handleSwitchView = (mode: ViewMode) => {
    setViewMode(mode);
    sessionStorage.setItem('verdaxis_viewMode', mode);
    navigate('/app/home');
  };

  const handleNavigate = (page: Page) => {
    const destination = sanitizeDashboardPage(page);
    analytics.track('platform_navigation', { destination: PAGE_SLUGS[destination], view_mode: effectiveViewMode });
    recordDashboardNavigationStart(currentPage, destination, effectiveViewMode);
    navigate(pageToPath(destination));
  };

  const handleOpenSlice = (slice: MarketSlice) => {
    recordDashboardNavigationStart(currentPage, 'MARKETPLACE', effectiveViewMode);
    navigate(sliceToPath(slice));
  };

  const openMarketplaceAtPort = (port: Port) => {
    recordDashboardNavigationStart(currentPage, 'MARKETPLACE', effectiveViewMode);
    navigate('/app/marketplace', { state: { initialPort: port } satisfies MarketplaceLocationState });
  };

  const outletContext: DashboardOutletContext = {
    viewMode: effectiveViewMode,
    onNavigate: handleNavigate,
    onOpenSlice: handleOpenSlice,
  };

  if (isMarketSupportLoading) {
    return <div className="flex h-screen items-center justify-center bg-slate-900 text-emerald-400">{t('marketSupport.restoring')}</div>;
  }

  return (
    <Layout
      viewMode={effectiveViewMode}
      onSwitchView={handleSwitchView}
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onPrimaryAction={() => setSidebarModalSide(effectiveViewMode === 'BUYER' ? 'BID' : 'ASK')}
    >
      {!context && <GuidedTutorial viewMode={effectiveViewMode} />}
      {shouldRenderMap && (
        <div
          className="h-full"
          data-testid="persistent-map"
          hidden={!isMapActive}
          inert={!isMapActive}
          aria-hidden={!isMapActive}
        >
          <ErrorBoundary key={mapScopeKey}>
            <Suspense fallback={<div className="p-10 flex justify-center text-emerald-500">{t('loading')}</div>}>
              <BuyerMap
                active={isMapActive}
                onPortSelect={openMarketplaceAtPort}
                onNavigate={handleNavigate}
                onOrderClick={openMarketplaceAtPort}
              />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
      {!isMapActive && (
        <ErrorBoundary>
          <Suspense fallback={<div className="p-10 flex justify-center text-emerald-500">{t('loading')}</div>}>
            <Outlet context={outletContext} />
          </Suspense>
        </ErrorBoundary>
      )}
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
  const { user } = useAuth();
  const { context } = useMarketSupport();
  const location = useLocation();
  const [openOrderId, setOpenOrderId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const state = location.state as DashboardLocationState | null;
    if (state?.openOrderId) {
      setOpenOrderId(state.openOrderId);
    }
  }, [location]);

  const dashboardScopeKey = `${user?.id ?? 'account'}:${context?.id ?? user?.organization_id ?? 'real-account'}`;

  return viewMode === 'SUPPLIER'
    ? <SupplierDashboard key={dashboardScopeKey} onNavigate={onNavigate} onOpenSlice={onOpenSlice} openOrderId={openOrderId} />
    : <BuyerDashboard key={dashboardScopeKey} onNavigate={onNavigate} onOpenSlice={onOpenSlice} openOrderId={openOrderId} />;
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
  return <DataAnalytics />;
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
  const { isActive } = useMarketSupport();
  if (isActive) return <Navigate to="/app/home" replace />;
  return <Settings viewMode={viewMode} />;
};

const SupportRestrictedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isActive } = useMarketSupport();
  return isActive ? <Navigate to="/app/home" replace /> : children;
};

const AdminRoute: React.FC = () => {
  const { user } = useAuth();
  const { isActive } = useMarketSupport();
  if (user?.role !== 'ADMIN') return <Navigate to="/app/home" replace />;
  if (isActive) return <Navigate to="/app/home" replace />;
  return <AdminDashboard />;
};

// Exported for route-level tests: everything inside the router, without
// the BrowserRouter/provider shell.
export const AppRoutes: React.FC = () => {
  const { t } = useTranslation('common');
  return (
                <Suspense fallback={<div className="min-h-screen bg-white p-10 text-center text-emerald-600 dark:bg-slate-950">{t('loading')}</div>}>
                <Routes>
                    {/* Auth routes */}
                    <Route path="/login" element={<BackendRequiredRoute><LoginPage /></BackendRequiredRoute>} />
                    <Route path="/register" element={<BackendRequiredRoute><RegisterPage /></BackendRequiredRoute>} />
                    <Route path="/invite/:code" element={<BackendRequiredRoute><InvitePage /></BackendRequiredRoute>} />
                    <Route path="/invite" element={<Navigate to="/register" replace />} />
                    <Route path="/verify-email" element={<BackendRequiredRoute><VerifyEmailPage /></BackendRequiredRoute>} />
                    <Route path="/forgot-password" element={<BackendRequiredRoute><ForgotPasswordPage /></BackendRequiredRoute>} />
                    <Route path="/reset-password" element={<BackendRequiredRoute><ResetPasswordPage /></BackendRequiredRoute>} />
                    <Route path="/accept-invite" element={<BackendRequiredRoute><AcceptInvitationPage /></BackendRequiredRoute>} />

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
                        <Route path="map" element={<></>} />
                        <Route path="marketplace" element={<MarketplaceRoute />} />
                        <Route path="m/:product/:port/:window" element={<MarketplaceRoute />} />
                        <Route path="curve" element={<CurveRoute />} />
                        <Route path="watchlist" element={<SupportRestrictedRoute><WatchlistPage /></SupportRestrictedRoute>} />
                        <Route path="analytics" element={<AnalyticsRoute />} />
                        <Route path="trades" element={<SupportRestrictedRoute><TradeHistoryPage /></SupportRestrictedRoute>} />
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
        <MarketSupportProvider>
        <ToastProvider>
        <NotificationProvider>
            <TutorialProvider>
            <BrowserRouter>
                <AnalyticsProvider>
                <ScrollToTop />
                <DeploymentUpdateNotice />
                <AppRoutes />
                </AnalyticsProvider>
            </BrowserRouter>
        </TutorialProvider>
        <TradeNotifier />
        </NotificationProvider>
        </ToastProvider>
        </MarketSupportProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
