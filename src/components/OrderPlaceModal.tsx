import React, { useState } from 'react';
import { X, Loader2, CheckCircle2, Zap, AlertTriangle, EyeOff } from 'lucide-react';

interface OrderPlaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    side: 'BID' | 'ASK';
    prefillFuelType?: string;
    prefillRegion?: string;
}

interface OrderFormData {
    fuel_type: string;
    region: string;
    quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: string;
    delivery_window_start: string;
    delivery_window_end: string;
    expiry_type: 'GTC' | 'date';
    expiry_date: string;
    is_anonymous: boolean;
}

const FUEL_TYPES = ['Methanol', 'LNG', 'Ammonia', 'Biofuel', 'LSMGO'];
const AVAILABILITY_WINDOWS = ['Spot', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Forward 2027', 'Forward 2028'];
const QUANTITY_PRESETS = [
    { label: '500 MT', value: 500 },
    { label: '1,000 MT', value: 1_000 },
    { label: '2,500 MT', value: 2_500 },
    { label: '5,000 MT', value: 5_000 },
];

import { api } from '../services/api';

type ModalState = 'form' | 'submitting' | 'success' | 'auto_matched' | 'error';

export const OrderPlaceModal: React.FC<OrderPlaceModalProps> = ({
    isOpen,
    onClose,
    side,
    prefillFuelType,
    prefillRegion,
}) => {
    const [formData, setFormData] = useState<OrderFormData>({
        fuel_type: prefillFuelType || FUEL_TYPES[0],
        region: prefillRegion || '',
        quantity_mt: 0,
        price_per_mt_usd: 0,
        availability_window: AVAILABILITY_WINDOWS[0],
        delivery_window_start: '',
        delivery_window_end: '',
        expiry_type: 'GTC',
        expiry_date: '',
        is_anonymous: false,
    });

    const [modalState, setModalState] = useState<ModalState>('form');
    const [errorMessage, setErrorMessage] = useState('');
    const [matchResult, setMatchResult] = useState<any>(null);

    if (!isOpen) return null;

    const handleChange = (field: keyof OrderFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isValid = formData.region.trim() !== '' && formData.quantity_mt > 0 && formData.price_per_mt_usd > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setModalState('submitting');
        setErrorMessage('');

        try {
            const payload: Record<string, any> = {
                side,
                fuel_type: formData.fuel_type,
                region: formData.region.trim(),
                quantity_mt: formData.quantity_mt,
                price_per_mt_usd: formData.price_per_mt_usd,
                availability_window: formData.availability_window,
                is_anonymous: formData.is_anonymous,
            };
            if (formData.delivery_window_start) {
                payload.delivery_window_start = formData.delivery_window_start;
            }
            if (formData.delivery_window_end) {
                payload.delivery_window_end = formData.delivery_window_end;
            }

            if (formData.expiry_type === 'date' && formData.expiry_date) {
                payload.expires_at = new Date(formData.expiry_date + 'T23:59:59Z').toISOString();
            }

            const result = await api.orderbook.create(payload);

            // Check if auto-matched: the backend returns trades array when auto-matching occurs
            if (result.trades && result.trades.length > 0) {
                setMatchResult(result);
                setModalState('auto_matched');
            } else {
                setModalState('success');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to place order');
            setModalState('error');
        }
    };

    const handleClose = () => {
        setModalState('form');
        setErrorMessage('');
        setMatchResult(null);
        onClose();
    };

    const sideLabel = side === 'BID' ? 'Bid' : 'Ask';

    const selectClass = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2] focus:ring-1 focus:ring-[#5DADE2]";
    const inputClass = "w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#5DADE2] focus:ring-1 focus:ring-[#5DADE2]";
    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2";

    // Success / Auto-matched / Error overlays
    if (modalState === 'success' || modalState === 'auto_matched' || modalState === 'error') {
        return (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="p-8 text-center">
                        {modalState === 'error' ? (
                            <>
                                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                                    <AlertTriangle size={32} className="text-red-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Order Failed</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{errorMessage}</p>
                            </>
                        ) : modalState === 'auto_matched' ? (
                            <>
                                <div className="mx-auto w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-4">
                                    <Zap size={32} className="text-violet-500" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Order Auto-Matched!</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                    Your {sideLabel.toLowerCase()} was instantly matched with a counterparty.
                                </p>
                                {matchResult?.trades?.map((trade: any, i: number) => (
                                    <div key={i} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-4 text-left mb-2">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-500 dark:text-slate-400">Quantity</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{trade.quantity_mt?.toLocaleString()} MT</span>
                                        </div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-slate-500 dark:text-slate-400">Price</span>
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">${trade.price_per_mt_usd}/MT</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500 dark:text-slate-400">Status</span>
                                            <span className="font-bold text-blue-600 dark:text-blue-400">{trade.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <>
                                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${side === 'BID' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                    <CheckCircle2 size={32} className={side === 'BID' ? 'text-emerald-500' : 'text-blue-500'} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{sideLabel} Placed Successfully</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                    Your {sideLabel.toLowerCase()} for {formData.quantity_mt.toLocaleString()} MT of {formData.fuel_type} at ${formData.price_per_mt_usd}/MT is now live on the orderbook.
                                </p>
                            </>
                        )}
                        <button
                            onClick={handleClose}
                            className="w-full py-3 bg-[#334155] dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 border-0 sm:border border-slate-200 dark:border-slate-700 rounded-none sm:rounded-2xl shadow-2xl max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-slate-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200 font-['Montserrat']">
                                Place {sideLabel}
                            </h2>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                side === 'BID'
                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>
                                {side}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {side === 'BID' ? 'Submit a request to buy fuel at your target price' : 'Offer fuel for sale on the marketplace'}
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
                    <div className="p-6 space-y-6">
                        {/* Fuel Type & Region */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Fuel Type</label>
                                <select
                                    value={formData.fuel_type}
                                    onChange={(e) => handleChange('fuel_type', e.target.value)}
                                    className={selectClass}
                                >
                                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Region / Port</label>
                                <input
                                    type="text"
                                    value={formData.region}
                                    onChange={(e) => handleChange('region', e.target.value)}
                                    placeholder="e.g. Singapore, ARA, Houston"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Quantity & Price */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Quantity (MT)</label>
                                {/* Quantity Presets */}
                                <div className="flex gap-2 flex-wrap mb-2">
                                    {QUANTITY_PRESETS.map(preset => (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, quantity_mt: preset.value }))}
                                            className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors
                                                ${formData.quantity_mt === preset.value
                                                    ? (side === 'BID'
                                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                                        : 'bg-[#5DADE2] text-white border-[#5DADE2]')
                                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-slate-400'
                                                }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="number"
                                    value={formData.quantity_mt || ''}
                                    onChange={(e) => handleChange('quantity_mt', parseFloat(e.target.value) || 0)}
                                    placeholder="e.g. 2000"
                                    min={0}
                                    step={1}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Price ($/MT)</label>
                                <input
                                    type="number"
                                    value={formData.price_per_mt_usd || ''}
                                    onChange={(e) => handleChange('price_per_mt_usd', parseFloat(e.target.value) || 0)}
                                    placeholder="e.g. 540"
                                    min={0}
                                    step={0.01}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Availability Window */}
                        <div>
                            <label className={labelClass}>Availability Window</label>
                            <select
                                value={formData.availability_window}
                                onChange={(e) => handleChange('availability_window', e.target.value)}
                                className={selectClass}
                            >
                                {AVAILABILITY_WINDOWS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        {/* Delivery Window (optional) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Delivery Start <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                                <input
                                    type="date"
                                    value={formData.delivery_window_start}
                                    onChange={(e) => handleChange('delivery_window_start', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Delivery End <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                                <input
                                    type="date"
                                    value={formData.delivery_window_end}
                                    onChange={(e) => handleChange('delivery_window_end', e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Order Expiry */}
                        <div>
                            <label className={labelClass}>Order Expiry</label>
                            <div className="flex gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={() => handleChange('expiry_type', 'GTC')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-1 ${
                                        formData.expiry_type === 'GTC'
                                            ? side === 'BID'
                                                ? 'bg-emerald-500 text-white border border-emerald-500'
                                                : 'bg-[#5DADE2] text-white border border-[#5DADE2]'
                                            : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-slate-400'
                                    }`}
                                >
                                    GTC (Good till Cancelled)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange('expiry_type', 'date')}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-1 ${
                                        formData.expiry_type === 'date'
                                            ? side === 'BID'
                                                ? 'bg-emerald-500 text-white border border-emerald-500'
                                                : 'bg-[#5DADE2] text-white border border-[#5DADE2]'
                                            : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-slate-400'
                                    }`}
                                >
                                    Good-till-Date
                                </button>
                            </div>
                            {formData.expiry_type === 'date' && (
                                <input
                                    type="date"
                                    value={formData.expiry_date}
                                    onChange={(e) => handleChange('expiry_date', e.target.value)}
                                    className={inputClass}
                                />
                            )}
                        </div>

                        {/* Anonymous toggle */}
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={formData.is_anonymous}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 rounded-full bg-slate-200 dark:bg-slate-700 peer-checked:bg-violet-500 transition-colors" />
                                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
                            </div>
                            <EyeOff size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-violet-500 transition-colors" />
                            <div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Anonymous Order</span>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    Your identity will be hidden from the counterparty on matched trades
                                </p>
                            </div>
                        </label>

                        {/* Estimated total */}
                        {formData.quantity_mt > 0 && formData.price_per_mt_usd > 0 && (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">Estimated Total</span>
                                    <span className="text-xl font-bold text-slate-800 dark:text-white">
                                        ${(formData.quantity_mt * formData.price_per_mt_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 text-right mt-1">
                                    {formData.quantity_mt.toLocaleString()} MT x ${formData.price_per_mt_usd}/MT
                                </div>
                            </div>
                        )}

                        {/* Info */}
                        <div className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/20 p-3">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                {side === 'BID'
                                    ? 'Your bid will be live on the orderbook. If a matching ask exists, the trade will be auto-matched instantly.'
                                    : 'Your ask will be live on the orderbook. If a matching bid exists, the trade will be auto-matched instantly.'}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || modalState === 'submitting'}
                            className={`flex-1 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                isValid && modalState !== 'submitting'
                                    ? side === 'BID'
                                        ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                                        : 'bg-[#5DADE2] hover:bg-[#4A9BD9] text-white'
                                    : 'bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-transparent'
                            }`}
                        >
                            {modalState === 'submitting' ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Placing {sideLabel}...
                                </>
                            ) : (
                                `Place ${sideLabel}`
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
