import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';

interface NewsItem {
    id: string;
    title: string;
    summary: string | null;
    source: string;
    url: string;
    category: string;
    relevance: number;
    published_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
    bunkers: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    shipping: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    regulation: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    carbon: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    markets: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    commodities: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

function relativeTime(iso: string): string {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

import { api } from '../services/api';

export const NewsCard: React.FC = () => {
    const [items, setItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const data = await api.news.list({ limit: expanded ? 20 : 5 });
                setItems(data);
            } catch (e) {
                console.error('Failed to fetch news', e);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, [expanded]);

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Newspaper size={16} className="text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Maritime News</h3>
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Live Feed</span>
            </div>

            {/* Body */}
            <div className="divide-y divide-white/5">
                {loading ? (
                    <div className="p-4 space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse space-y-2">
                                <div className="h-3 bg-white/10 rounded w-3/4" />
                                <div className="h-2 bg-white/5 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">No news available</div>
                ) : (
                    items.map((item) => (
                        <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-4 py-2.5 hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider shrink-0">
                                            {item.source}
                                        </span>
                                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.markets}`}>
                                            {item.category}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-200 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                                        {item.title}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 mt-1">
                                    <Clock size={10} className="text-slate-600" />
                                    <span className="text-[10px] text-slate-500">{relativeTime(item.published_at)}</span>
                                    <ExternalLink size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                                </div>
                            </div>
                        </a>
                    ))
                )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
                <div className="px-4 py-2 border-t border-white/10">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                    >
                        {expanded ? 'Show less' : 'View all \u2192'}
                    </button>
                </div>
            )}
        </div>
    );
};
