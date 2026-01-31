import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, Anchor, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { QuoteRequest, Page } from '../types';
import { api } from '../services/api';

interface BuyerDashboardProps {
    onNavigate: (page: Page) => void;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ onNavigate }) => {
    const [requests, setRequests] = useState<QuoteRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const fetchQuotes = async () => {
            try {
                const data = await api.quotes.list();
                setRequests(data);
            } catch (e) {
                console.error("Error fetching quotes", e);
            } finally {
                setLoading(false);
            }
        };
        fetchQuotes();
    }, []);

    const handleAcceptOffer = async (quoteId: string, offerId: string) => {
        if (!confirm('Are you sure you want to accept this offer? This will generate a binding confirmation.')) return;
        
        setProcessing(true);
        try {
            await api.quotes.acceptOffer(quoteId, offerId);
            setRequests(prev => prev.map(r => 
                r.id === quoteId ? { ...r, status: 'Confirmed' } : r
            ));
            alert('Offer accepted successfully!');
        } catch (e: any) {
            alert('Failed to accept offer: ' + e.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="p-10 flex justify-center">
                <Loader2 size={40} className="animate-spin text-emerald-500" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-6">Procurement Dashboard</h1>
            
            <div className="grid grid-cols-1 gap-6">
                {requests.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <Anchor className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No Active Requests</h3>
                        <p className="text-slate-500 mt-2">Go to the Map to place an order.</p>
                        <button 
                            onClick={() => onNavigate('MAP')}
                            className="mt-6 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                        >
                            Go to Map
                        </button>
                    </div>
                ) : (
                    requests.map(req => (
                        <div key={req.id} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold uppercase ${req.fuelType === 'Methanol' ? 'text-blue-600' : 'text-green-600'}`}>
                                            {req.fuelType}
                                        </span>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{req.quantity} MT</span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">ID: {req.id.slice(0, 8)} • {req.deliveryDate}</div>
                                </div>
                                <div>
                                    {req.status === 'Pending' && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                            <Clock size={14} /> Pending Quotes
                                        </span>
                                    )}
                                    {req.status === 'Negotiating' && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                            <TrendingUp size={14} /> Offers Received
                                        </span>
                                    )}
                                    {req.status === 'Confirmed' && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                            <CheckCircle size={14} /> Confirmed
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Offers Section */}
                            <div className="p-6">
                                {req.offers && req.offers.length > 0 ? (
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Supplier Offers</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {req.offers.map(offer => (
                                                <div key={offer.id} className={`p-4 rounded-lg border ${offer.isAccepted ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className="font-bold text-lg text-slate-900 dark:text-white">${offer.pricePerMt}</span>
                                                        {offer.isAccepted && <CheckCircle className="text-emerald-500" size={20} />}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 space-y-1">
                                                        <p>Valid until: {new Date(offer.validUntil || '').toLocaleDateString()}</p>
                                                        <p>{offer.terms}</p>
                                                    </div>
                                                    {!req.offers?.some(o => o.isAccepted) && (
                                                        <button 
                                                            onClick={() => handleAcceptOffer(req.id, offer.id)}
                                                            disabled={processing}
                                                            className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold rounded hover:opacity-90 transition-opacity"
                                                        >
                                                            Accept Offer
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-sm text-slate-500 flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" />
                                        Waiting for suppliers to quote...
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
