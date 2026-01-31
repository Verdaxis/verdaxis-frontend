
import React, { useState } from 'react';
import { 
    Menu,
    Search,
    Bell,
    AlertTriangle,
    CheckCircle2,
    UserCircle,
    ChevronDown,
    LogOut
} from 'lucide-react';
import { ViewMode } from '../../types';
import { Tooltip } from '../ui/Tooltip';
import { NOTIFICATIONS } from '../../data';

interface HeaderProps {
    viewMode: ViewMode;
    onSwitchView: (mode: ViewMode) => void;
    onOpenMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ viewMode, onSwitchView, onOpenMobileSidebar }) => {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    return (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 shadow-sm z-[50] relative transition-colors duration-200">
            <div className="flex items-center flex-1">
                <button 
                    className="md:hidden mr-4 text-slate-500 hover:text-verdaxis-dark"
                    onClick={onOpenMobileSidebar}
                >
                    <Menu size={24} />
                </button>
                
                <div className="relative w-full max-w-xs md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder={viewMode === 'BUYER' ? "Search..." : "Search requests..."}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-verdaxis text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
                    />
                </div>
            </div>

            <div className="flex items-center space-x-3 md:space-x-6 ml-4">
                {/* Notifications Dropdown */}
                <div className="relative">
                    <Tooltip content="View Notifications" position="bottom">
                        <button 
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className={`relative p-2 rounded-full transition-colors ${isNotificationsOpen ? 'bg-slate-100 text-verdaxis-dark' : 'text-slate-500 hover:text-verdaxis-dark hover:bg-slate-50'}`}
                        >
                            <Bell size={20} />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                        </button>
                    </Tooltip>

                    {isNotificationsOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 py-1 animate-in fade-in slide-in-from-top-2 duration-200 z-[70]">
                            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                <p className="text-sm font-bold text-verdaxis-dark dark:text-slate-200">Notifications</p>
                                <span className="text-xs font-bold text-verdaxis cursor-pointer">Mark all read</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                                {NOTIFICATIONS.map(notif => (
                                    <div key={notif.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 last:border-0 cursor-pointer group transition-colors">
                                        <div className="flex items-start space-x-3">
                                            <div className={`mt-1 p-1 rounded-full flex-shrink-0 
                                                ${notif.type === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 
                                                    notif.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`
                                            }>
                                                {notif.type === 'warning' ? <AlertTriangle size={12} /> : 
                                                    notif.type === 'success' ? <CheckCircle2 size={12} /> : <Bell size={12} />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-verdaxis-dark dark:text-slate-200 group-hover:text-verdaxis transition-colors">{notif.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{notif.desc}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 font-bold">{notif.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center">
                                <button className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-verdaxis-dark dark:hover:text-slate-200">View All Activity</button>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Profile Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center space-x-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                    >
                        <div className="text-right hidden md:block">
                            <div className="text-sm font-bold text-verdaxis-dark dark:text-slate-200">
                                {viewMode === 'BUYER' ? 'Sarah Jenkins' : 'David Chen'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                                {viewMode === 'BUYER' ? 'Head of Procurement' : 'Ops Manager'}
                            </div>
                        </div>
                        <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center border border-slate-300 text-slate-500">
                            <UserCircle size={24} />
                        </div>
                        <ChevronDown size={16} className="text-slate-400 hidden md:block" />
                    </button>

                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-100 dark:border-slate-700 py-1 animate-in fade-in slide-in-from-top-2 duration-200 z-[70]">
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
                                <span>Buyer View</span>
                                {viewMode === 'BUYER' && <div className="w-2 h-2 bg-verdaxis rounded-full"></div>}
                            </button>
                            <button 
                                onClick={() => {
                                    onSwitchView('SUPPLIER');
                                    setIsProfileOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between ${viewMode === 'SUPPLIER' ? 'text-verdaxis-green font-bold' : 'text-slate-600 dark:text-slate-300'}`}
                            >
                                <span>Supplier View</span>
                                {viewMode === 'SUPPLIER' && <div className="w-2 h-2 bg-verdaxis-green rounded-full"></div>}
                            </button>
                            <div className="border-t border-slate-100 dark:border-slate-700 mt-1">
                                <button className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2">
                                    <LogOut size={16} />
                                    <span>Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};