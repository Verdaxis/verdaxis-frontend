
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
// Copilot removed per Gavin feedback — was unreliable and exposed API key in client bundle
import { NotificationProvider } from './context/NotificationContext';
import { TutorialProvider } from './context/TutorialContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { ViewMode, Page, Port } from './types';

const lazyNamed = <T extends React.ComponentType<any>>(loader: () => Promise<Record<string, any>>, exportName: string) =>
  lazy(async () => ({ default: (await loader())[exportName] as T }));

const LoadingScreen = () => (
  <div className="min-h-screen w-full bg-slate-950 flex items-center justify-center text-emerald-400">
    Loading...
  </div>
);

const GuidedTutorial = lazyNamed(() => import('./components/GuidedTutorial'), 'GuidedTutorial');
const LoginPage = lazy(() => import('./pages/LoginPage'));
const TradeNotifier = lazyNamed(() => import('./components/TradeNotifier'), 'TradeNotifier');
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const InvitePage = lazyNamed(() => import('./pages/InvitePage'), 'InvitePage');
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const OnboardingPage = lazyNamed(() => import('./pages/OnboardingPage'), 'OnboardingPage');
const CreateOrganizationPage = lazy(() => import('./pages/CreateOrganizationPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const KycPage = lazy(() => import('./pages/KycPage'));
const Layout = lazyNamed(() => import('./components/Layout'), 'Layout');
const BuyerMap = lazyNamed(() => import('./components/BuyerMap'), 'BuyerMap');
const BuyerDashboard = lazyNamed(() => import('./components/CommandCenter'), 'BuyerDashboard');
const SupplierDashboard = lazyNamed(() => import('./components/CommandCenter'), 'SupplierDashboard');
const SupplierQuotes = lazyNamed(() => import('./components/SupplierQuotes'), 'SupplierQuotes');
const DataAnalytics = lazyNamed(() => import('./components/DataAnalytics'), 'DataAnalytics');
const Compliance = lazyNamed(() => import('./components/Compliance'), 'Compliance');
const Training = lazyNamed(() => import('./components/Training'), 'Training');
const Settings = lazyNamed(() => import('./components/Settings'), 'Settings');
const TradeHistoryPage = lazyNamed(() => import('./components/TradeHistoryPage'), 'TradeHistoryPage');
const MarketTerminal = lazyNamed(() => import('./components/MarketTerminal'), 'MarketTerminal');
const ForwardCurveWorkspace = lazyNamed(() => import('./components/ForwardCurveWorkspace'), 'ForwardCurveWorkspace');
const Marketplace = lazyNamed(() => import('./components/Marketplace'), 'Marketplace');
const WatchlistPage = lazyNamed(() => import('./components/WatchlistPage'), 'WatchlistPage');
const SupplierAnalytics = lazyNamed(() => import('./components/SupplierAnalytics'), 'SupplierAnalytics');
const AdminDashboard = lazyNamed(() => import('./components/admin/AdminDashboard'), 'AdminDashboard');
const OrderPlaceModal = lazyNamed(() => import('./components/OrderPlaceModal'), 'OrderPlaceModal');
const PublicLayout = lazyNamed(() => import('./components/public/PublicLayout'), 'PublicLayout');
const LanguageRedirect = lazy(() => import('./components/public/LanguageRedirect'));
const PublicLanguageWrapper = lazy(() => import('./components/public/PublicLanguageWrapper'));
const LegacyRedirect = lazy(() => import('./components/public/LegacyRedirect'));
const LandingPage = lazyNamed(() => import('./pages/public/LandingPage'), 'LandingPage');
const HowItWorksPage = lazyNamed(() => import('./pages/public/HowItWorksPage'), 'HowItWorksPage');
const FuelCoveragePage = lazyNamed(() => import('./pages/public/FuelCoveragePage'), 'FuelCoveragePage');
const ComplianceInfoPage = lazyNamed(() => import('./pages/public/ComplianceInfoPage'), 'ComplianceInfoPage');
const ProducerUseCasePage = lazyNamed(() => import('./pages/public/ProducerUseCasePage'), 'ProducerUseCasePage');
const BuyerUseCasePage = lazyNamed(() => import('./pages/public/BuyerUseCasePage'), 'BuyerUseCasePage');
const TraderUseCasePage = lazyNamed(() => import('./pages/public/TraderUseCasePage'), 'TraderUseCasePage');
const FinancierUseCasePage = lazyNamed(() => import('./pages/public/FinancierUseCasePage'), 'FinancierUseCasePage');
const GovernancePage = lazyNamed(() => import('./pages/public/GovernancePage'), 'GovernancePage');
const PilotPage = lazyNamed(() => import('./pages/public/PilotPage'), 'PilotPage');
const EducationPage = lazyNamed(() => import('./pages/public/EducationPage'), 'EducationPage');
const PartnersPage = lazyNamed(() => import('./pages/public/PartnersPage'), 'PartnersPage');
const EducationArticlePage = lazyNamed(() => import('./pages/public/EducationArticlePage'), 'EducationArticlePage');
const RoadmapPage = lazyNamed(() => import('./pages/public/RoadmapPage'), 'RoadmapPage');
const EnergyCalculatorPage = lazyNamed(() => import('./pages/public/EnergyCalculatorPage'), 'EnergyCalculatorPage');
const ProducerMapPage = lazyNamed(() => import('./pages/public/ProducerMapPage'), 'ProducerMapPage');
const PartnerShowcasePage = lazyNamed(() => import('./pages/public/PartnerShowcasePage'), 'PartnerShowcasePage');
const PartnerLandingPage = lazyNamed(() => import('./pages/public/PartnerLandingPage'), 'PartnerLandingPage');
const PrivacyPage = lazyNamed(() => import('./pages/public/PrivacyPage'), 'PrivacyPage');
const TermsPage = lazyNamed(() => import('./pages/public/TermsPage'), 'TermsPage');

const prefetchPlatformScreens = () => {
  void Promise.all([
    import('./components/BuyerMap'),
    import('./components/Marketplace'),
    import('./components/MarketTerminal'),
    import('./components/ForwardCurveWorkspace'),
    import('./components/ForwardCurve'),
    import('./components/OrderPlaceModal'),
  ]).catch(() => undefined);
};

const schedulePlatformPrefetch = () => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(prefetchPlatformScreens, { timeout: 3000 });
    return;
  }
  window.setTimeout(prefetchPlatformScreens, 1000);
};

