import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, X, ArrowRight, Eye, List } from 'lucide-react';
import { api } from '../services/api';
import { MatchSuggestion, Page } from '../types';

interface MatchSuggestionsProps {
    onViewTrade?: (orderId: string) => void;
    onCountChange?: (count: number) => void;
    onNavigate?: (page: Page) => void;
}

export const MatchSuggestions: React.FC<MatchSuggestionsProps> = ({ onViewTrade, onCountChange, onNavigate }) => {
    const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const fetchSuggestions = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.matchmaking.suggestions();
            setSuggestions(data.filter((s: MatchSuggestion) => s.status !== 'DISMISSED'));
        } catch {
            // Matchmaking may not have suggestions yet — that's fine
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSuggestions();
        const interval = setInterval(fetchSuggestions, 15_000);
        return () => clearInterval(interval);
    }, [fetchSuggestions]);

    const handleDismiss = async (id: string) => {
        setDismissed(prev => new Set(prev).add(id));
        try {
            await api.matchmaking.dismiss(id);
        } catch { /* ignore */ }
    };

    const visible = suggestions.filter(s => !dismissed.has(s.id));

    useEffect(() => {
        onCountChange?.(visible.length);
    }, [visible.length, onCountChange]);

    if (visible.length === 0) {
        return (
            <div className="mb-3 bg-gradient-to-r from-emerald-500/5 to-blue-500/5 border border-dashed border-emerald-500/20 dark:border-emerald-500/10 rounded-lg p-4 text-center">
                {loading ? (
                    <>
                        <Sparkles size={20} className="mx-auto text-emerald-500/50 mb-2" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Checking for matches...</p>
                    </>
                ) : (
                    <>
                        <List size={20} className="mx-auto text-emerald-500/50 mb-2" />
                        <p className="text-xs text-slate-500 dark:text-slate-400">Add products to your Watchlist to get recommendations.</p>
                        {onNavigate && (
                            <button
                                onClick={() => onNavigate('WATCHLISTS')}
                                className="mt-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors text-xs font-medium"
                            >
                                Go to Watchlist
                            </button>
                        )}
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="mb-3 space-y-2">
            {visible.map(suggestion => {
                const askOrder = suggestion.ask_order;
                const bidOrder = suggestion.bid_order;
                const score = Math.round(suggestion.score);

                return (
                    <div
                        key={suggestion.id}
                        className="relative bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 dark:border-emerald-500/15 rounded-lg p-3"
                    >
                        <button
                            onClick={() => handleDismiss(suggestion.id)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            <X size={14} />
                        </button>

                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles size={14} className="text-emerald-500" />
                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                                Match Found
                            </span>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                                {score}% match
                            </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                            {askOrder && (
                                <div className="flex-1">
                                    <span className="text-slate-500 dark:text-slate-400">Ask: </span>
                                    <span className="font-bold text-slate-700 dark:text-slate-200">
                                        {askOrder.fuel_type} · {Number(askOrder.remaining_quantity_mt).toLocaleString()} MT · ${Number(askOrder.price_per_mt_usd).toLocaleString()}/MT
                                    </span>
                                </div>
                            )}
                        </div>

                        {suggestion.match_reasons.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                                {suggestion.match_reasons.slice(0, 3).map((reason, i) => (
                                    <span key={i} className="text-[10px] bg-white/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                        {reason}
                                    </span>
                                ))}
                            </div>
                        )}

                        <button
                            onClick={() => onViewTrade?.(suggestion.bid_order_id || suggestion.ask_order_id)}
                            className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 transition-colors"
                        >
                            <Eye size={12} />
                            View & Accept Match
                            <ArrowRight size={12} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
