
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewMode, Page } from '../types';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { ActingOrganizationBanner } from './market-support/ActingOrganizationBanner';
import { useMarketSupport } from '../context/MarketSupportContext';
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
    const navigate = useNavigate();
    const { context, exit } = useMarketSupport();
    const [exitError, setExitError] = useState<string | null>(null);
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
                isMarketSupportActive={Boolean(context)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Header 
                    viewMode={viewMode}
                    onSwitchView={onSwitchView}
                    onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                    isMarketSupportActive={Boolean(context)}
                />

                {context && <ActingOrganizationBanner context={context} onExit={() => {
                    setExitError(null);
                    void exit().then(() => navigate('/app/admin/users')).catch((error) => {
                        setExitError(error instanceof Error ? error.message : 'Exit request failed. The local assisted workspace was detached.');
                        navigate('/app/home');
                    });
                }} />}
                {exitError && <div role="alert" className="border-b border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/60 dark:text-red-100">Exit request failed; this tab was detached locally. {exitError}</div>}

                <main
                    data-dashboard-page={currentPage}
                    data-dashboard-view-mode={viewMode}
                    className="flex-1 overflow-y-auto p-0 relative z-0 bg-slate-50 dark:bg-slate-900 transition-colors duration-200"
                >
                    {children}
                </main>

                {/* Copilot removed per Gavin feedback */}
            </div>
        </div>
    );
};
