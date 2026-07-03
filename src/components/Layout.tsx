
import React, { useState } from 'react';
import { ViewMode, Page } from '../types';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { RFQOfferAlert } from './rfq/RFQOfferAlert';
// Copilot removed per Gavin feedback

interface LayoutProps {
    children: React.ReactNode;
    viewMode: ViewMode;
    onSwitchView: (mode: ViewMode) => void;
    currentPage: Page;
    onNavigate: (page: Page) => void;
    onPrefetchPage?: (page: Page) => void;
    onPrimaryAction?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
    children,
    viewMode,
    onSwitchView,
    currentPage,
    onNavigate,
    onPrefetchPage,
    onPrimaryAction
}) => {
    const { user } = useAuth();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-200 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-[65] md:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            <Sidebar 
                viewMode={viewMode}
                currentPage={currentPage}
                onNavigate={onNavigate}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                isMobileOpen={isMobileSidebarOpen}
                onMobileClose={() => setIsMobileSidebarOpen(false)}
                userRole={user?.role}
                onPrimaryAction={onPrimaryAction}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Header 
                    viewMode={viewMode}
                    onSwitchView={onSwitchView}
                    onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                />

                <main
                    data-dashboard-page={currentPage}
                    data-dashboard-view-mode={viewMode}
                    className="flex-1 overflow-y-auto p-0 relative z-0 bg-slate-50 dark:bg-slate-900 transition-colors duration-200"
                >
                    {children}
                </main>

                {/* RFQ offer alert — floats top-right when a quote/counter arrives */}
                <RFQOfferAlert onNavigateToRFQ={() => onNavigate('MARKETPLACE')} />

                {/* Copilot removed per Gavin feedback */}
            </div>
        </div>
    );
};
