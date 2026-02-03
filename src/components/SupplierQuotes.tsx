
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Download, MoreVertical, Trash2, Edit2, X, Save, ChevronDown, ChevronUp, Shield, Building, Clock, Sparkles, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Order } from '../types';
import { Tooltip } from './ui/Tooltip';
import { analyzeRisk } from '../services/ai';
import { api } from '../services/api';
import MarkdownRenderer from './ui/MarkdownRenderer';
import { useCopilotContext } from '../context/CopilotContext';
import { ConfirmModal } from './ui/ConfirmModal';

export const SupplierQuotes: React.FC = () => {
    const { setPageContext } = useCopilotContext();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Broadcast Context
    useEffect(() => {
        if (!loading) {
            setPageContext({
                view: 'Supplier Orders',
                total_records: orders.length,
                pending: orders.filter(q => q.status === 'PENDING').length,
                confirmed: orders.filter(q => q.status === 'ACCEPTED').length,
                search_query: searchQuery || 'None',
                summary: 'Detailed list of incoming orders with status and actions.'
            });
        }
    }, [orders, loading, searchQuery, setPageContext]);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [aiRiskAnalysis, setAiRiskAnalysis] = useState<string | null>(null);
    const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Confirmation Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'ACCEPT' | 'DECLINE' | 'COMPLETE' | 'ERROR' | 'SUCCESS' | null;
        title: string;
        message: string;
        orderId: string | null;
        orderData?: Order;
        variant: 'danger' | 'warning' | 'info' | 'success';
        isLoading?: boolean;
    }>({
        isOpen: false,
        type: null,
        title: '',
        message: '',
        orderId: null,
        variant: 'info'
    });

    const closeConfirm = () => {
        if (confirmState.isLoading) return;
        setConfirmState(prev => ({ ...prev, isOpen: false }));
    };

    // Fetch Incoming Orders
    const fetchOrders = async () => {
        setLoading(true);
        try {
            const data = await api.orders.listIncoming();
            // Filter by search query if exists
            const filtered = searchQuery 
                ? data.filter(item => 
                    item.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    item.fuel_type?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                : data;
            setOrders(filtered);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Live Search with Debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, 400);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleAction = async () => {
        if (!confirmState.orderId && confirmState.type !== 'ERROR' && confirmState.type !== 'SUCCESS') return;

        setConfirmState(prev => ({ ...prev, isLoading: true }));

        try {
            if (confirmState.type === 'ACCEPT' && confirmState.orderId) {
                await api.orders.respond(confirmState.orderId, 'ACCEPTED');
                await fetchOrders();
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
            else if (confirmState.type === 'DECLINE' && confirmState.orderId) {
                await api.orders.respond(confirmState.orderId, 'DECLINED');
                await fetchOrders();
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
            else if (confirmState.type === 'COMPLETE' && confirmState.orderId && confirmState.orderData) {
                const req = confirmState.orderData;
                await api.orders.complete(confirmState.orderId, {
                    final_quantity_mt: req.requested_quantity_mt || 0,
                    final_price_per_mt: req.price_per_mt_usd || 0
                });
                await fetchOrders();
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
            else {
                // For alerts (ERROR/SUCCESS), just close
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
        } catch (error: any) {
            console.error("Action failed", error);
            setConfirmState(prev => ({
                ...prev,
                type: 'ERROR',
                title: 'Action Failed',
                message: error.message || 'An unexpected error occurred.',
                variant: 'danger',
                isLoading: false,
                // Keep orderId so we don't lose context if needed, but important part is changing content
            }));
        } finally {
            if (confirmState.type !== 'ERROR') {
                 setConfirmState(prev => ({ ...prev, isLoading: false }));
            }
        }
    };

    const handleAccept = (id: string) => {
        setConfirmState({
            isOpen: true,
            type: 'ACCEPT',
            title: 'Accept Order Request',
            message: 'Are you sure you want to ACCEPT this order request? This will notify the buyer.',
            orderId: id,
            variant: 'success'
        });
    };

    const handleDecline = (id: string) => {
        setConfirmState({
            isOpen: true,
            type: 'DECLINE',
            title: 'Decline Order Request',
            message: 'Are you sure you want to DECLINE this order request? This cannot be undone.',
            orderId: id,
            variant: 'danger'
        });
    };

    const handleComplete = (id: string, req: Order) => {
        setConfirmState({
            isOpen: true,
            type: 'COMPLETE',
            title: 'Confirm Order Completion',
            message: 'Confirm order completion? This will deduce inventory and calculate commission.',
            orderId: id,
            orderData: req,
            variant: 'info'
        });
    };

    const toggleExpand = (id: string) => {
        setExpandedOrderId(expandedOrderId === id ? null : id);
        setAiRiskAnalysis(null); // Reset analysis on toggle
    };

    const handleGenerateRiskAnalysis = async (req: Order) => {
         // Mock risk profile if missing for now
        const riskProfile = { solvencyGrade: 'A', avgPaymentDays: 25, kybStatus: 'Verified' }; 
        
        setIsAnalyzingRisk(true);
        setAiRiskAnalysis(null);
        const analysis = await analyzeRisk(req.buyer_name || "Unknown", riskProfile as any);
        setAiRiskAnalysis(analysis);
        setIsAnalyzingRisk(false);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Quotes & Orders</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Manage incoming Direct Orders, active quotes, and confirmed bunkering orders.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden min-h-[500px]">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Buyer or Fuel..." 
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#5DADE2] outline-none transition-all focus:border-[#5DADE2] bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 size={32} className="animate-spin text-verdaxis" />
                    </div>
                ) : (
                <div className="overflow-visible">
                    <table className="w-full text-left">
                        <thead>
                             <tr className="bg-slate-50 dark:bg-slate-900 text-xs uppercase text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                                <th className="px-6 py-4"></th>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Buyer</th>
                                <th className="px-6 py-4">Requested Qty</th>
                                <th className="px-6 py-4">Delivery</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                             {orders.map((req) => (
                                <React.Fragment key={req.id}>
                                    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative ${expandedOrderId === req.id ? 'bg-slate-50 dark:bg-slate-700' : ''}`}>
                                        <td className="px-2 py-4 text-center">
                                            <button onClick={() => toggleExpand(req.id)} className="text-slate-400 hover:text-slate-600">
                                                {expandedOrderId === req.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-600">{req.id.slice(0, 8)}...</td>
                                        <td className="px-6 py-4">
                                            {req.status === 'PENDING' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    Action Required
                                                </span>
                                            )}
                                            {req.status === 'ACCEPTED' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Confirmed
                                                </span>
                                            )}
                                            {req.status === 'DECLINED' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Declined
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-[#334155] dark:text-slate-200">{req.buyer_name || 'Anonymous Buyer'}</td>
                                        <td className="px-6 py-4 dark:text-slate-300">
                                            {req.requested_quantity_mt?.toLocaleString()} MT
                                            <div className="text-xs text-slate-400">{req.listing_id ? 'Listing Match' : 'Direct'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{req.requested_delivery_date || 'Spot'}</td>
                                        <td className="px-6 py-4 text-right">
                                            {req.status === 'PENDING' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleAccept(req.id)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                        title="Accept Order"
                                                    >
                                                        <CheckCircle2 size={20} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDecline(req.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                        title="Decline Order"
                                                    >
                                                        <XCircle size={20} />
                                                    </button>
                                                </div>
                                            ) : req.status === 'ACCEPTED' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleComplete(req.id, req)}
                                                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors flex items-center gap-1"
                                                        title="Complete Order & Finalize"
                                                    >
                                                        <CheckCircle2 size={12} /> Complete
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">
                                                    {req.status === 'COMPLETED' ? 'Completed & Billed' : 'Closed'}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Expanded Buyer Risk Panel */}
                                    {expandedOrderId === req.id && (
                                        <tr className="bg-slate-50 animate-in slide-in-from-top-2">
                                            <td colSpan={8} className="p-6 border-b border-slate-200">
                                                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-[#334155] uppercase tracking-wider">
                                                            <Shield size={16} className="text-[#5DADE2]" />
                                                            Counterparty Risk Analysis
                                                        </div>
                                                        <button 
                                                            onClick={() => handleGenerateRiskAnalysis(req)}
                                                            disabled={isAnalyzingRisk || !!aiRiskAnalysis}
                                                            className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-md font-bold border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center space-x-2 disabled:opacity-50"
                                                        >
                                                            {isAnalyzingRisk ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                                                            <span>{isAnalyzingRisk ? 'Generating...' : aiRiskAnalysis ? 'Memo Generated' : 'Generate AI Risk Memo'}</span>
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Placeholder Stats */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                        <div className="p-3 bg-slate-50 rounded border border-slate-100 flex items-center gap-3">
                                                            <Building size={20} className="text-slate-400" />
                                                            <div>
                                                                <div className="text-xs text-slate-500 uppercase font-bold">Solvency Grade</div>
                                                                <div className="font-bold text-[#334155] text-lg">A (Excellent)</div>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded border border-slate-100 flex items-center gap-3">
                                                            <Clock size={20} className="text-slate-400" />
                                                            <div>
                                                                <div className="text-xs text-slate-500 uppercase font-bold">Avg Pmt Time</div>
                                                                <div className="font-bold text-[#334155] text-lg">15 Days</div>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-green-50 rounded border border-green-100 flex items-center gap-3">
                                                            <Shield size={20} className="text-green-500" />
                                                            <div>
                                                                <div className="text-xs text-green-700 uppercase font-bold">KYB Status</div>
                                                                <div className="font-bold text-green-700 text-lg">Verified</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* AI Output Section */}
                                                    {(aiRiskAnalysis || isAnalyzingRisk) && (
                                                        <div className="bg-gradient-to-br from-indigo-50 to-white/50 p-4 rounded-lg border border-indigo-100 animate-in fade-in">
                                                            <div className="flex items-start space-x-3">
                                                                <div className="p-1.5 bg-indigo-100 rounded-full mt-0.5">
                                                                    <FileText size={16} className="text-indigo-500" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">Verdaxis AI Strategic Assessment</h4>
                                                                    {isAnalyzingRisk ? (
                                                                         <div className="space-y-1.5 pt-1">
                                                                            <div className="h-2 bg-indigo-200 rounded w-3/4 animate-pulse"></div>
                                                                            <div className="h-2 bg-indigo-200 rounded w-1/2 animate-pulse"></div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm text-slate-700 leading-relaxed font-medium">
                                                                            <MarkdownRenderer content={aiRiskAnalysis || ''} />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                             ))}
                        </tbody>
                    </table>
                    {orders.length === 0 && (
                         <div className="p-8 text-center text-slate-400">
                            No incoming orders found.
                        </div>
                    )}
                </div>
                )}
                 <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                    Showing {orders.length} recent records
                </div>
            </div>


            <ConfirmModal
                isOpen={confirmState.isOpen}
                onClose={closeConfirm}
                onConfirm={handleAction}
                title={confirmState.title}
                message={confirmState.message}
                variant={confirmState.variant}
                isLoading={confirmState.isLoading}
                cancelText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? undefined : 'Cancel'}
                confirmText={confirmState.type === 'ERROR' || confirmState.type === 'SUCCESS' ? 'Close' : 'Confirm'}
            />
        </div>
    );
};