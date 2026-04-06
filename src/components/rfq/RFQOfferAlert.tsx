import React, { useState, useEffect, useRef } from 'react';
import { X, Tag } from 'lucide-react';
import { API_URL } from '../../services/config';

interface OfferAlert {
    id: string;
    price: string;
    isCounter: boolean;
}

interface RFQOfferAlertProps {
    onNavigateToRFQ?: () => void;
}

export const RFQOfferAlert: React.FC<RFQOfferAlertProps> = ({ onNavigateToRFQ }) => {
    const [alert, setAlert] = useState<OfferAlert | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const dismiss = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setAlert(null);
    };

    const scheduleAutoDismiss = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(dismiss, 8000);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const url = `${API_URL}/stream/activity?token=${encodeURIComponent(token)}`;
        const source = new EventSource(url);

        const handleQuote = (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                setAlert({
                    id: data.rfq_id ?? '',
                    price: data.price ? `$${Number(data.price).toLocaleString()}/MT` : '',
                    isCounter: false,
                });
                scheduleAutoDismiss();
            } catch {}
        };

        const handleCounter = (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                setAlert({
                    id: data.rfq_id ?? '',
                    price: data.counter_price ? `$${Number(data.counter_price).toLocaleString()}/MT` : '',
                    isCounter: true,
                });
                scheduleAutoDismiss();
            } catch {}
        };

        source.addEventListener('rfq_quote_received', handleQuote);
        source.addEventListener('rfq_countered', handleCounter);

        return () => {
            source.close();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!alert) return null;

    return (
        <div className="fixed top-[72px] right-4 z-[300] max-w-[280px] animate-in slide-in-from-right-4 fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-l-4 border-l-emerald-500 border border-slate-200 dark:border-slate-700 overflow-hidden">
                {/* Pulse bar */}
                <div className="h-0.5 bg-emerald-500 w-full animate-pulse" />

                <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <Tag size={14} className="text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {alert.isCounter ? 'Counter-Offer Received' : 'New Quote Received'}
                                </p>
                                {alert.price && (
                                    <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        {alert.price}
                                    </p>
                                )}
                                {onNavigateToRFQ && (
                                    <button
                                        onClick={() => { onNavigateToRFQ(); dismiss(); }}
                                        className="mt-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                                    >
                                        View RFQ →
                                    </button>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={dismiss}
                            className="p-0.5 text-slate-400 hover:text-slate-600 rounded flex-shrink-0"
                        >
                            <X size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
