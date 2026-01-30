
import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Download, MoreVertical, Trash2, Edit2, X, Save, ChevronDown, ChevronUp, Shield, Building, Clock, Sparkles, FileText, Loader2 } from 'lucide-react';
import { QuoteRequest } from '../types';
import { Tooltip } from './ui/Tooltip';
import { analyzeRisk } from '../services/ai';
import { api } from '../services/api';
import MarkdownRenderer from './ui/MarkdownRenderer';
import { useCopilotContext } from '../context/CopilotContext';

export const SupplierQuotes: React.FC = () => {
    const { setPageContext } = useCopilotContext();
    const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Broadcast Context
    useEffect(() => {
        if (!loading) {
            setPageContext({
                view: 'Supplier Quotes & Orders',
                total_records: quotes.length,
                pending: quotes.filter(q => q.status === 'Pending').length,
                quoted: quotes.filter(q => q.status === 'Quoted').length,
                confirmed: quotes.filter(q => q.status === 'Confirmed').length,
                search_query: searchQuery || 'None',
                summary: 'Detailed list of RFQs and orders with status and actions.'
            });
        }
    }, [quotes, loading, searchQuery, setPageContext]);

    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
    const [editingQuote, setEditingQuote] = useState<QuoteRequest | null>(null);
    const [aiRiskAnalysis, setAiRiskAnalysis] = useState<string | null>(null);
    const [isAnalyzingRisk, setIsAnalyzingRisk] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Live Search with Debounce
    useEffect(() => {
        setLoading(true);
        const timer = setTimeout(() => {
            const fetchQuotes = async () => {
                try {
                    const data = await api.quotes.list('SUPPLIER', searchQuery);
                    setQuotes(data);
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            fetchQuotes();
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

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this record?')) {
            await api.quotes.delete(id);
            setQuotes(quotes.filter(q => q.id !== id));
            setOpenMenuId(null);
        }
    };

    const handleEdit = (quote: QuoteRequest) => {
        setEditingQuote(quote);
        setOpenMenuId(null);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingQuote) {
            await api.quotes.update(editingQuote.id, editingQuote);
            setQuotes(quotes.map(q => q.id === editingQuote.id ? editingQuote : q));
            setEditingQuote(null);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedQuoteId(expandedQuoteId === id ? null : id);
        setAiRiskAnalysis(null); // Reset analysis on toggle
    };

    const handleGenerateRiskAnalysis = async (req: QuoteRequest) => {
        if (!req.buyerRiskProfile) return;
        
        setIsAnalyzingRisk(true);
        setAiRiskAnalysis(null);
        const analysis = await analyzeRisk(req.buyerName || "Unknown", req.buyerRiskProfile);
        setAiRiskAnalysis(analysis);
        setIsAnalyzingRisk(false);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-['Montserrat'] font-bold text-[#334155] dark:text-white">Quotes & Orders</h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Manage incoming RFQs, active quotes, and confirmed bunkering orders.</p>
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
                            placeholder="Search by ID, Vessel, or Buyer..." 
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-[#5DADE2] outline-none transition-all focus:border-[#5DADE2] bg-white dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
                        />
                    </div>
                    <div className="flex items-center space-x-3 w-full md:w-auto">
                        <Tooltip content="Advanced Filters">
                            <button 
                                className="flex items-center space-x-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Filter size={16} />
                                <span>Filter</span>
                            </button>
                        </Tooltip>
                        <Tooltip content="Export as CSV">
                            <button 
                                className="flex items-center space-x-2 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <Download size={16} />
                                <span>Export</span>
                            </button>
                        </Tooltip>
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
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Price Quoted</th>
                                <th className="px-6 py-4">Delivery</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                             {quotes.map((req) => (
                                <React.Fragment key={req.id}>
                                    <tr className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors relative ${expandedQuoteId === req.id ? 'bg-slate-50 dark:bg-slate-700' : ''}`}>
                                        <td className="px-2 py-4 text-center">
                                            <button onClick={() => toggleExpand(req.id)} className="text-slate-400 hover:text-slate-600">
                                                {expandedQuoteId === req.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-600">{req.id}</td>
                                        <td className="px-6 py-4">
                                            {req.status === 'Pending' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                                    Awaiting Quote
                                                </span>
                                            )}
                                            {req.status === 'Quoted' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    Quote Sent
                                                </span>
                                            )}
                                            {req.status === 'Confirmed' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Confirmed
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-[#334155] dark:text-slate-200">{req.buyerName || 'Global Shipping Co.'}</td>
                                        <td className="px-6 py-4 dark:text-slate-300">{req.fuelType} ({req.quantity} MT)</td>
                                        <td className="px-6 py-4 font-medium text-[#334155] dark:text-slate-200">
                                            {req.price ? `$${req.price.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">{req.deliveryDate}</td>
                                        <td className="px-6 py-4 text-right relative">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === req.id ? null : req.id);
                                                }}
                                                className="text-slate-400 hover:text-[#334155] p-2 rounded-full hover:bg-slate-100 transition-colors"
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {/* Dropdown Menu */}
                                            {openMenuId === req.id && (
                                                <div ref={menuRef} className="absolute right-8 top-8 w-40 bg-white rounded-lg shadow-xl border border-slate-100 z-20 animate-in fade-in zoom-in duration-75 origin-top-right">
                                                    <button 
                                                        onClick={() => handleEdit(req)}
                                                        className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-[#5DADE2] flex items-center space-x-2 first:rounded-t-lg"
                                                    >
                                                        <Edit2 size={14} />
                                                        <span>Edit Details</span>
                                                    </button>
                                                    <div className="h-px bg-slate-100 my-1"></div>
                                                    <button 
                                                        onClick={() => handleDelete(req.id)}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center space-x-2 last:rounded-b-lg"
                                                    >
                                                        <Trash2 size={14} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    {/* Expanded Buyer Risk Panel (Module B Feature) */}
                                    {expandedQuoteId === req.id && req.buyerRiskProfile && (
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
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                        <div className="p-3 bg-slate-50 rounded border border-slate-100 flex items-center gap-3">
                                                            <Building size={20} className="text-slate-400" />
                                                            <div>
                                                                <div className="text-xs text-slate-500 uppercase font-bold">Solvency Grade</div>
                                                                <div className="font-bold text-[#334155] text-lg">{req.buyerRiskProfile.solvencyGrade}</div>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-slate-50 rounded border border-slate-100 flex items-center gap-3">
                                                            <Clock size={20} className="text-slate-400" />
                                                            <div>
                                                                <div className="text-xs text-slate-500 uppercase font-bold">Avg Pmt Time</div>
                                                                <div className="font-bold text-[#334155] text-lg">{req.buyerRiskProfile.avgPaymentDays} Days</div>
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-green-50 rounded border border-green-100 flex items-center gap-3">
                                                            <Shield size={20} className="text-green-500" />
                                                            <div>
                                                                <div className="text-xs text-green-700 uppercase font-bold">KYB Status</div>
                                                                <div className="font-bold text-green-700 text-lg">{req.buyerRiskProfile.kybStatus}</div>
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
                    {quotes.length === 0 && (
                         <div className="p-8 text-center text-slate-400">
                            No records found matching your search.
                        </div>
                    )}
                </div>
                )}
                 <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                    Showing {quotes.length} recent records
                </div>
            </div>

            {/* Edit Modal */}
            {editingQuote && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155]">Edit Order #{editingQuote.id}</h3>
                            <button onClick={() => setEditingQuote(null)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEdit}>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Delivery Date</label>
                                    <input 
                                        type="date" 
                                        value={editingQuote.deliveryDate}
                                        onChange={(e) => setEditingQuote({...editingQuote, deliveryDate: e.target.value})}
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quoted Price ($)</label>
                                    <input 
                                        type="number" 
                                        value={editingQuote.price || 0}
                                        onChange={(e) => setEditingQuote({...editingQuote, price: parseInt(e.target.value)})}
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                                    <select 
                                        value={editingQuote.status}
                                        onChange={(e) => setEditingQuote({...editingQuote, status: e.target.value as any})}
                                        className="w-full p-3 border border-slate-200 rounded-lg text-sm font-medium bg-white"
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Quoted">Quoted</option>
                                        <option value="Confirmed">Confirmed</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3 rounded-b-2xl">
                                <button 
                                    type="button"
                                    onClick={() => setEditingQuote(null)}
                                    className="px-4 py-2 text-slate-600 font-bold hover:text-slate-800 text-sm"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="px-6 py-2 bg-[#334155] hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm flex items-center space-x-2 text-sm"
                                >
                                    <Save size={16} />
                                    <span>Save Changes</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};