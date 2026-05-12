import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ACTIVE_MARKETPLACE_PRODUCT_OPTIONS } from '../../utils/marketProducts';

interface CreateBidModalProps {
    onSubmit: (data: BidFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export interface BidFormData {
    region: string;
    fuel_type: string;
    fuel_grade: string;
    quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: string;
}

const REGIONS = ['Singapore', 'ARA', 'Houston', 'Fujairah', 'Shanghai', 'UAE'];
const FUEL_TYPES = ACTIVE_MARKETPLACE_PRODUCT_OPTIONS.map((option) => option.label);
const FUEL_GRADES = ['Conventional', 'Green', 'Bio'];
const AVAILABILITY_WINDOWS = ['Spot', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Forward 2027', 'Forward 2028'];

export const CreateBidModal: React.FC<CreateBidModalProps> = ({
    onSubmit,
    onCancel,
    isLoading = false,
}) => {
    const [formData, setFormData] = useState<BidFormData>({
        region: REGIONS[0],
        fuel_type: FUEL_TYPES[0],
        fuel_grade: FUEL_GRADES[0],
        quantity_mt: 0,
        price_per_mt_usd: 0,
        availability_window: AVAILABILITY_WINDOWS[0],
    });

    const handleChange = (field: keyof BidFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.quantity_mt <= 0 || formData.price_per_mt_usd <= 0) return;
        onSubmit(formData);
    };

    const selectClass = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
    const inputClass = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";
    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2";

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-slate-800">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Place a Bid</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Submit a request to buy fuel at your target price</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
                    <div className="p-6 space-y-6">
                        {/* Region & Fuel Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Region</label>
                                <select value={formData.region} onChange={(e) => handleChange('region', e.target.value)} className={selectClass}>
                                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Fuel Type</label>
                                <select value={formData.fuel_type} onChange={(e) => handleChange('fuel_type', e.target.value)} className={selectClass}>
                                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Grade & Availability */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Fuel Grade</label>
                                <select value={formData.fuel_grade} onChange={(e) => handleChange('fuel_grade', e.target.value)} className={selectClass}>
                                    {FUEL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Delivery Window</label>
                                <select value={formData.availability_window} onChange={(e) => handleChange('availability_window', e.target.value)} className={selectClass}>
                                    {AVAILABILITY_WINDOWS.map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Quantity & Price */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Quantity (MT)</label>
                                <input
                                    type="number"
                                    value={formData.quantity_mt || ''}
                                    onChange={(e) => handleChange('quantity_mt', parseFloat(e.target.value) || 0)}
                                    placeholder="e.g., 2000"
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Bid Price ($/MT)</label>
                                <input
                                    type="number"
                                    value={formData.price_per_mt_usd || ''}
                                    onChange={(e) => handleChange('price_per_mt_usd', parseFloat(e.target.value) || 0)}
                                    placeholder="e.g., 540"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Info callout */}
                        <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/20 p-3">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                Your bid will be visible to suppliers in the Buyer Demand Feed. Matching suppliers can hit your bid to initiate a trade.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={formData.quantity_mt <= 0 || formData.price_per_mt_usd <= 0 || isLoading}
                            className={`flex-1 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                formData.quantity_mt > 0 && formData.price_per_mt_usd > 0 && !isLoading
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-900'
                                    : 'bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-transparent'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Bid'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
