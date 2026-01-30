
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CopilotProvider } from './context/CopilotContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
import { RFQMarketplace } from './components/RFQMarketplace';
import { SupplierListingConsole } from './components/SupplierListingConsole';
import { RFQModal } from './components/rfq/RFQModal';
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

const Dashboard: React.FC = () => {
  // Original App Logic for Dashboard
  const [viewMode, setViewMode] = useState<ViewMode>('BUYER');
  const [currentPage, setCurrentPage] = useState<Page>('MAP');
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);
  const [isRFQModalOpen, setIsRFQModalOpen] = useState(false);
  const [rfqPort, setRfqPort] = useState<Port | null>(null);

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
    setRfqPort(port);
    setIsRFQModalOpen(true);
  };

  const renderContent = () => {
    if (currentPage === 'SETTINGS') {
        return <Settings viewMode={viewMode} />;
    }

    if (viewMode === 'SUPPLIER') {
        switch (currentPage) {
            case 'DASHBOARD':
                return <SupplierDashboard onNavigate={handleNavigate} />;
            case 'QUOTES':
                return <SupplierQuotes />;
            case 'INVENTORY':
                return <SupplierInventory />;
            case 'LISTINGS':
                return <SupplierListingConsole />;
            default:
                return <SupplierDashboard onNavigate={handleNavigate} />;
        }
    }

    switch (currentPage) {
      case 'MAP':
        return <BuyerMap onPortSelect={handlePortSelect} onNavigate={handleNavigate} onOrderClick={handleOrderClick} />;
      case 'DASHBOARD':
        return <BuyerDashboard onNavigate={handleNavigate} />;
      case 'MARKETPLACE':
        return <RFQMarketplace />;
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
      case 'RFQ_MARKETPLACE':
         return <RFQMarketplace />;
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
      <RFQModal isOpen={isRFQModalOpen} onClose={() => setIsRFQModalOpen(false)} port={rfqPort} />
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CopilotProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/" element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    } />
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </CopilotProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
