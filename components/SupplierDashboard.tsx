import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Check, TrendingUp, Clock, Anchor, Loader2 } from 'lucide-react';
import { QuoteRequest, Page } from '../types';
import { CreateQuoteModal } from './supplier/CreateQuoteModal';
import { api } from '../services/api';

interface SupplierDashboardProps {
    onNavigate: (page: Page) => void;
}

export const SupplierDashboard: React.FC<SupplierDashboardProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'INCOMING' | 'ACTIVE' | 'HISTORY'>('INCOMING');
    const [requests, setRequests] = useState<QuoteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    // Fetch Quotes from API
    useEffect(() => {
        const fetchQuotes = async () => {
            try {
                const data = await api.quotes.list('SUPPLIER');
                setRequests(data);
            } catch (e) {
                console.error("Error fetching quotes", e);
            } finally {
                setLoading(false);
            }
        };
        fetchQuotes();
    }, []);

    const handleOpenQuote = (id: string) => {
        setSelectedRequest(id);
    };

    const handleSubmitQuote = async () => {
        if (selectedRequest) {
            setProcessing(true);
            try {
                // Optimistic UI update could happen here, but we'll wait for API
                const updatedReq = await api.quotes.update(selectedRequest, { 
                    status: 'Quoted', 
                    price: 560000 
                });
                
                setRequests(prev => prev.map(r => r.id === selectedRequest ? updatedReq : r));
                setSelectedRequest(null);
            } catch (e) {
                alert("Failed to submit quote");
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
                            {requests.filter(r => r.status === 'Pending').length}
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
                        <span>Active Quotes</span>
                    </div>
                    <div className="text-4xl v-heading">
                        {requests.filter(r => r.status === 'Quoted').length}
                    </div>
                    <div className="text-xs text-slate-400 font-bold mt-1">$4.2M Potential Value</div>
                </div>
            </div>

            {/* Quote Management */}
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
                            <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-bold tracking-wider">
                                <th className="px-6 py-4">Request ID</th>
                                <th className="px-6 py-4">Vessel / Buyer</th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {requests.map((req) => (
                                <tr key={req.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-4 font-medium text-[#334155] font-mono">{req.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-[#334155]">Verdaxis Pioneer</div>
                                        <div className="text-xs text-slate-400">Global Shipping Co.</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            <span className={`w-2 h-2 rounded-full ${req.fuelType === 'Methanol' ? 'bg-blue-400' : 'bg-green-400'}`}></span>
                                            <span>{req.fuelType}</span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5">{req.quantity} MT</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{req.deliveryDate}</td>
                                    <td className="px-6 py-4">
                                        {req.status === 'Pending' ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Action Required
                                            </span>
                                        ) : req.status === 'Confirmed' ? (
                                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Confirmed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                Quoted
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {req.status === 'Pending' ? (
                                            <button 
                                                onClick={() => handleOpenQuote(req.id)}
                                                disabled={processing}
                                                className="bg-[#334155] hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded shadow-sm transition-colors disabled:opacity-50"
                                            >
                                                {processing && selectedRequest === req.id ? 'Sending...' : 'Create Quote'}
                                            </button>
                                        ) : (
                                            <button 
                                                className="text-slate-400 hover:text-[#334155]"
                                                title="🚧 View details - Feature under construction"
                                            >
                                                <MoreHorizontal size={20} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {requests.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            No requests found in this category.
                        </div>
                    )}
                </div>
            </div>

            {/* Create Quote Modal */}
            {selectedRequest && (
                <CreateQuoteModal 
                    requestId={selectedRequest} 
                    onClose={() => setSelectedRequest(null)} 
                    onSubmit={handleSubmitQuote} 
                />
            )}
        </div>
    );
};