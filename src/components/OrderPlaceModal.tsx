import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, Zap, AlertTriangle, EyeOff, ChevronDown } from 'lucide-react';
import { Product, DeliveryPoint } from '../types';
import { useNamespace } from '../hooks/useNamespace';

interface OrderPlaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    side: 'BID' | 'ASK';
    prefillFuelType?: string;
    prefillRegion?: string;
    prefillPrice?: number;
}

interface OrderFormData {
    product_id: string;
    delivery_point_id: string;
    quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: string;
    delivery_window_start: string;
    delivery_window_end: string;
    expiry_type: 'GTC' | 'date';
    expiry_date: string;
    is_anonymous: boolean;
}

const AVAILABILITY_WINDOWS = ['Spot', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Forward 2027', 'Forward 2028'];
const QUANTITY_PRESETS = [
    { label: '500 MT', value: 500 },
    { label: '1,000 MT', value: 1_000 },
    { label: '2,500 MT', value: 2_500 },
    { label: '5,000 MT', value: 5_000 },
];

import { api } from '../services/api';

type ModalState = 'form' | 'submitting' | 'checking_matches' | 'success' | 'auto_matched' | 'error';

export const OrderPlaceModal: React.FC<OrderPlaceModalProps> = ({
    isOpen,
    onClose,
    side,
    prefillFuelType,
    prefillRegion,
    prefillPrice,
}) => {
    const { t, ready } = useNamespace('trading');
    const [products, setProducts] = useState<Product[]>([]);
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
    const [catalogLoading, setCatalogLoading] = useState(false);

    const [formData, setFormData] = useState<OrderFormData>({
        product_id: '',
        delivery_point_id: '',
        quantity_mt: 0,
        price_per_mt_usd: 0,
        availability_window: AVAILABILITY_WINDOWS[0],
        delivery_window_start: '',
        delivery_window_end: '',
        expiry_type: 'GTC',
        expiry_date: '',
        is_anonymous: true,
    });

    const [modalState, setModalState] = useState<ModalState>('form');
    const [errorMessage, setErrorMessage] = useState('');
    const [matchResult, setMatchResult] = useState<any>(null);
    const [matchSuggestionsCount, setMatchSuggestionsCount] = useState<number | null>(null);
    const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Fetch products and delivery points on mount
    useEffect(() => {
        if (!isOpen) return;
        setCatalogLoading(true);
        Promise.all([
            api.catalog.products().catch(() => [] as Product[]),
            api.catalog.deliveryPoints().catch(() => [] as DeliveryPoint[]),
        ]).then(([prods, dps]) => {
            const activeProds = prods.filter(p => p.is_active);
            const activeDps = dps.filter(d => d.is_active);
            setProducts(activeProds);
            setDeliveryPoints(activeDps);

            // Auto-select first product, or match prefillFuelType
            if (activeProds.length > 0 && !formData.product_id) {
                let match = activeProds[0];
                if (prefillFuelType) {
                    const found = activeProds.find(p =>
                        p.fuel_type.toLowerCase() === prefillFuelType.toLowerCase() ||
                        p.name.toLowerCase().includes(prefillFuelType.toLowerCase())
                    );
                    if (found) match = found;
                }
                setFormData(prev => ({ ...prev, product_id: match.id }));
            }

            // Auto-select delivery point matching prefillRegion
            if (activeDps.length > 0 && !formData.delivery_point_id && prefillRegion) {
                const found = activeDps.find(d =>
                    d.region.toLowerCase().includes(prefillRegion.toLowerCase()) ||
                    d.name.toLowerCase().includes(prefillRegion.toLowerCase())
                );
                if (found) {
                    setFormData(prev => ({ ...prev, delivery_point_id: found.id }));
                }
            }
        }).finally(() => setCatalogLoading(false));
    }, [isOpen]);

    // Apply prefillPrice when modal opens with a price from orderbook click
    useEffect(() => {
        if (isOpen && prefillPrice && prefillPrice > 0) {
            setFormData(prev => ({ ...prev, price_per_mt_usd: prefillPrice }));
        }
    }, [isOpen, prefillPrice]);

    if (!isOpen || !ready) return null;

    const selectedProduct = products.find(p => p.id === formData.product_id);
    const selectedDeliveryPoint = deliveryPoints.find(d => d.id === formData.delivery_point_id);

    const handleChange = (field: keyof OrderFormData, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isValid = formData.product_id !== '' && formData.quantity_mt > 0 && formData.price_per_mt_usd > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setModalState('submitting');
        setErrorMessage('');

        try {
            const payload: Record<string, any> = {
                side,
                product_id: formData.product_id,
                quantity_mt: formData.quantity_mt,
                price_per_mt_usd: formData.price_per_mt_usd,
                availability_window: formData.availability_window,
                is_anonymous: formData.is_anonymous,
            };
            if (formData.delivery_point_id) {
                payload.delivery_point_id = formData.delivery_point_id;
            }
            if (formData.delivery_window_start) {
                payload.delivery_window_start = formData.delivery_window_start;
            }
            if (formData.delivery_window_end) {
                payload.delivery_window_end = formData.delivery_window_end;
            }
            if (formData.expiry_type === 'date' && formData.expiry_date) {
                payload.expires_at = new Date(formData.expiry_date + 'T23:59:59Z').toISOString();
            }

            const result = await api.orderbook.create(payload as any);

            // Check if auto-matched: the backend returns trades array when auto-matching occurs
            if (result.trades && result.trades.length > 0) {
                setMatchResult(result);
                setModalState('auto_matched');
            } else {
                // No auto-match — check for potential matches (with timeout)
                const orderId = result.order?.id || result.id;
                setCreatedOrderId(orderId);
                setModalState('checking_matches');
                try {
                    const matchPromise = api.matchmaking.generate(orderId);
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('timeout')), 10000)
                    );
                    const matches = await Promise.race([matchPromise, timeoutPromise]);
                    setMatchSuggestionsCount(Array.isArray(matches) ? matches.length : 0);
                } catch {
                    setMatchSuggestionsCount(0);
                }
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
        setMatchSuggestionsCount(null);
        setCreatedOrderId(null);
        onClose();
    };

    const sideLabel = side === 'BID' ? 'Bid' : 'Ask';

    const selectClass = "w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-[#5DADE2] focus:ring-1 focus:ring-[#5DADE2]";
    const inputClass = "w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#5DADE2] focus:ring-1 focus:ring-[#5DADE2]";
    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1";

    // Checking matches overlay
    if (modalState === 'checking_matches') {
        return (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                    <div className="p-8 text-center">
                        <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-emerald-100 dark:bg-emerald-900/30">
                            <Loader2 size={32} className="text-emerald-500 animate-spin" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            {sideLabel} Posted!
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Checking for potential matches...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

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
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('orderPlaceModal.error.title')}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">{errorMessage}</p>
                            </>
                        ) : modalState === 'auto_matched' ? (
                            <>
                                {/* Animated lightning bolt with pulse ring */}
                                <div className="relative mx-auto w-20 h-20 mb-5">
                                    <div className="absolute inset-0 rounded-full bg-violet-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                                    <div className="absolute inset-1 rounded-full bg-violet-500/10 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                        <Zap size={36} className="text-white drop-shadow-lg" fill="white" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-1 tracking-tight">
                                    Instantly Matched!
                                </h3>
                                <p className="text-violet-600 dark:text-violet-400 text-sm font-semibold mb-1">
                                    Your {sideLabel.toLowerCase()} found a counterparty
                                </p>
                                <p className="text-slate-400 dark:text-slate-500 text-xs mb-5">
                                    Executed at the maker's resting price (best available)
                                </p>
                                {matchResult?.trades?.map((trade: any, i: number) => {
                                    const totalValue = (trade.quantity_mt || 0) * (trade.price_per_mt_usd || 0);
                                    return (
                                        <div key={i} className="relative overflow-hidden bg-gradient-to-r from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 border border-violet-200 dark:border-violet-700/50 rounded-xl p-5 text-left mb-3">
                                            {/* Decorative corner accent */}
                                            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-violet-200/40 dark:from-violet-600/10 to-transparent rounded-bl-full" />
                                            <div className="grid grid-cols-2 gap-3 relative">
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400 dark:text-violet-500 mb-0.5">Quantity</div>
                                                    <div className="text-lg font-extrabold text-slate-900 dark:text-white">{trade.quantity_mt?.toLocaleString()} <span className="text-sm font-medium text-slate-400">MT</span></div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-violet-400 dark:text-violet-500 mb-0.5">Price</div>
                                                    <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">${trade.price_per_mt_usd}<span className="text-sm font-medium">/MT</span></div>
                                                </div>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-violet-200/60 dark:border-violet-700/30 flex justify-between items-center">
                                                <div>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 dark:text-violet-500">Total Value</span>
                                                    <div className="text-base font-bold text-slate-800 dark:text-slate-200">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/50">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">CONFIRMED</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 mb-4">
                                    Trade is confirmed and visible in your Trade History.
                                    {matchResult?.trades?.length > 0 && matchResult.trades[0].price_per_mt_usd !== formData.price_per_mt_usd && (
                                        <span className="block mt-1 text-emerald-600 dark:text-emerald-400 font-medium">
                                            Price improvement: you {side === 'BID' ? 'paid' : 'received'} ${matchResult.trades[0].price_per_mt_usd}/MT instead of your ${formData.price_per_mt_usd}/MT {sideLabel.toLowerCase()}.
                                        </span>
                                    )}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${side === 'BID' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                    <CheckCircle2 size={32} className={side === 'BID' ? 'text-emerald-500' : 'text-blue-500'} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                    {t('orderPlaceModal.success.title', { side: sideLabel })}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    {t('orderPlaceModal.success.body', {
                                        side: sideLabel.toLowerCase(),
                                        qty: formData.quantity_mt.toLocaleString(),
                                        product: selectedProduct?.name || 'product',
                                        price: formData.price_per_mt_usd,
                                    })}
                                </p>
                                {matchSuggestionsCount !== null && matchSuggestionsCount > 0 && (
                                    <div className="mt-3 mb-4 px-4 py-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50">
                                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                            {matchSuggestionsCount} potential match{matchSuggestionsCount > 1 ? 'es' : ''} found
                                        </p>
                                    </div>
                                )}
                                {(matchSuggestionsCount === null || matchSuggestionsCount === 0) && (
                                    <div className="mb-4" />
                                )}
                            </>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setModalState('form');
                                    setMatchSuggestionsCount(null);
                                    setCreatedOrderId(null);
                                }}
                                className="flex-1 py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold rounded-lg transition-colors"
                            >
                                Post Another
                            </button>
                            <button
                                onClick={handleClose}
                                className="flex-1 py-3 bg-[#334155] dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                            >
                                {t('orderPlaceModal.btn.close')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 border-0 sm:border border-slate-200 dark:border-slate-700 rounded-none sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-screen sm:max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-slate-800">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200 font-['Montserrat']">
                                {t('orderPlaceModal.title', { side: sideLabel })}
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
                            {side === 'BID' ? t('orderPlaceModal.subtitle.bid') : t('orderPlaceModal.subtitle.ask')}
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
                    <div className="p-4 space-y-3">

                        {/* Fuel Type */}
                        <div>
                            <label className={labelClass}>{t('orderPlaceModal.label.product')}</label>
                            {catalogLoading ? (
                                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg">
                                    <Loader2 size={14} className="animate-spin text-slate-400" />
                                    <span className="text-sm text-slate-400">{t('orderPlaceModal.loading.products')}</span>
                                </div>
                            ) : (
                                <select
                                    value={formData.product_id}
                                    onChange={(e) => handleChange('product_id', e.target.value)}
                                    className={selectClass}
                                    required
                                >
                                    <option value="">{t('orderPlaceModal.select.product')}</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Product details panel (shown when product selected) */}
                        {selectedProduct && (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2">
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500 uppercase font-bold">{t('orderPlaceModal.label.fuelType')}</span>
                                        <div className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{selectedProduct.fuel_type}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500 uppercase font-bold">{t('orderPlaceModal.label.grade')}</span>
                                        <div className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{selectedProduct.fuel_grade}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500 uppercase font-bold">{t('orderPlaceModal.label.unit')}</span>
                                        <div className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{selectedProduct.unit}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500 uppercase font-bold">{t('orderPlaceModal.label.minLot')}</span>
                                        <div className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{selectedProduct.min_lot_size.toLocaleString()} MT</div>
                                    </div>
                                    {selectedDeliveryPoint && (
                                        <div>
                                            <span className="text-slate-400 dark:text-slate-500 uppercase font-bold">{t('orderPlaceModal.label.region')}</span>
                                            <div className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{selectedDeliveryPoint.region}</div>
                                        </div>
                                    )}
                                </div>
                                {selectedProduct.spec_description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                                        {selectedProduct.spec_description}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Quantity & Price */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{t('orderPlaceModal.label.quantity')}</label>
                                {/* Quantity Presets */}
                                <div className="flex gap-2 flex-wrap mb-1">
                                    {QUANTITY_PRESETS.map(preset => (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, quantity_mt: preset.value }))}
                                            className={`text-[11px] px-2 py-1 rounded-md border transition-colors
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
                                    placeholder={selectedProduct ? `Min ${selectedProduct.min_lot_size.toLocaleString()} MT` : 'e.g. 2000'}
                                    min={selectedProduct?.min_lot_size || 0}
                                    step={1}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>{t('orderPlaceModal.label.price')} <span className="normal-case font-normal text-slate-400">(Delivered FOB)</span></label>
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
                            <label className={labelClass}>{t('orderPlaceModal.label.availability')}</label>
                            <select
                                value={formData.availability_window}
                                onChange={(e) => handleChange('availability_window', e.target.value)}
                                className={selectClass}
                            >
                                {AVAILABILITY_WINDOWS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        {/* Advanced Options Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                        >
                            <ChevronDown size={16} className={`transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`} />
                            Advanced Options
                        </button>

                        {showAdvanced && (
                            <div className="space-y-4 border-l-2 border-slate-200 dark:border-slate-700 pl-4">
                                {/* Delivery Point */}
                                <div>
                                    <label className={labelClass}>
                                        {t('orderPlaceModal.label.deliveryPoint')}
                                        <span className="text-slate-400 normal-case font-normal ml-1">{t('orderPlaceModal.label.deliveryPointOptional')}</span>
                                    </label>
                                    {catalogLoading ? (
                                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg">
                                            <Loader2 size={14} className="animate-spin text-slate-400" />
                                            <span className="text-sm text-slate-400">{t('orderPlaceModal.loading.generic')}</span>
                                        </div>
                                    ) : (
                                        <select
                                            value={formData.delivery_point_id}
                                            onChange={(e) => handleChange('delivery_point_id', e.target.value)}
                                            className={selectClass}
                                        >
                                            <option value="">{t('orderPlaceModal.select.anyLocation')}</option>
                                            {deliveryPoints.map(d => (
                                                <option key={d.id} value={d.id}>{d.name} ({d.region})</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Delivery Window (optional) */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>{t('orderPlaceModal.label.deliveryStart')} <span className="text-slate-400 normal-case font-normal">{t('orderPlaceModal.label.optional')}</span></label>
                                        <input
                                            type="date"
                                            value={formData.delivery_window_start}
                                            onChange={(e) => handleChange('delivery_window_start', e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>{t('orderPlaceModal.label.deliveryEnd')} <span className="text-slate-400 normal-case font-normal">{t('orderPlaceModal.label.optional')}</span></label>
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
                                    <label className={labelClass}>{t('orderPlaceModal.label.expiry')}</label>
                                    <div className="flex gap-2 mb-2">
                                        <button
                                            type="button"
                                            onClick={() => handleChange('expiry_type', 'GTC')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-1 ${
                                                formData.expiry_type === 'GTC'
                                                    ? side === 'BID'
                                                        ? 'bg-emerald-500 text-white border border-emerald-500'
                                                        : 'bg-[#5DADE2] text-white border border-[#5DADE2]'
                                                    : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-slate-400'
                                            }`}
                                        >
                                            {t('orderPlaceModal.expiry.gtc')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleChange('expiry_type', 'date')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex-1 ${
                                                formData.expiry_type === 'date'
                                                    ? side === 'BID'
                                                        ? 'bg-emerald-500 text-white border border-emerald-500'
                                                        : 'bg-[#5DADE2] text-white border border-[#5DADE2]'
                                                    : 'bg-white dark:bg-slate-900 text-slate-500 border border-slate-200 dark:border-slate-600 hover:border-slate-400'
                                            }`}
                                        >
                                            {t('orderPlaceModal.expiry.date')}
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
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('orderPlaceModal.label.anonymous')}</span>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                            {t('orderPlaceModal.anonymous.description')}
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}

                        {/* Estimated total */}
                        {formData.quantity_mt > 0 && formData.price_per_mt_usd > 0 && (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{t('orderPlaceModal.label.estimatedTotal')}</span>
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
                        <div className="rounded-md border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                {side === 'BID' ? t('orderPlaceModal.info.bid') : t('orderPlaceModal.info.ask')}
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 py-2.5 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-sm rounded-lg transition-colors"
                        >
                            {t('orderPlaceModal.btn.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!isValid || modalState === 'submitting'}
                            className={`flex-1 py-2.5 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 ${
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
                                    {t('orderPlaceModal.btn.placing', { side: sideLabel })}
                                </>
                            ) : (
                                t('orderPlaceModal.btn.place', { side: sideLabel })
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
