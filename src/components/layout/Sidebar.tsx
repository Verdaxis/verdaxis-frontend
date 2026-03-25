import React, { useState } from 'react';
import {
    LayoutDashboard,
    Map as MapIcon,
    ShoppingCart,
    Ship,
    GraduationCap,
    Settings as SettingsIcon,
    ChevronsLeft,
    ChevronsRight,
    FileText,
    Hexagon,
    MonitorDot,
    ArrowLeftRight,
    ShieldCheck,
    Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ViewMode, Page } from '../../types';
import { Tooltip } from '../ui/Tooltip';

interface SidebarProps {
    viewMode: ViewMode;
    currentPage: Page;
    onNavigate: (page: Page) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isMobileOpen: boolean;
    onMobileClose: () => void;
    userRole?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
    viewMode,
    currentPage,
    onNavigate,
    isCollapsed,
    onToggleCollapse,
    isMobileOpen,
    onMobileClose,
    userRole
}) => {
    const [logoError, setLogoError] = useState(false);
    const { t } = useTranslation();

    const sidebarItems = viewMode === 'BUYER' ? [
        { id: 'MAP', label: t('sidebar.intelligenceMap'), icon: MapIcon },
        { id: 'MARKETPLACE', label: t('sidebar.marketplace'), icon: ShoppingCart },
        { id: 'TERMINAL', label: t('sidebar.marketTerminal'), icon: MonitorDot },
        { id: 'FLEET', label: t('sidebar.myFleet'), icon: Ship },
        { id: 'TRADES', label: t('sidebar.tradeHistory'), icon: ArrowLeftRight },
        { id: 'WATCHLISTS', label: t('sidebar.watchlists'), icon: Star },
        { id: 'COMPLIANCE', label: t('sidebar.compliance'), icon: FileText },
        { id: 'TRAINING', label: t('sidebar.training'), icon: GraduationCap },
    ] : [
        { id: 'DASHBOARD', label: t('sidebar.commandCenter'), icon: LayoutDashboard },
        { id: 'MARKETPLACE', label: t('sidebar.marketplace'), icon: ShoppingCart },
        { id: 'TERMINAL', label: t('sidebar.marketTerminal'), icon: MonitorDot },
        { id: 'TRADES', label: t('sidebar.tradeHistory'), icon: ArrowLeftRight },
        { id: 'WATCHLISTS', label: t('sidebar.watchlists'), icon: Star },
    ];

    const handleNavigate = (page: Page) => {
        onNavigate(page);
        onMobileClose();
    };

    return (
        <aside className={`
            fixed md:static inset-y-0 left-0 z-[70]
            bg-[#343E50] dark:bg-[#0f172a] border-r border-[#2A3344] dark:border-[#1e293b] text-white flex flex-col flex-shrink-0 shadow-xl 
            transition-all duration-300 ease-in-out
            ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            ${isCollapsed ? 'md:w-20' : 'md:w-64'}
            w-64
        `}>
            <div className={`p-6 border-b border-[#2A3344] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <div className="flex items-center space-x-3 overflow-hidden">
                    {/* Logo Container - Rounded White Square */}
                    <div className="w-11 h-11 bg-white rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 shadow-inner">
                        {!logoError ? (
                            <img
                                src="https://marinachain-image-hosting.s3.ap-southeast-1.amazonaws.com/miscellaneous/verdaxis_logo_no_words.png"
                                alt="Verdaxis"
                                className="w-full h-full object-contain transform hover:scale-105 transition-transform duration-300"
                                onError={() => setLogoError(true)}
                            />
                        ) : (
                            <div className="w-9 h-9 bg-verdaxis flex items-center justify-center rounded-lg shadow-md">
                                <Hexagon size={20} className="text-white" fill="currentColor" />
                            </div>
                        )}
                    </div>
                    {!isCollapsed && (
                        <span className="font-['Montserrat'] font-bold text-xl tracking-wide truncate text-white">VERDAXIS</span>
                    )}
                </div>
                {!isCollapsed && (
                    <button onClick={onToggleCollapse} className="hidden md:block text-slate-400 hover:text-white transition-colors">
                        <ChevronsLeft size={20} />
                    </button>
                )}
            </div>

            {!isCollapsed && (
                <div className="px-6 mt-6 mb-2 text-xs text-slate-400 uppercase tracking-wider font-bold truncate flex items-center justify-between">
                    <span>{viewMode === 'BUYER' ? 'Buyer Platform' : 'Supplier Platform'}</span>
                    <div className={`w-2 h-2 rounded-full ${viewMode === 'BUYER' ? 'bg-verdaxis' : 'bg-verdaxis-green'}`}></div>
                </div>
            )}

            <nav className="flex-1 py-4 space-y-1 px-3">
                {sidebarItems.map((item) => (
                    <Tooltip key={item.id} content={isCollapsed ? item.label : ''} position="right">
                        <button
                            data-tour={`nav-${item.id}`}
                            onClick={() => handleNavigate(item.id as Page)}
                            className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group ${
                                currentPage === item.id
                                ? 'bg-verdaxis text-white shadow-lg'
                                : 'text-slate-300 hover:bg-[#2A3344] hover:text-white'
                            } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                        >
                            <item.icon size={20} className={`flex-shrink-0 ${currentPage === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                            {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
                        </button>
                    </Tooltip>
                ))}
            </nav>

            <div className="p-4 border-t border-[#2A3344] space-y-1">
                {userRole === 'ADMIN' && (
                    <Tooltip content={isCollapsed ? t('sidebar.admin') : ''} position="right">
                        <button
                            onClick={() => handleNavigate('ADMIN')}
                            className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors group ${
                                currentPage === 'ADMIN'
                                ? 'bg-amber-500 text-white shadow-lg'
                                : 'text-slate-300 hover:bg-[#2A3344] hover:text-white'
                            } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                        >
                            <ShieldCheck size={20} className={`flex-shrink-0 ${currentPage === 'ADMIN' ? 'text-white' : 'text-amber-400 group-hover:text-white'}`} />
                            {!isCollapsed && <span className="truncate font-medium">{t('sidebar.admin')}</span>}
                        </button>
                    </Tooltip>
                )}
                <Tooltip content={isCollapsed ? t('sidebar.settings') : ''} position="right">
                    <button
                        onClick={() => handleNavigate('SETTINGS')}
                        className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors group ${
                            currentPage === 'SETTINGS'
                            ? 'bg-verdaxis text-white shadow-lg'
                            : 'text-slate-300 hover:bg-[#2A3344] hover:text-white'
                        } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                    >
                        <SettingsIcon size={20} className={`flex-shrink-0 ${currentPage === 'SETTINGS' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                        {!isCollapsed && <span className="truncate">{t('sidebar.settings')}</span>}
                    </button>
                </Tooltip>

                {/* Desktop Expand Button */}
                {isCollapsed && (
                    <button
                        onClick={onToggleCollapse}
                        className="mt-4 w-full flex justify-center text-slate-400 hover:text-white hidden md:flex transition-colors"
                    >
                        <ChevronsRight size={20} />
                    </button>
                )}
            </div>
        </aside>
    );
};
