import React, { useState, useEffect, useCallback } from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';
import { api } from '../services/api';

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

const FILTER_CATEGORIES = ['All', 'Bunkers', 'Shipping', 'Regulation', 'Carbon', 'Markets'];

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

export const NewsFeed: React.FC = () => {
    const [items, setItems] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('All');

    const fetchNews = useCallback(async () => {
        try {
            const params: { limit: number; category?: string } = { limit: 10 };
            if (category !== 'All') params.category = category.toLowerCase();
            const data = await api.news.list(params);
            setItems(data);
        } catch (e) {
            console.error('Failed to fetch news', e);
        } finally {
            setLoading(false);
        }
    }, [category]);

    useEffect(() => {
        setLoading(true);
        fetchNews();
    }, [fetchNews]);

    // Auto-refresh every 15 minutes for live breaking news
    useEffect(() => {
        const interval = setInterval(() => {
            fetchNews();
        }, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchNews]);

    return (
        <div className="h-full flex flex-col rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 backdrop-blur-md shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Newspaper size={14} className="text-emerald-400" />
                    <h3 className="text-xs font-bold text-white dark:text-white">News Feed</h3>
                    {(() => {
                        const latestMs = items.length > 0 ? new Date(items[0].published_at).getTime() : 0;
                        const isRecent = Date.now() - latestMs < 24 * 60 * 60 * 1000;
                        return isRecent ? (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Live</span>
                            </span>
                        ) : items.length > 0 ? (
                            <span className="text-[9px] text-slate-500">{relativeTime(items[0].published_at)}</span>
                        ) : null;
                    })()}
                </div>
            </div>

            {/* Category filter chips */}
            <div className="px-3 py-2 border-b border-slate-200 dark:border-white/10 flex gap-1.5 flex-wrap shrink-0">
                {FILTER_CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            category === cat
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'text-slate-500 hover:text-slate-300 border border-transparent'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Feed items */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                {loading ? (
                    <div className="p-3 space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="animate-pulse space-y-1.5">
                                <div className="h-2.5 bg-slate-200 dark:bg-white/10 rounded w-4/5" />
                                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded w-1/3" />
                            </div>
                        ))}
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                        No news for this category
                    </div>
                ) : (
                    items.map((item) => (
                        <a
                            key={item.id}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                        >
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] text-slate-700 dark:text-slate-200 leading-snug line-clamp-2 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                        {item.title}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className="text-[9px] font-bold text-emerald-400/80 uppercase">
                                            {item.source}
                                        </span>
                                        <span className={`text-[8px] font-bold uppercase px-1 py-px rounded border ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.markets}`}>
                                            {item.category}
                                        </span>
                                        <span className="text-[9px] text-slate-600 flex items-center gap-0.5 ml-auto">
                                            <Clock size={8} />
                                            {relativeTime(item.published_at)}
                                        </span>
                                    </div>
                                </div>
                                <ExternalLink size={10} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 shrink-0" />
                            </div>
                        </a>
                    ))
                )}
            </div>
        </div>
    );
};
