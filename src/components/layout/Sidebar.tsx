import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    Settings as SettingsIcon,
    ChevronsLeft,
    ChevronsRight,
    Hexagon,
    ShieldCheck,
    Plus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ViewMode, Page } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { buildPrimarySidebarItems } from './sidebarConfig';

interface SidebarProps {
    viewMode: ViewMode;
    currentPage: Page;
    onNavigate: (page: Page) => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    isMobileOpen: boolean;
    onMobileClose: () => void;
    userRole?: string | null;
    onPrimaryAction?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    viewMode,
    currentPage,
    onNavigate,
    isCollapsed,
    onToggleCollapse,
    isMobileOpen,
    onMobileClose,
    userRole,
    onPrimaryAction,
}) => {
    const [logoError, setLogoError] = useState(false);
    const { t } = useTranslation();

    const sidebarItems = buildPrimarySidebarItems(t, viewMode);

    const handleNavigate = (page: Page) => {
        onNavigate(page);
        onMobileClose();
    };

    return (
        <aside
            className={`
                fixed md:static inset-y-0 left-0 z-[70]
                bg-[#343E50] dark:bg-[#0f172a] border-r border-[#2A3344] dark:border-[#1e293b] text-white flex flex-col flex-shrink-0 shadow-xl
                transition-all duration-300 ease-in-out
                ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                ${isCollapsed ? 'md:w-20' : 'md:w-64'}
                w-64
            `}
        >
            <div className={`p-6 border-b border-[#2A3344] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-11 h-11 bg-white rounded-lg p-1.5 flex items-center justify-center flex-shrink-0 shadow-inner">
                        {!logoError ? (
                            <img
                                src="/verdaxis-logo-no-words.png"
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
                    <span>{viewMode === 'BUYER' ? t('sidebar.buyerPlatform') : t('sidebar.supplierPlatform')}</span>
                    <div className={`w-2 h-2 rounded-full ${viewMode === 'BUYER' ? 'bg-verdaxis' : 'bg-[#22D37A]'}`}></div>
                </div>
            )}

            <div className="px-3 pt-4 pb-2">
                <button
                    data-tour="sidebar-primary-action"
                    onClick={() => (onPrimaryAction ? onPrimaryAction() : handleNavigate('MARKETPLACE'))}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-colors bg-emerald-600 hover:bg-emerald-500 text-white ${isCollapsed ? 'px-2' : 'px-4'}`}
                >
                    <Plus size={18} />
                    {!isCollapsed && (viewMode === 'BUYER' ? t('sidebar.postBid') : t('sidebar.postSupply'))}
                </button>
            </div>

            <nav className="flex-1 py-2 space-y-1 px-3">
                {sidebarItems.map((item) => (
                    <Tooltip key={item.key} content={isCollapsed ? item.label : ''} position="right">
                        {/* Real anchors: bookmark/cmd-click/middle-click open the
                            page in a new tab; plain clicks stay SPA navigations. */}
                        <NavLink
                            to={item.path}
                            data-tour={`nav-${item.key}`}
                            onClick={onMobileClose}
                            className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group ${
                                currentPage === item.page
                                    ? (viewMode === 'SUPPLIER'
                                        ? 'bg-[rgba(34,211,122,0.12)] text-white border-l-[3px] border-l-[#22D37A] pl-[9px]'
                                        : 'bg-[rgba(93,173,226,0.12)] text-white border-l-[3px] border-l-verdaxis pl-[9px]')
                                    : 'text-slate-300 hover:bg-[#2A3344] hover:text-white border-l-[3px] border-l-transparent pl-[9px]'
                            } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                        >
                            <item.icon size={20} className={`flex-shrink-0 ${currentPage === item.page ? (viewMode === 'SUPPLIER' ? 'text-[#22D37A]' : 'text-verdaxis') : 'text-slate-400 group-hover:text-white'}`} />
                            {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
                        </NavLink>
                    </Tooltip>
                ))}
            </nav>

            <div className="p-4 border-t border-[#2A3344] space-y-1">
                {userRole === 'ADMIN' && (
                    <Tooltip content={isCollapsed ? t('sidebar.admin') : ''} position="right">
                        <NavLink
                            to="/app/admin"
                            onClick={onMobileClose}
                            className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors group ${
                                currentPage === 'ADMIN'
                                    ? 'bg-amber-500 text-white shadow-lg'
                                    : 'text-slate-300 hover:bg-[#2A3344] hover:text-white'
                            } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                        >
                            <ShieldCheck size={20} className={`flex-shrink-0 ${currentPage === 'ADMIN' ? 'text-white' : 'text-amber-400 group-hover:text-white'}`} />
                            {!isCollapsed && <span className="truncate font-medium">{t('sidebar.admin')}</span>}
                        </NavLink>
                    </Tooltip>
                )}
                <Tooltip content={isCollapsed ? t('sidebar.settings') : ''} position="right">
                    <NavLink
                        to="/app/settings"
                        onClick={onMobileClose}
                        className={`flex items-center w-full px-3 py-2 rounded-lg transition-colors group ${
                            currentPage === 'SETTINGS'
                                ? 'bg-verdaxis text-white shadow-lg'
                                : 'text-slate-300 hover:bg-[#2A3344] hover:text-white'
                        } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
                    >
                        <SettingsIcon size={20} className={`flex-shrink-0 ${currentPage === 'SETTINGS' ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                        {!isCollapsed && <span className="truncate">{t('sidebar.settings')}</span>}
                    </NavLink>
                </Tooltip>

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
