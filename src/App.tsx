
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
// Copilot removed per Gavin feedback — was unreliable and exposed API key in client bundle
import { NotificationProvider } from './context/NotificationContext';
import { TutorialProvider } from './context/TutorialContext';
import { GuidedTutorial } from './components/GuidedTutorial';
import LoginPage from './pages/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { TradeNotifier } from './components/TradeNotifier';
import RegisterPage from './pages/RegisterPage';
import { InvitePage } from './pages/InvitePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { OnboardingPage } from './pages/OnboardingPage';
import CreateOrganizationPage from './pages/CreateOrganizationPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import KycPage from './pages/KycPage';
import { Layout } from './components/Layout';
import { BuyerMap } from './components/BuyerMap';
import { BuyerDashboard, SupplierDashboard } from './components/CommandCenter';
import { SupplierQuotes } from './components/SupplierQuotes';
import { DataAnalytics } from './components/DataAnalytics';
import { Compliance } from './components/Compliance';
import { Training } from './components/Training';
import { Settings } from './components/Settings';
import { Stats } from './components/Stats';
import { MyTrades } from './components/MyTrades';
import { TradeHistoryPage } from './components/TradeHistoryPage';
import { MarketTerminal } from './components/MarketTerminal';
import { Marketplace } from './components/Marketplace';
import { WatchlistPage } from './components/WatchlistPage';
import { SupplierStats } from './components/SupplierStats';
import { SupplierAnalytics } from './components/SupplierAnalytics';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { OrderPlaceModal } from './components/OrderPlaceModal';
import { ViewMode, Page, Port } from './types';
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
import { ProducerMapPage } from './pages/public/ProducerMapPage';
import { PartnerShowcasePage } from './pages/public/PartnerShowcasePage';
import { PartnerLandingPage } from './pages/public/PartnerLandingPage';
import { PrivacyPage } from './pages/public/PrivacyPage';
import { TermsPage } from './pages/public/TermsPage';
import { NotFoundPage } from './pages/public/NotFoundPage';

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
            case 'ANALYTICS':
                return <SupplierAnalytics />;
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
