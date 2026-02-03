
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CopilotProvider } from './context/CopilotContext';
import { NotificationProvider } from './context/NotificationContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { OnboardingPage } from './pages/OnboardingPage';
import CreateOrganizationPage from './pages/CreateOrganizationPage';
import { Layout } from './components/Layout';
import { BuyerMap } from './components/BuyerMap';
import { BuyerDashboard } from './components/BuyerDashboard';
import { SupplierDashboard } from './components/SupplierDashboard';
import { SupplierQuotes } from './components/SupplierQuotes';
import { SupplierInventory } from './components/SupplierInventory';
import { Fleet } from './components/Fleet';
import { Compliance } from './components/Compliance';
import { Training } from './components/Training';
import { Settings } from './components/Settings';
import { Stats } from './components/Stats';
import { BraemarTerminal } from './components/BraemarTerminal';
import { Marketplace } from './components/Marketplace';
import { SupplierListingConsole } from './components/SupplierListingConsole';
import { ViewMode, Page, Port } from './types';

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
        return <Navigate to="/" replace />;
    }

    return children;
};

const Dashboard: React.FC = () => {
  // Original App Logic for Dashboard
  const { user } = useAuth();
  const location = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>(user?.role === 'SUPPLIER' ? 'SUPPLIER' : 'BUYER');
  const [currentPage, setCurrentPage] = useState<Page>('MAP');
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | undefined>(undefined);

  useEffect(() => {
      if (location.state) {
        const state = location.state as any;
        if (state.targetPage) {
            setCurrentPage(state.targetPage);
        }
        if (state.openOrderId) {
            setOpenOrderId(state.openOrderId);
            // Clear state after consuming? keeping it in state might re-trigger if location doesn't change
            // For now, let's rely on the prop change
        }
      }
  }, [location]);

  const handleSwitchView = (mode: ViewMode) => {
    setViewMode(mode);
    setCurrentPage(mode === 'BUYER' ? 'MAP' : 'DASHBOARD');
  };

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
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

    if (viewMode === 'SUPPLIER') {
        switch (currentPage) {
            case 'DASHBOARD':
                return <SupplierDashboard onNavigate={handleNavigate} openOrderId={openOrderId} />;
            case 'QUOTES':
                return <SupplierQuotes />;
            case 'INVENTORY':
                return <SupplierInventory />;
            case 'LISTINGS':
                return <SupplierListingConsole />;
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
        return <BraemarTerminal />;
      case 'FLEET':
        return <Fleet />;
      case 'COMPLIANCE':
        return <Compliance />;
      case 'TRAINING':
         return <Training />;
      case 'STATS':
         return <Stats />;
      case 'DIRECT_ORDER_MARKETPLACE':
         return <Marketplace initialPort={selectedPort}/>;
      default:
        return <BuyerMap onPortSelect={handlePortSelect} onNavigate={handleNavigate} onOrderClick={handleOrderClick} />;
    }
  };

  return (
    <Layout 
      viewMode={viewMode} 
      onSwitchView={handleSwitchView} 
      currentPage={currentPage}
      onNavigate={handleNavigate}
    >
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
        <CopilotProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    
                    <Route path="/create-organization" element={<CreateOrganizationPage />} />

                    <Route path="/onboarding" element={
                        <ProtectedRoute>
                            <OnboardingGuard> {/* OnboardingGuard here to redirect if already onboarded */}
                                <OnboardingPage />
                            </OnboardingGuard>
                        </ProtectedRoute>
                    } />
                    
                    <Route path="/" element={
                        <ProtectedRoute>
                            <RequireOrganization>
                                <RequireProfile>
                                    <Dashboard />
                                </RequireProfile>
                            </RequireOrganization>
                        </ProtectedRoute>
                    } />
                    {/* Fallback */}
                    <Route path="*" element={
                         <Navigate to="/" replace />
                    } />
                </Routes>
            </BrowserRouter>
        </CopilotProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
