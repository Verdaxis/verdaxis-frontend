import React from 'react';
import { X, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

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
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
    isLoading = false,
}) => {
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

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden transform scale-100 transition-all">
                {/* Header */}
                <div className="p-6 pb-0 flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${styles.iconBg} flex-shrink-0`}>
                        {styles.icon}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            {title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                            {message}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 flex gap-3 justify-end mt-4">
                    {cancelText && (
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`px-6 py-2 font-bold rounded-lg transition-colors shadow-lg shadow-black/5 flex items-center justify-center gap-2 min-w-[100px] ${styles.buttonBg} ${styles.buttonText} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
