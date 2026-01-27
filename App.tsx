
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { BuyerMap } from './components/BuyerMap';
import { Marketplace } from './components/Marketplace';
import { SupplierDashboard } from './components/SupplierDashboard';
import { SupplierQuotes } from './components/SupplierQuotes';
import { SupplierInventory } from './components/SupplierInventory';
import { Fleet } from './components/Fleet';
import { Compliance } from './components/Compliance';
import { Training } from './components/Training';
import { Settings } from './components/Settings';
import { Stats } from './components/Stats';
import { ViewMode, Page, Port } from './types';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('BUYER');
  const [currentPage, setCurrentPage] = useState<Page>('MAP');
  const [selectedPort, setSelectedPort] = useState<Port | null>(null);

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

  // Simple router implementation
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
            default:
                return <SupplierDashboard onNavigate={handleNavigate} />;
        }
    }

    switch (currentPage) {
      case 'MAP':
        return <BuyerMap onPortSelect={handlePortSelect} onNavigate={handleNavigate} />;
      case 'MARKETPLACE':
        return <Marketplace initialPort={selectedPort} />;
      case 'FLEET':
        return <Fleet />;
      case 'COMPLIANCE':
        return <Compliance />;
      case 'TRAINING':
         return <Training />;
      case 'STATS':
         return <Stats />;
      default:
        return <BuyerMap onPortSelect={handlePortSelect} onNavigate={handleNavigate} />;
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

export default App;
