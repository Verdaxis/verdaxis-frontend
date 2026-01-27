import React from 'react';
import { ViewMode } from '../types';
import { User, Bell, Shield, Globe, CreditCard } from 'lucide-react';

interface SettingsProps {
    viewMode: ViewMode;
}

export const Settings: React.FC<SettingsProps> = ({ viewMode }) => {
    return (
        <div className="max-w-5xl mx-auto p-4 lg:p-10">
             <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl v-heading">System Settings</h1>
                <p className="text-slate-500 mt-1 lg:mt-2 text-sm lg:text-base">Manage your profile, notifications, and Verdaxis platform preferences.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1">
                    <div className="v-card overflow-hidden">
                        <nav className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible">
                            <button className="flex-shrink-0 flex items-center space-x-3 px-4 lg:px-6 py-3 lg:py-4 bg-slate-50 text-[#334155] border-b-4 lg:border-b-0 lg:border-l-4 border-[#5DADE2] font-bold text-sm">
                                <User size={18} />
                                <span>Profile & Team</span>
                            </button>
                             <button className="flex-shrink-0 flex items-center space-x-3 px-4 lg:px-6 py-3 lg:py-4 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-medium border-b-4 lg:border-b-0 border-transparent">
                                <Bell size={18} />
                                <span>Notifications</span>
                            </button>
                             <button className="flex-shrink-0 flex items-center space-x-3 px-4 lg:px-6 py-3 lg:py-4 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-medium border-b-4 lg:border-b-0 border-transparent">
                                <Shield size={18} />
                                <span>Security</span>
                            </button>
                             <button className="flex-shrink-0 flex items-center space-x-3 px-4 lg:px-6 py-3 lg:py-4 text-slate-500 hover:bg-slate-50 transition-colors text-sm font-medium border-b-4 lg:border-b-0 border-transparent">
                                <CreditCard size={18} />
                                <span>Billing</span>
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Content */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="v-card p-6">
                        <h2 className="text-lg v-heading mb-4 border-b border-slate-100 pb-2">User Profile</h2>
                        <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                            <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 text-2xl font-bold flex-shrink-0">
                                {viewMode === 'BUYER' ? 'SJ' : 'DC'}
                            </div>
                            <div className="flex-1 space-y-4 w-full">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="v-label">First Name</label>
                                        <input type="text" value={viewMode === 'BUYER' ? "Sarah" : "David"} className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-sm font-medium" readOnly />
                                    </div>
                                    <div>
                                        <label className="v-label">Last Name</label>
                                        <input type="text" value={viewMode === 'BUYER' ? "Jenkins" : "Chen"} className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-sm font-medium" readOnly />
                                    </div>
                                </div>
                                <div>
                                    <label className="v-label">Email Address</label>
                                    <input type="email" value={viewMode === 'BUYER' ? "sarah.jenkins@shipping.co" : "david.chen@portservices.net"} className="w-full p-2 border border-slate-200 rounded bg-slate-50 text-sm font-medium" readOnly />
                                </div>
                                <div>
                                    <label className="v-label">Role</label>
                                    <div className="inline-flex items-center px-3 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold">
                                        {viewMode === 'BUYER' ? 'Head of Procurement' : 'Operations Manager'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="v-card p-6">
                        <h2 className="text-lg v-heading mb-4 border-b border-slate-100 pb-2">Preferences</h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-[#334155]">Email Notifications</div>
                                    <div className="text-xs text-slate-500">Receive daily digests of fleet compliance</div>
                                </div>
                                <div className="w-10 h-6 bg-[#5DADE2] rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>
                             <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-[#334155]">Market Alerts</div>
                                    <div className="text-xs text-slate-500">Notify on &gt;5% price shifts in Methanol</div>
                                </div>
                                <div className="w-10 h-6 bg-[#5DADE2] rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>
                             <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-[#334155]">Currency</div>
                                    <div className="text-xs text-slate-500">Display prices in</div>
                                </div>
                                <select className="p-1 border border-slate-200 rounded text-sm font-bold text-[#334155]">
                                    <option>USD ($)</option>
                                    <option>EUR (€)</option>
                                    <option>CNY (¥)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};