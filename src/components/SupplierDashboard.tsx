import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Check, TrendingUp, Clock, Anchor, Loader2 } from 'lucide-react';
import { Trade, Page, TradeStatus } from '../types';
import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';

interface SupplierDashboardProps {
    onNavigate: (page: Page) => void;
    openOrderId?: string;
}

import { useCopilotContext } from '../context/CopilotContext';

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({ onNavigate, openOrderId }) => {
    const { setPageContext } = useCopilotContext();
    const [activeTab, setActiveTab] = useState<'INCOMING' | 'ACTIVE' | 'HISTORY'>('INCOMING');
    const [orders, setOrders] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Scroll to order
    useEffect(() => {
        if (!loading && openOrderId) {
            // Check which tab this order belongs to and switch if necessary
            const order = orders.find(o => o.id === openOrderId);
            if (order) {
                if (order.status === 'PENDING_CONFIRMATION') setActiveTab('INCOMING');
                else if (order.status === 'CONFIRMED') setActiveTab('ACTIVE');
                else setActiveTab('HISTORY');

                // Wait for render
                setTimeout(() => {
                    const element = document.getElementById(`order-${openOrderId}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.classList.add('bg-emerald-500/20');
                        setTimeout(() => element.classList.remove('bg-emerald-500/20'), 3000);
                    }
                }, 100);
            }
        }
    }, [loading, openOrderId, orders]);

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'ACCEPT' | 'ERROR' | 'SUCCESS' | null;
        title: string;
        message: string;
        id?: string;
        variant?: 'danger' | 'warning' | 'info' | 'success';
    }>({
        isOpen: false,
        type: null,
        title: '',
        message: ''
    });
    
    const closeConfirm = () => {
         if (processing) return;
         setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    // Fetch Orders from API
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await api.trades.myTrades();
                setOrders(data);
            } catch (e) {
                console.error("Error fetching trades", e);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    // Update Context
    useEffect(() => {
        if (!loading) {
            setPageContext({
                view: 'Supplier Command Center',
                pending_requests: orders.filter(r => r.status === 'PENDING_CONFIRMATION').length,
                active_orders: orders.filter(r => r.status === 'CONFIRMED').length,
                volume_sold: `${formatVolume(volumeSold)} MT`,
                summary: 'Overview of incoming order requests and active orders.'
            });
        }
    }, [orders, loading, setPageContext]);

    const handleAccept = (id: string) => {
        setConfirmState({
            isOpen: true,
            type: 'ACCEPT',
            title: 'Accept Order Request',
            message: 'Are you sure you want to ACCEPT this order request?',
            id,
            variant: 'info'
        });
    };

    const handleConfirmAction = async () => {
        if (confirmState.type === 'ACCEPT' && confirmState.id) {
            setProcessing(true);
            try {
                await api.trades.confirm(confirmState.id);
                // Refresh list
                const data = await api.trades.myTrades();
                setOrders(data);
                closeConfirm();
            } catch (error) {
                console.error("Failed to accept", error);
                setConfirmState({
                    isOpen: true,
                    type: 'ERROR',
                    title: 'Action Failed',
                    message: 'Error accepting order',
                    variant: 'danger'
                });
            } finally {
                setProcessing(false);
            }
        } else {
            closeConfirm();
        }
    };

    // Calculate KPI values from real order data
    const volumeSold = orders
        .filter(o => o.status === 'DELIVERED' || o.status === 'PAID')
        .reduce((sum, o) => sum + (Number(o.final_quantity_mt) || Number(o.quantity_mt) || 0), 0);

    const activeOrdersValue = orders
        .filter(o => o.status === 'CONFIRMED' || o.status === 'PENDING_CONFIRMATION')
        .reduce((sum, o) => {
            const qty = o.quantity_mt ?? 0;
            const price = o.price_per_mt_usd ?? 0;
            return sum + qty * price;
        }, 0);

    const formatVolume = (mt: number): string => {
        return mt.toLocaleString('en-US', { maximumFractionDigits: 0 });
    };

    const formatCurrency = (usd: number): string => {
        if (usd >= 1_000_000) {
            const millions = usd / 1_000_000;
            return `$${millions.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
        }
        return `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    };

    if (loading) {
        return (
            <div className="p-10 flex justify-center">
                <Loader2 size={40} className="animate-spin text-verdaxis" />
            </div>
        );
    }

    const filteredOrders = orders.filter(req => {
        if (activeTab === 'INCOMING') return req.status === 'PENDING_CONFIRMATION';
        if (activeTab === 'ACTIVE') return req.status === 'CONFIRMED';
        if (activeTab === 'HISTORY') return ['DECLINED', 'DELIVERED', 'PAID', 'CANCELLED'].includes(req.status);
        return true;
    });

    return (
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl v-heading">Command Center</h1>
                    <p className="text-slate-500 mt-1">Port of Rotterdam Hub • ID: SUP-882</p>
                </div>
                <button 
                    onClick={() => onNavigate('INVENTORY')}
                    className="bg-[#4CAF50] text-white px-4 py-2 rounded-lg font-bold shadow-sm flex items-center space-x-2 hover:bg-green-600 transition-colors"
                >
                    <Anchor size={18} />
                    <span>Update Inventory</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 lg:gap-6 mb-8">
                <div className="v-card p-6 relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('QUOTES')}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-100 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 text-slate-500 mb-2 font-bold text-xs uppercase tracking-wide">
                            <Clock size={16} className="text-red-500" />
                            <span>Pending Actions</span>
                        </div>
                        <div className="text-4xl v-heading">
                            {orders.filter(r => r.status === 'PENDING_CONFIRMATION').length}
                        </div>
                        <div className="text-xs text-red-500 font-bold mt-1">High Priority</div>
                    </div>
                </div>

                <div className="v-card p-6">
                     <div className="flex items-center space-x-2 text-slate-500 mb-2 font-bold text-xs uppercase tracking-wide">
                        <TrendingUp size={16} className="text-[#4CAF50]" />
                        <span>Volume Sold (MT)</span>
                    </div>
                    <div className="text-4xl v-heading">{formatVolume(volumeSold)}</div>
                    <div className="text-xs text-[#4CAF50] font-bold mt-1">{volumeSold > 0 ? 'Delivered + Paid' : 'No deliveries yet'}</div>
                </div>

                <div className="v-card p-6 cursor-pointer" onClick={() => onNavigate('QUOTES')}>
                     <div className="flex items-center space-x-2 text-slate-500 mb-2 font-bold text-xs uppercase tracking-wide">
                        <Check size={16} className="text-[#5DADE2]" />
                        <span>Active Orders</span>
                    </div>
                    <div className="text-4xl v-heading">
                        {orders.filter(r => r.status === 'CONFIRMED').length}
                    </div>
                    <div className="text-xs text-slate-400 font-bold mt-1">{formatCurrency(activeOrdersValue)} Potential Value</div>
                </div>
            </div>

            {/* Order Management */}
            <div className="v-card overflow-hidden">
                <div className="border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex space-x-8">
                    {['INCOMING', 'ACTIVE', 'HISTORY'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`text-sm font-bold pb-4 -mb-4 border-b-2 transition-colors ${
                                activeTab === tab 
                                ? 'border-[#334155] text-[#334155] dark:text-white dark:border-white'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#1e293b] text-xs uppercase text-slate-300 font-bold tracking-wider">
                                <th className="px-6 py-4">Order ID</th>
                                <th className="px-6 py-4">Buyer</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Delivery</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {filteredOrders.map((req, index) => (
                                <tr key={req.id} id={`order-${req.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-[#334155] dark:text-slate-200 font-mono">ORD-{String(index + 1).padStart(3, '0')}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#334155] dark:text-slate-200">{req.buyer_name || 'Anonymous'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-[#334155] dark:text-slate-200">{req.fuel_type} &middot; {req.region}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{req.quantity_mt?.toLocaleString()} MT @ ${req.price_per_mt_usd}/MT</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Spot'}</td>
                                    <td className="px-6 py-4">
                                        {req.status === 'PENDING_CONFIRMATION' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                                                Action Required
                                            </span>
                                        ) : req.status === 'CONFIRMED' ? (
                                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                                                Confirmed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-300">
                                                {req.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {req.status === 'PENDING_CONFIRMATION' ? (
                                            <button
                                                onClick={() => handleAccept(req.id)}
                                                disabled={processing}
                                                className="bg-[#334155] hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                {processing ? '...' : 'Accept Order'}
                                            </button>
                                        ) : (
                                            <button
                                                className="text-slate-400 hover:text-[#334155] dark:hover:text-slate-200"
                                                title="View details"
                                            >
                                                <MoreHorizontal size={20} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {filteredOrders.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            No orders found in this category.
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={closeConfirm}
                onConfirm={handleConfirmAction}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                isLoading={processing}
                cancelText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? undefined : 'Cancel'}
                confirmText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? 'Close' : 'Confirm'}
            />
        </div>
    );
};