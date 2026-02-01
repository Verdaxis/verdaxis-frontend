import React, { useState } from 'react';
import { X, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { PublicListing } from '../../types';

interface OrderConfirmModalProps {
    listing: PublicListing;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export const ActionConfirmModal: React.FC<OrderConfirmModalProps> = ({
    listing,
    onConfirm,
    onCancel,
    isLoading = false,
}) => {
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const totalValue = listing.quantity_mt * listing.price_per_mt_usd;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <FileText className="text-emerald-400" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-slate-200">Confirm Order Request</h2>
                    </div>
                    <button 
                        onClick={onCancel}
                        className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Summary */}
                    <div className="bg-slate-900/50 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Fuel Type</span>
                            <span className="text-slate-200 font-medium">
                                {listing.fuel_type} ({listing.fuel_grade})
                            </span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Region</span>
                            <span className="text-slate-200 font-medium">{listing.region}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Availability</span>
                            <span className="text-slate-200 font-medium">{listing.availability_window}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Supplier</span>
                            <span className="text-amber-400 font-medium">{listing.tier_label}</span>
                        </div>
                        <div className="border-t border-slate-700 pt-3 flex justify-between">
                            <span className="text-slate-400">Quantity</span>
                            <span className="text-slate-200 font-bold">{listing.quantity_mt.toLocaleString()} MT</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Indicative Price</span>
                            <span className="text-emerald-400 font-bold">${listing.price_per_mt_usd}/MT</span>
                        </div>
                        <div className="border-t border-slate-700 pt-3 flex justify-between">
                            <span className="text-slate-400">Estimated Total</span>
                            <span className="text-2xl font-bold text-emerald-400">
                                ${totalValue.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                        <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                        <div className="text-sm text-slate-300">
                            <p className="font-medium text-amber-400 mb-1">Important Notice</p>
                            <p>
                                By placing this Order, your identity will be revealed to the supplier 
                                and their identity will be revealed to you. This enables direct negotiation.
                            </p>
                        </div>
                    </div>

                    {/* Terms Checkbox */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative mt-0.5">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                acceptedTerms
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'border-slate-500 group-hover:border-slate-400'
                            }`}>
                                {acceptedTerms && <CheckCircle2 size={14} className="text-slate-900" />}
                            </div>
                        </div>
                        <span className="text-sm text-slate-300">
                            I agree to the{' '}
                            <a href="#" className="text-emerald-400 hover:underline">
                                Verdaxis Terms of Service
                            </a>{' '}
                            and understand that a commission fee applies upon successful transaction.
                        </span>
                    </label>
                </div>

                {/* Actions */}
                <div className="p-6 bg-slate-900/50 border-t border-slate-700 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!acceptedTerms || isLoading}
                        className={`flex-1 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                            acceptedTerms && !isLoading
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900'
                                : 'bg-slate-600 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                Sending...
                            </>
                        ) : (
                            'Confirm Order'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
