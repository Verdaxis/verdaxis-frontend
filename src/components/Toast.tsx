import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, Zap } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'info' | 'trade';

interface Toast {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    addToast: (toast: Omit<Toast, 'id'>) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = ++toastId;
        setToasts(prev => [...prev, { ...toast, id }].slice(-5)); // Max 5 toasts
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, toast.duration || 5000);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Global 429 signal from the API layer (Sprint 3 item 15). Debounced so a
    // burst of throttled polls produces one toast, not five.
    const lastRateLimitToastRef = React.useRef(0);
    useEffect(() => {
        const onRateLimited = () => {
            const now = Date.now();
            if (now - lastRateLimitToastRef.current < 15000) return;
            lastRateLimitToastRef.current = now;
            addToast({
                type: 'warning',
                title: 'Slow down',
                message: 'Requests are being rate-limited. Data may be briefly stale — retrying shortly.',
                duration: 6000,
            });
        };
        window.addEventListener('verdaxis:rate-limited', onRateLimited);
        return () => window.removeEventListener('verdaxis:rate-limited', onRateLimited);
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setVisible(true));
    }, []);

    const icons = {
        success: <CheckCircle2 size={18} className="text-emerald-500" />,
        warning: <AlertTriangle size={18} className="text-amber-500" />,
        info: <Info size={18} className="text-blue-500" />,
        trade: <Zap size={18} className="text-violet-500" />,
    };

    const borders = {
        success: 'border-l-emerald-500',
        warning: 'border-l-amber-500',
        info: 'border-l-blue-500',
        trade: 'border-l-violet-500',
    };

    return (
        <div
            className={`pointer-events-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-l-4 ${borders[toast.type]} rounded-lg shadow-lg p-3 pr-8 max-w-sm transition-all duration-300 ${
                visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
            }`}
        >
            <button onClick={onDismiss} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600">
                <X size={14} />
            </button>
            <div className="flex items-start gap-2.5">
                {icons[toast.type]}
                <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{toast.title}</div>
                    {toast.message && <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{toast.message}</div>}
                </div>
            </div>
        </div>
    );
};
