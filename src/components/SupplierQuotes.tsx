
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Download, MoreVertical, Trash2, Edit2, X, Save, ChevronDown, ChevronUp, Shield, Building, Clock, Sparkles, FileText, Loader2, CheckCircle2, XCircle, Truck, Banknote } from 'lucide-react';
import { Trade } from '../types';
import { Tooltip } from './ui/Tooltip';
import { analyzeRisk } from '../services/ai';
import { api } from '../services/api';
import MarkdownRenderer from './ui/MarkdownRenderer';
import { ConfirmModal } from './ui/ConfirmModal';
import { useNamespace } from '../hooks/useNamespace';

export const SupplierQuotes: React.FC = () => {
    const { t, ready } = useNamespace('dashboard');
    const [orders, setOrders] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [aiRiskAnalysis, setAiRiskAnalysis] = useState<string | null>(null);
    const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Confirmation Modal State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'ACCEPT' | 'DECLINE' | 'COMPLETE' | 'MARK_PAID' | 'ERROR' | 'SUCCESS' | null;
        title: string;
        message: string;
        orderId: string | null;
        orderData?: Trade;
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
            const data = await api.trades.myTrades();
            const filtered = searchQuery
                ? data.filter((item: Trade) =>
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
                await api.trades.confirm(confirmState.orderId);
                await fetchOrders();
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
            else if (confirmState.type === 'DECLINE' && confirmState.orderId) {
                await api.trades.decline(confirmState.orderId);
                await fetchOrders();
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
            else if (confirmState.type === 'COMPLETE' && confirmState.orderId && confirmState.orderData) {
                const req = confirmState.orderData;
                await api.trades.deliver(confirmState.orderId, {
                    final_quantity_mt: req.quantity_mt || 0,
                    final_price_per_mt: req.price_per_mt_usd || 0
                });
                await fetchOrders();
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
            else if (confirmState.type === 'MARK_PAID' && confirmState.orderId) {
                await api.trades.pay(confirmState.orderId);
                await fetchOrders();
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
            else {
                setConfirmState(prev => ({ ...prev, isOpen: false }));
            }
        } catch (error: any) {
            console.error("Action failed", error);
            setConfirmState(prev => ({
                ...prev,
                type: 'ERROR',
                title: t('supplierQuotes.modal.errorTitle'),
                message: error.message || t('supplierQuotes.modal.errorFallback'),
                variant: 'danger',
                isLoading: false,
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
            title: t('supplierQuotes.modal.acceptTitle'),
            message: t('supplierQuotes.modal.acceptMessage'),
            orderId: id,
            variant: 'success'
        });
    };

    const handleDecline = (id: string) => {
        setConfirmState({
            isOpen: true,
            type: 'DECLINE',
            title: t('supplierQuotes.modal.declineTitle'),
            message: t('supplierQuotes.modal.declineMessage'),
            orderId: id,
            variant: 'danger'
        });
    };

    const handleComplete = (id: string, req: Trade) => {
        setConfirmState({
            isOpen: true,
            type: 'COMPLETE',
            title: t('supplierQuotes.modal.deliveryTitle'),
            message: t('supplierQuotes.modal.deliveryMessage'),
            orderId: id,
            orderData: req,
            variant: 'info'
        });
    };
    
    const handleMarkPaid = (id: string) => {
        setConfirmState({
            isOpen: true,
            type: 'MARK_PAID',
            title: t('supplierQuotes.modal.paymentTitle'),
            message: t('supplierQuotes.modal.paymentMessage'),
            orderId: id,
            variant: 'success'
        });
    };

    const toggleExpand = (id: string) => {
        setExpandedOrderId(expandedOrderId === id ? null : id);
        setAiRiskAnalysis(null);
    };

    const handleGenerateRiskAnalysis = async (req: Trade) => {
        const riskProfile = { solvencyGrade: 'A', avgPaymentDays: 25, kybStatus: 'Verified' }; 
        
        setIsAnalyzingRisk(true);
        setAiRiskAnalysis(null);
        const analysis = await analyzeRisk(req.buyer_name || "Unknown", riskProfile as any);
        setAiRiskAnalysis(analysis);
        setIsAnalyzingRisk(false);
    };

    if (!ready) {
        return (
            <div className="p-6 flex justify-center">
                <Loader2 size={32} className="animate-spin text-verdaxis" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">{t('supplierQuotes.title')}</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">{t('supplierQuotes.subtitle')}</p>
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
                            placeholder={t('supplierQuotes.searchPlaceholder')}
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
                                <th className="px-6 py-4">{t('supplierQuotes.table.id')}</th>
                                <th className="px-6 py-4">{t('supplierQuotes.table.status')}</th>
                                <th className="px-6 py-4">{t('supplierQuotes.table.buyer')}</th>
                                <th className="px-6 py-4">{t('supplierQuotes.table.requestedQty')}</th>
                                <th className="px-6 py-4">{t('supplierQuotes.table.delivery')}</th>
                                <th className="px-6 py-4 text-right">{t('supplierQuotes.table.action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                             {orders.map((req, index) => (
                                <React.Fragment key={req.id}>
                                    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative ${expandedOrderId === req.id ? 'bg-slate-50 dark:bg-slate-700' : ''}`}>
                                        <td className="px-2 py-4 text-center">
                                            <button onClick={() => toggleExpand(req.id)} className="text-slate-400 hover:text-slate-600">
                                                {expandedOrderId === req.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-600 dark:text-slate-300">ORD-{String(index + 1).padStart(3, '0')}</td>
                                        <td className="px-6 py-4">
                                            {req.status === 'PENDING_CONFIRMATION' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400">
                                                    {t('supplierQuotes.table.actionRequired')}
                                                </span>
                                            )}
                                            {req.status === 'CONFIRMED' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                                                    {t('supplierQuotes.table.confirmed')}
                                                </span>
                                            )}
                                            {req.status === 'DELIVERED' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400">
                                                    {t('supplierQuotes.table.delivered')}
                                                </span>
                                            )}
                                            {req.status === 'PAID' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400">
                                                    {t('supplierQuotes.table.paid')}
                                                </span>
                                            )}
                                            {req.status === 'DECLINED' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400">
                                                    {t('supplierQuotes.table.declined')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-[#334155] dark:text-slate-200">{req.buyer_name || t('supplierQuotes.table.anonymous')}</td>
                                        <td className="px-6 py-4 dark:text-slate-300">
                                            {req.quantity_mt?.toLocaleString()} MT
                                            <div className="text-xs text-slate-400">{req.fuel_type} &middot; {req.region}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{req.created_at ? new Date(req.created_at).toLocaleDateString() : t('supplierQuotes.table.spot')}</td>
                                        <td className="px-6 py-4 text-right">
                                            {req.status === 'PENDING_CONFIRMATION' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleAccept(req.id)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                                        title="Confirm Order"
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
                                            ) : req.status === 'CONFIRMED' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleComplete(req.id, req)}
                                                        className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-colors flex items-center gap-1"
                                                        title="Confirm Delivery (BDN)"
                                                    >
                                                        <Truck size={12} /> {t('supplierQuotes.table.confirmDelivery')}
                                                    </button>
                                                </div>
                                            ) : req.status === 'DELIVERED' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleMarkPaid(req.id)}
                                                        className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full hover:bg-emerald-700 transition-colors flex items-center gap-1"
                                                        title="Mark as Paid"
                                                    >
                                                        <Banknote size={12} /> {t('supplierQuotes.table.markPaid')}
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic flex items-center gap-1 justify-end">
                                                    {req.status === 'PAID' ? <><CheckCircle2 size={12}/> {t('supplierQuotes.table.paid')}</> : t('supplierQuotes.table.closed')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Expanded Buyer Risk Panel */}
                                    {expandedOrderId === req.id && (
                                        <tr className="bg-slate-50 dark:bg-slate-800 animate-in slide-in-from-top-2">
                                            <td colSpan={8} className="p-6 border-b border-slate-200 dark:border-slate-700">
                                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-2 text-sm font-bold text-[#334155] dark:text-slate-200 uppercase tracking-wider">
                                                            <Shield size={16} className="text-[#5DADE2]" />
                                                            {t('supplierQuotes.risk.panelTitle')}
                                                        </div>
                                                        <button 
                                                            onClick={() => handleGenerateRiskAnalysis(req)}
                                                            disabled={isAnalyzingRisk || !!aiRiskAnalysis}
                                                            className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-md font-bold border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center space-x-2 disabled:opacity-50"
                                                        >
                                                            {isAnalyzingRisk ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12} />}
                                                            <span>{isAnalyzingRisk ? t('supplierQuotes.risk.generating') : aiRiskAnalysis ? t('supplierQuotes.risk.memoGenerated') : t('supplierQuotes.risk.generateButton')}</span>
                                                        </button>
                                                    </div>
                                                    
                                                    {/* Placeholder Stats */}
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-100 dark:border-slate-600 flex items-center gap-3">
                                                            <Building size={20} className="text-slate-400" />
                                                            <div>
                                                                <div className="text-xs text-slate-500 uppercase font-bold">{t('supplierQuotes.risk.solvencyGrade')}</div>
                                                                <div className="font-bold text-[#334155] dark:text-slate-200 text-lg">{t('supplierQuotes.risk.solvencyValue')}</div>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded border border-slate-100 dark:border-slate-600 flex items-center gap-3">
                                                            <Clock size={20} className="text-slate-400" />
                                                            <div>
                                                                <div className="text-xs text-slate-500 uppercase font-bold">{t('supplierQuotes.risk.avgPaymentTime')}</div>
                                                                <div className="font-bold text-[#334155] dark:text-slate-200 text-lg">{t('supplierQuotes.risk.avgPaymentValue')}</div>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-800 flex items-center gap-3">
                                                            <Shield size={20} className="text-green-500" />
                                                            <div>
                                                                <div className="text-xs text-green-700 dark:text-green-400 uppercase font-bold">{t('supplierQuotes.risk.kybStatus')}</div>
                                                                <div className="font-bold text-green-700 dark:text-green-400 text-lg">{t('supplierQuotes.risk.kybValue')}</div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* AI Output Section */}
                                                    {(aiRiskAnalysis || isAnalyzingRisk) && (
                                                        <div className="bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-white/50 dark:to-slate-800/50 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 animate-in fade-in">
                                                            <div className="flex items-start space-x-3">
                                                                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-full mt-0.5">
                                                                    <FileText size={16} className="text-indigo-500" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">{t('supplierQuotes.risk.aiAssessment')}</h4>
                                                                    {isAnalyzingRisk ? (
                                                                         <div className="space-y-1.5 pt-1">
                                                                            <div className="h-2 bg-indigo-200 rounded w-3/4 animate-pulse"></div>
                                                                            <div className="h-2 bg-indigo-200 rounded w-1/2 animate-pulse"></div>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
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
                            {t('supplierQuotes.noOrders')}
                        </div>
                    )}
                </div>
                )}
                 <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center text-xs text-slate-500 dark:text-slate-400">
                    {t('supplierQuotes.showing', { count: orders.length })}
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
