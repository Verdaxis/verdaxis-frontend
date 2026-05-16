
import React, { useState } from 'react';
import {
    Menu,
    Search,
    Bell,
    AlertTriangle,
    CheckCircle2,
    UserCircle,
    ChevronDown,
    LogOut,
    Compass
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ViewMode } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { useAuth } from '../../context/AuthContext';
import { useTutorial } from '../../context/TutorialContext';
import { NotificationBell } from '../notifications/NotificationBell';
import LanguageSelector from '../LanguageSelector';

interface HeaderProps {
    viewMode: ViewMode;
    onSwitchView: (mode: ViewMode) => void;
    onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ viewMode, onSwitchView, onOpenMobileSidebar }) => {
    const { user, logout } = useAuth();
    const { start: startTutorial } = useTutorial();
    const { t } = useTranslation();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <header className="h-16 bg-[#343E50] dark:bg-[#0f172a] border-b border-[#2A3344] dark:border-[#1e293b] flex items-center justify-between px-4 md:px-6 shadow-sm z-[50] relative transition-colors duration-200">
            <div className="flex items-center flex-1">
                <button
                    data-tour="mobile-menu"
                    className="md:hidden mr-4 text-slate-500 hover:text-verdaxis-dark"
                    onClick={onOpenMobileSidebar}
                >
                    <Menu size={24} />
                </button>

                <div className="relative w-full max-w-xs md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder={viewMode === 'BUYER' ? t('header.search') : t('header.searchRequests')}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-[#2A3344] bg-[#2A3344] dark:bg-[#0A1628] focus:outline-none focus:ring-2 focus:ring-verdaxis text-sm text-white placeholder-slate-400"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-3 md:space-x-6 ml-4">
                {/* Language Selector */}
                <LanguageSelector />

                {/* Platform Tour Button */}
                <Tooltip content={t('header.platformTour')} position="bottom">
                    <button
                        onClick={startTutorial}
                        data-tour="tour-button"
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white border border-[#2A3344] rounded-lg hover:border-verdaxis transition-all duration-200"
                    >
                        <Compass size={14} />
                        <span className="hidden md:inline">{t('header.platformTour')}</span>
                    </button>
                </Tooltip>

                {/* Notifications Dropdown */}
                <div className="relative" data-tour="notification-bell">
                    <Tooltip content="View Notifications" position="bottom">
                        <NotificationBell />
                    </Tooltip>
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center space-x-3 hover:bg-[#2A3344] p-2 rounded-lg transition-colors"
                    >
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-white">
                                {user ? `${user.first_name} ${user.last_name}` : 'Guest User'}
                            </div>
                            <div className="text-xs text-slate-400">
                                {user && user.role === 'BUYER'
                                    ? t('header.roleBuyer')
                                    : user && user.role === 'SUPPLIER'
                                    ? t('header.roleSupplier')
                                    : user && user.role === 'ADMIN'
                                    ? t('header.roleAdmin')
                                    : 'Guest'}
                            </div>
                        </div>
                        <div className="h-10 w-10 bg-[#2A3344] rounded-full flex items-center justify-center border border-[#3A4A60] text-slate-400">
                            <UserCircle size={24} />
                        </div>
                        <ChevronDown size={16} className="text-slate-400 hidden md:block" />
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 py-1 animate-in fade-in slide-in-from-top-2 duration-200 z-[70]">
                            {user?.role === 'ADMIN' && (
                                <>
                                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                                        <p className="text-xs font-bold text-slate-400 uppercase">Role Switcher</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            onSwitchView('BUYER');
                                            setIsProfileOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between ${viewMode === 'BUYER' ? 'text-verdaxis font-bold' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        <span>{t('header.roleBuyer')} View</span>
                                        {viewMode === 'BUYER' && <div className="w-2 h-2 bg-verdaxis rounded-full"></div>}
                                    </button>
                                    <button
                                        onClick={() => {
                                            onSwitchView('SUPPLIER');
                                            setIsProfileOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between ${viewMode === 'SUPPLIER' ? 'text-verdaxis-green font-bold' : 'text-slate-600 dark:text-slate-300'}`}
                                    >
                                        <span>{t('header.roleSupplier')} View</span>
                                        {viewMode === 'SUPPLIER' && <div className="w-2 h-2 bg-verdaxis-green rounded-full"></div>}
                                    </button>
                                </>
                            )}
                            <div className="border-t border-slate-100 dark:border-slate-700 mt-1">
                                <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2">
                                    <LogOut size={16} />
                                    <span>{t('btn.signOut')}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
