
import React, { useState } from 'react';
import { ViewMode, Page } from '../types';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { Copilot } from './ai/Copilot';

interface LayoutProps {
    children: React.ReactNode;
    viewMode: ViewMode;
    onSwitchView: (mode: ViewMode) => void;
    currentPage: Page;
    onNavigate: (page: Page) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, 
    viewMode, 
    onSwitchView,
    currentPage,
    onNavigate
}) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden">
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
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <Header 
                    viewMode={viewMode}
                    onSwitchView={onSwitchView}
                    onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                />

                <main className="flex-1 overflow-y-auto p-0 relative z-0 bg-[#F8FAFC]">
                    {children}
                </main>
                
                {/* AI Copilot Overlay */}
                <Copilot />
            </div>
        </div>
    );
};
