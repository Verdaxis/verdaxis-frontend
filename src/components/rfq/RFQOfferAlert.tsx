import React, { useState, useEffect, useRef } from 'react';
import { X, Tag, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { API_URL } from '../../services/config';

type AlertType = 'quote' | 'counter' | 'trade_confirmed' | 'declined' | 'withdrawn' | 'superseded' | 'revised';

interface OfferAlert {
    id: string;
    price: string;
    type: AlertType;
    message?: string;
}

const ALERT_CONFIG: Record<AlertType, { title: string; icon: React.ReactNode; borderColor: string; iconBg: string }> = {
    quote: { title: 'New Quote Received', icon: <Tag size={14} className="text-emerald-500" />, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-500/10' },
    counter: { title: 'Counter-Offer Received', icon: <Tag size={14} className="text-amber-500" />, borderColor: 'border-l-amber-500', iconBg: 'bg-amber-500/10' },
    revised: { title: 'Counter-Offer Received', icon: <Tag size={14} className="text-amber-500" />, borderColor: 'border-l-amber-500', iconBg: 'bg-amber-500/10' },
    trade_confirmed: { title: 'Trade Confirmed', icon: <CheckCircle size={14} className="text-emerald-500" />, borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-500/10' },
    declined: { title: 'Quote Declined', icon: <XCircle size={14} className="text-red-500" />, borderColor: 'border-l-red-500', iconBg: 'bg-red-500/10' },
    withdrawn: { title: 'Quote Withdrawn', icon: <AlertTriangle size={14} className="text-orange-500" />, borderColor: 'border-l-orange-500', iconBg: 'bg-orange-500/10' },
    superseded: { title: 'RFQ Fulfilled', icon: <AlertTriangle size={14} className="text-slate-500" />, borderColor: 'border-l-slate-500', iconBg: 'bg-slate-500/10' },
};

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

    const scheduleAutoDismiss = (ms = 8000) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(dismiss, ms);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const url = `${API_URL}/stream/activity?token=${encodeURIComponent(token)}`;
        const source = new EventSource(url);

        const makeHandler = (type: AlertType, priceField?: string) => (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                setAlert({
                    id: data.rfq_id ?? '',
                    price: priceField && data[priceField] ? `$${Number(data[priceField]).toLocaleString()}/MT` : '',
                    type,
                    message: data.message,
                });
                scheduleAutoDismiss(type === 'trade_confirmed' ? 12000 : 8000);
            } catch {}
        };

        source.addEventListener('rfq_quote_received', makeHandler('quote', 'price'));
        source.addEventListener('rfq_countered', makeHandler('counter', 'counter_price'));
        source.addEventListener('seller_revised', makeHandler('revised', 'price'));
        source.addEventListener('trade_confirmed', makeHandler('trade_confirmed', 'price'));
        source.addEventListener('quote_declined', makeHandler('declined'));
        source.addEventListener('quote_withdrawn', makeHandler('withdrawn'));
        source.addEventListener('quote_superseded', makeHandler('superseded'));

        return () => {
            source.close();
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!alert) return null;

    const config = ALERT_CONFIG[alert.type];

    return (
        <div className="fixed top-[72px] right-4 z-[300] max-w-[280px] animate-in slide-in-from-right-4 fade-in duration-300">
            <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-l-4 ${config.borderColor} border border-slate-200 dark:border-slate-700 overflow-hidden`}>
                {/* Pulse bar */}
                <div className={`h-0.5 ${config.borderColor.replace('border-l-', 'bg-')} w-full animate-pulse`} />

                <div className="p-3.5">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-full ${config.iconBg} flex items-center justify-center flex-shrink-0`}>
                                {config.icon}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {config.title}
                                </p>
                                {alert.price && (
                                    <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                        {alert.price}
                                    </p>
                                )}
                                {alert.message && !alert.price && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        {alert.message}
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
