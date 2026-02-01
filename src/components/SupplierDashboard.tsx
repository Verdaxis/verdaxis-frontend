import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Check, TrendingUp, Clock, Anchor, Loader2 } from 'lucide-react';
import { Order, Page, OrderStatus } from '../types';
import { api } from '../services/api';

interface SupplierDashboardProps {
    onNavigate: (page: Page) => void;
}

import { useCopilotContext } from '../context/CopilotContext';

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({ onNavigate }) => {
    const { setPageContext } = useCopilotContext();
    const [activeTab, setActiveTab] = useState<'INCOMING' | 'ACTIVE' | 'HISTORY'>('INCOMING');
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Fetch Orders from API
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await api.orders.listIncoming();
                setOrders(data);
            } catch (e) {
                console.error("Error fetching orders", e);
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
                pending_requests: orders.filter(r => r.status === 'PENDING').length,
                active_orders: orders.filter(r => r.status === 'ACCEPTED').length,
                volume_sold: '12,450 MT',
                summary: 'Overview of incoming order requests and active orders.'
            });
        }
    }, [orders, loading, setPageContext]);

    const handleAccept = async (id: string) => {
        if (window.confirm('Are you sure you want to ACCEPT this order request?')) {
            setProcessing(true);
            try {
                await api.orders.respond(id, 'ACCEPTED');
                // Refresh list
                const data = await api.orders.listIncoming();
                setOrders(data);
            } catch (error) {
                console.error("Failed to accept", error);
                alert("Error accepting order");
            } finally {
                setProcessing(false);
            }
        }
    };

    if (loading) {
        return (
            <div className="p-10 flex justify-center">
                <Loader2 size={40} className="animate-spin text-verdaxis" />
            </div>
        );
    }

    const filteredOrders = orders.filter(req => {
        if (activeTab === 'INCOMING') return req.status === 'PENDING';
        if (activeTab === 'ACTIVE') return req.status === 'ACCEPTED';
        if (activeTab === 'HISTORY') return ['DECLINED', 'COMPLETED', 'CANCELLED'].includes(req.status);
        return true;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="v-card p-6 relative overflow-hidden group cursor-pointer" onClick={() => onNavigate('QUOTES')}>
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-100 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10">
                        <div className="flex items-center space-x-2 text-slate-500 mb-2 font-bold text-xs uppercase tracking-wide">
                            <Clock size={16} className="text-red-500" />
                            <span>Pending Actions</span>
                        </div>
                        <div className="text-4xl v-heading">
                            {orders.filter(r => r.status === 'PENDING').length}
                        </div>
                        <div className="text-xs text-red-500 font-bold mt-1">High Priority</div>
                    </div>
                </div>

                <div className="v-card p-6">
                     <div className="flex items-center space-x-2 text-slate-500 mb-2 font-bold text-xs uppercase tracking-wide">
                        <TrendingUp size={16} className="text-[#4CAF50]" />
                        <span>Volume Sold (MT)</span>
                    </div>
                    <div className="text-4xl v-heading">12,450</div>
                    <div className="text-xs text-[#4CAF50] font-bold mt-1">↑ 15% vs last month</div>
                </div>

                <div className="v-card p-6 cursor-pointer" onClick={() => onNavigate('QUOTES')}>
                     <div className="flex items-center space-x-2 text-slate-500 mb-2 font-bold text-xs uppercase tracking-wide">
                        <Check size={16} className="text-[#5DADE2]" />
                        <span>Active Orders</span>
                    </div>
                    <div className="text-4xl v-heading">
                        {orders.filter(r => r.status === 'ACCEPTED').length}
                    </div>
                    <div className="text-xs text-slate-400 font-bold mt-1">$4.2M Potential Value</div>
                </div>
            </div>

            {/* Order Management */}
            <div className="v-card overflow-hidden">
                <div className="border-b border-slate-200 px-6 py-4 flex space-x-8">
                    {['INCOMING', 'ACTIVE', 'HISTORY'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`text-sm font-bold pb-4 -mb-4 border-b-2 transition-colors ${
                                activeTab === tab 
                                ? 'border-[#334155] text-[#334155]' 
                                : 'border-transparent text-slate-400 hover:text-slate-600'
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
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredOrders.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-[#334155] font-mono">{req.id.slice(0, 8)}...</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#334155]">{req.buyer_name || 'Anonymous'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs text-slate-500 mt-0.5">{req.requested_quantity_mt?.toLocaleString()} MT</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{req.requested_delivery_date || 'Spot'}</td>
                                    <td className="px-6 py-4">
                                        {req.status === 'PENDING' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Action Required
                                            </span>
                                        ) : req.status === 'ACCEPTED' ? (
                                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Confirmed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                                {req.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {req.status === 'PENDING' ? (
                                            <button 
                                                onClick={() => handleAccept(req.id)}
                                                disabled={processing}
                                                className="bg-[#334155] hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                {processing ? '...' : 'Accept Order'}
                                            </button>
                                        ) : (
                                            <button 
                                                className="text-slate-400 hover:text-[#334155]"
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
        </div>
    );
};