const prefetchDashboardPage = (page: Page) => {
  switch (page) {
    case 'MAP':
      void import('./components/BuyerMap').catch(() => undefined);
      break;
    case 'MARKETPLACE':
    case 'DEMAND_FEED':
      void Promise.all([
        import('./components/Marketplace'),
        import('./components/OrderPlaceModal'),
      ]).catch(() => undefined);
      break;
    case 'TERMINAL':
      void Promise.all([
        import('./components/MarketTerminal'),
        import('./components/ForwardCurve'),
      ]).catch(() => undefined);
      break;
    case 'DATA_ANALYTICS':
      void import('./components/DataAnalytics').catch(() => undefined);
      break;
    case 'ANALYTICS':
      void import('./components/SupplierAnalytics').catch(() => undefined);
      break;
    case 'COMPLIANCE':
      void import('./components/Compliance').catch(() => undefined);
      break;
    case 'WATCHLISTS':
      void import('./components/WatchlistPage').catch(() => undefined);
      break;
    case 'TRADES':
      void import('./components/TradeHistoryPage').catch(() => undefined);
      break;
    case 'SETTINGS':
      void import('./components/Settings').catch(() => undefined);
      break;
    case 'ADMIN':
      void import('./components/admin/AdminDashboard').catch(() => undefined);
      break;
    default:
      void import('./components/CommandCenter').catch(() => undefined);
      break;
  }
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
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div className="h-screen w-screen bg-slate-900 flex items-center justify-center text-emerald-400">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
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

    if (user && !user.organization_id) {
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

const sanitizeDashboardPage = (page: string | null | undefined): Page => {
  if (!page) return 'DASHBOARD';
  if (page === 'ORDERBOOK') return 'MARKETPLACE';
  return page as Page;
};

const Dashboard: React.FC = () => {
  // Original App Logic for Dashboard
  const { user } = useAuth();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = sessionStorage.getItem('verdaxis_viewMode');
    return (saved as ViewMode) || (user?.role === 'SUPPLIER' ? 'SUPPLIER' : 'BUYER');
  });
  const [currentPage, setCurrentPage] = useState<Page>(() => sanitizeDashboardPage(sessionStorage.getItem('verdaxis_currentPage')));
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | undefined>(undefined);
  const [sidebarModalSide, setSidebarModalSide] = useState<'BID' | 'ASK' | null>(null);

  useEffect(() => {
      if (location.state) {
        const state = location.state as any;
        if (state.targetPage) {
            setCurrentPage(sanitizeDashboardPage(state.targetPage));
        }
        if (state.openOrderId) {
            setOpenOrderId(state.openOrderId);
        }
      }
  }, [location]);

  useEffect(() => {
      schedulePlatformPrefetch();
  }, []);

  const handleSwitchView = (mode: ViewMode) => {
    setViewMode(mode);
    const defaultPage = 'DASHBOARD';
    setCurrentPage(defaultPage);
    sessionStorage.setItem('verdaxis_viewMode', mode);
    sessionStorage.setItem('verdaxis_currentPage', defaultPage);
  };

  const handleNavigate = (page: Page) => {
    const nextPage = sanitizeDashboardPage(page);
    setCurrentPage(nextPage);
    sessionStorage.setItem('verdaxis_currentPage', nextPage);
  };

  const handlePortSelect = (port: Port) => {
    setSelectedPort(port);
    setCurrentPage('MARKETPLACE');
  };

  const handleOrderClick = (port: Port) => {
    // Redirect to Marketplace with port selected
    setSelectedPort(port);
    setCurrentPage('MARKETPLACE');
  };

  const renderContent = () => {
    if (currentPage === 'SETTINGS') {
        return <Settings viewMode={viewMode} />;
    }

    if (currentPage === 'ADMIN' && user?.role === 'ADMIN') {
        return <AdminDashboard />;
    }

    if (viewMode === 'SUPPLIER') {
        switch (currentPage) {
            case 'MAP':
                return <BuyerMap onPortSelect={handlePortSelect} onNavigate={handleNavigate} onOrderClick={handleOrderClick} />;
            case 'DASHBOARD':
                return <SupplierDashboard onNavigate={handleNavigate} openOrderId={openOrderId} />;
            case 'QUOTES':
                return <SupplierQuotes />;
            case 'TERMINAL':
                return <MarketTerminal onNavigate={handleNavigate} />;
            case 'FORWARD_CURVE':
                return <ForwardCurveWorkspace onNavigate={handleNavigate} />;
            case 'ANALYTICS':
                return <SupplierAnalytics />;
            case 'COMPLIANCE':
                return <Compliance />;
            case 'MARKETPLACE':
            case 'DEMAND_FEED':
                return <Marketplace initialPort={selectedPort} />;
            case 'TRADES':
                return <TradeHistoryPage />;
            case 'WATCHLISTS':
                return <WatchlistPage />;
            default:
                return <SupplierDashboard onNavigate={handleNavigate} openOrderId={openOrderId} />;
        }
    }

    switch (currentPage) {
      case 'MAP':
        return <BuyerMap onPortSelect={handlePortSelect} onNavigate={handleNavigate} onOrderClick={handleOrderClick} />;
      case 'DASHBOARD':
        return <BuyerDashboard onNavigate={handleNavigate} openOrderId={openOrderId} />;
      case 'MARKETPLACE':
        return <Marketplace initialPort={selectedPort} />;
      case 'TERMINAL':
        return <MarketTerminal onNavigate={handleNavigate} />;
      case 'FORWARD_CURVE':
        return <ForwardCurveWorkspace onNavigate={handleNavigate} />;
      case 'DATA_ANALYTICS':
        return <DataAnalytics />;
      case 'COMPLIANCE':
        return <Compliance />;
      case 'TRAINING':
         return <Training />;
      case 'TRADES':
         return <TradeHistoryPage />;
      case 'WATCHLISTS':
         return <WatchlistPage />;
      default:
        return <BuyerDashboard onNavigate={handleNavigate} openOrderId={openOrderId} />;
    }
  };

  return (
    <Layout
      viewMode={viewMode}
      onSwitchView={handleSwitchView}
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onPrefetchPage={prefetchDashboardPage}
      onPrimaryAction={() => setSidebarModalSide(viewMode === 'BUYER' ? 'BID' : 'ASK')}
    >
      <GuidedTutorial viewMode={viewMode} />
      <ErrorBoundary>
        {renderContent()}
      </ErrorBoundary>
      <OrderPlaceModal
        isOpen={sidebarModalSide !== null}
        onClose={() => setSidebarModalSide(null)}
        side={sidebarModalSide || 'BID'}
      />
    </Layout>
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
                <ScrollToTop />
                <Suspense fallback={<LoadingScreen />}>
                <Routes>
                    {/* Auth routes */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/invite/:code" element={<InvitePage />} />
                    <Route path="/invite" element={<Navigate to="/register" replace />} />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />

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

                    <Route path="/create-organization" element={<CreateOrganizationPage />} />

                    <Route path="/kyc" element={
                        <ProtectedRoute>
                            <KycPage />
                        </ProtectedRoute>
                    } />

                    <Route path="/app" element={
                        <ProtectedRoute>
                            <RequireOrganization>
                                <RequireProfile>
                                    <Dashboard />
                                </RequireProfile>
                            </RequireOrganization>
                        </ProtectedRoute>
                    } />

                    {/* Fallback */}
                    <Route path="*" element={<PublicLayout />} />
                </Routes>
                </Suspense>
            </BrowserRouter>
        </TutorialProvider>
        <Suspense fallback={null}>
          <TradeNotifier />
        </Suspense>
        </NotificationProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;
