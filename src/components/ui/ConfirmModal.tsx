import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
    confirmDisabled?: boolean;
    children?: React.ReactNode;
    maxWidth?: 'md' | 'lg';
    compact?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    variant = 'info',
    isLoading = false,
    confirmDisabled = false,
    children,
    maxWidth = 'md',
    compact = false,
}) => {
    const { t } = useTranslation('common');
    const resolvedConfirmText = confirmText ?? t('btn.confirm');
    const resolvedCancelText = cancelText === undefined ? t('btn.cancel') : cancelText;
    const dialogRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(isLoading);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        loadingRef.current = isLoading;
        onCloseRef.current = onClose;
    }, [isLoading, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const previousFocus = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        const dialog = dialogRef.current;
        const focusableSelector = [
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
        ].join(',');
        const focusable = () => Array.from(
            dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? []
        );
        focusable()[0]?.focus();
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !loadingRef.current) {
                event.preventDefault();
                onCloseRef.current();
                return;
            }
            if (event.key !== 'Tab') return;
            const items = focusable();
            if (items.length === 0) {
                event.preventDefault();
                dialog?.focus();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            previousFocus?.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: <AlertTriangle className="text-red-500" size={24} />,
                    iconBg: 'bg-red-500/20',
                    buttonBg: 'bg-red-600 hover:bg-red-700',
                    buttonText: 'text-white'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="text-amber-500" size={24} />,
                    iconBg: 'bg-amber-500/20',
                    buttonBg: 'bg-amber-600 hover:bg-amber-700',
                    buttonText: 'text-white'
                };
            case 'success':
                return {
                    icon: <CheckCircle2 className="text-emerald-500" size={24} />,
                    iconBg: 'bg-emerald-500/20',
                    buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
                    buttonText: 'text-white'
                };
            default: // info
                return {
                    icon: <Info className="text-blue-500" size={24} />,
                    iconBg: 'bg-blue-500/20',
                    buttonBg: 'bg-blue-600 hover:bg-blue-700',
                    buttonText: 'text-white'
                };
        }
    };

    const styles = getVariantStyles();
    const widthClass = maxWidth === 'lg' ? 'max-w-lg' : 'max-w-md';

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" aria-describedby="confirm-modal-description" tabIndex={-1} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl ${widthClass} w-full max-h-[90dvh] overflow-y-auto transform scale-100 transition-all`}>
                {/* Header */}
                <div className={`${compact ? 'p-5 pb-0 gap-3' : 'p-6 pb-0 gap-4'} flex items-start`}>
                    <div className={`${compact ? 'p-2.5' : 'p-3'} rounded-xl ${styles.iconBg} flex-shrink-0`}>
                        {styles.icon}
                    </div>
                    <div className="flex-1">
                        <h3 id="confirm-modal-title" className={`${compact ? 'text-lg mb-1' : 'text-xl mb-2'} font-bold text-slate-900 dark:text-slate-100`}>
                            {title}
                        </h3>
                        <p id="confirm-modal-description" className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                            {message}
                        </p>
                    </div>
                </div>

                {children && <div className={compact ? 'px-5' : 'px-6'}>{children}</div>}

                {/* Actions */}
                <div className={`${compact ? 'p-5 pt-4 mt-0' : 'p-6 mt-4'} flex gap-3 justify-end`}>
                    {resolvedCancelText && (
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {resolvedCancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        disabled={isLoading || confirmDisabled}
                        className={`px-6 py-2 font-bold rounded-lg transition-colors shadow-lg shadow-black/5 flex items-center justify-center gap-2 min-w-[100px] ${styles.buttonBg} ${styles.buttonText} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                {t('confirm.processing')}
                            </>
                        ) : (
                            resolvedConfirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
