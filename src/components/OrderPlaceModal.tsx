import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader2, CheckCircle2, Zap, AlertTriangle, ChevronDown } from 'lucide-react';
import { Product, DeliveryPoint } from '../types';
import { useNamespace } from '../hooks/useNamespace';
import {
    SPOT_WINDOW,
    getAvailabilityWindowOptions,
    getAvailabilityWindowSummary,
} from '../utils/availabilityWindow';
import { VerdaxisSelect } from './ui/VerdaxisSelect';
import { api } from '../services/api';
import { formatMarketProduct, getProductDisplayName } from '../utils/marketProduct';

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
    certification_scheme: string;
    certification_declared: boolean;
    specification_standard: string;
    msds_available: boolean;
    carbon_intensity_gco2_mj: number;
    feedstock: string;
    origin: string;
    expiry_type: 'GTC' | 'date';
    expiry_date: string;
}

const QUANTITY_PRESETS = [
    { label: '500 MT', value: 500 },
    { label: '1,000 MT', value: 1_000 },
    { label: '2,500 MT', value: 2_500 },
    { label: '5,000 MT', value: 5_000 },
];

const CERTIFICATION_SCHEME_OPTIONS = [
    { value: 'ISCC EU', label: 'ISCC EU', description: 'Renewable transport fuels certification' },
    { value: 'ISCC PLUS', label: 'ISCC PLUS', description: 'Chain-of-custody for circular and bio-based feedstocks' },
    { value: 'REDcert EU', label: 'REDcert EU', description: 'EU renewable fuels certification scheme' },
];

type ModalState = 'form' | 'submitting' | 'success' | 'auto_matched' | 'error';

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
    const [advancedOpen, setAdvancedOpen] = useState(false);

    const [formData, setFormData] = useState<OrderFormData>({
        product_id: '',
        delivery_point_id: '',
        quantity_mt: 1_000,
        price_per_mt_usd: 0,
        availability_window: SPOT_WINDOW,
        certification_scheme: side === 'BID' ? '' : CERTIFICATION_SCHEME_OPTIONS[0].value,
        certification_declared: false,
        specification_standard: '',
        msds_available: false,
        carbon_intensity_gco2_mj: 0,
        feedstock: '',
        origin: '',
        expiry_type: 'GTC',
        expiry_date: '',
    });

    const [modalState, setModalState] = useState<ModalState>('form');
    const [errorMessage, setErrorMessage] = useState('');
    const [matchResult, setMatchResult] = useState<any>(null);

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

            if (activeDps.length > 0 && !formData.delivery_point_id) {
                const found = prefillRegion ? activeDps.find(d =>
                    d.region.toLowerCase().includes(prefillRegion.toLowerCase()) ||
                    d.name.toLowerCase().includes(prefillRegion.toLowerCase())
                ) : undefined;
                setFormData(prev => ({ ...prev, delivery_point_id: (found ?? activeDps[0]).id }));
            }
        }).finally(() => setCatalogLoading(false));
    }, [isOpen, prefillFuelType, prefillRegion, formData.product_id, formData.delivery_point_id]);

    useEffect(() => {
        if (isOpen && prefillPrice && prefillPrice > 0) {
            setFormData(prev => ({ ...prev, price_per_mt_usd: prefillPrice }));
        }
    }, [isOpen, prefillPrice]);


    useEffect(() => {
        setFormData((prev) => ({
            ...prev,
            certification_scheme: side === 'BID' ? '' : (prev.certification_scheme || CERTIFICATION_SCHEME_OPTIONS[0].value),
        }));
    }, [side]);

    const selectedProduct = products.find(p => p.id === formData.product_id);
    const selectedDeliveryPoint = deliveryPoints.find(d => d.id === formData.delivery_point_id);
    const availabilityOptions = useMemo(() => getAvailabilityWindowOptions({
        timeZone: selectedDeliveryPoint?.timezone || 'UTC',
    }), [selectedDeliveryPoint?.timezone]);
    const availabilitySummary = getAvailabilityWindowSummary(formData.availability_window, availabilityOptions);

    const handleChange = (field: keyof OrderFormData, value: string | number | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (!availabilityOptions.some(option => option.value === formData.availability_window)) {
            setFormData(prev => ({ ...prev, availability_window: availabilityOptions[0]?.value ?? SPOT_WINDOW }));
        }
    }, [availabilityOptions, formData.availability_window]);

    if (!isOpen || !ready) return null;

    const hasRequiredAskMetadata =
        formData.specification_standard.trim() !== '' &&
        formData.msds_available &&
        formData.carbon_intensity_gco2_mj > 0 &&
        formData.feedstock.trim() !== '' &&
        formData.origin.trim() !== '';

    const isValid =
        formData.product_id !== '' &&
        formData.delivery_point_id !== '' &&
        formData.quantity_mt > 0 &&
        formData.price_per_mt_usd > 0 &&
        (side === 'BID' || formData.certification_scheme.trim() !== '') &&
        (side === 'BID' || (formData.certification_declared && hasRequiredAskMetadata));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;

        setModalState('submitting');
        setErrorMessage('');

        try {
            const payload: Record<string, any> = {
                side,
                product_id: formData.product_id,
                delivery_point_id: formData.delivery_point_id,
                quantity_mt: formData.quantity_mt,
                price_per_mt_usd: formData.price_per_mt_usd,
                availability_window: formData.availability_window,
                is_anonymous: true,
            };
            if (formData.certification_scheme.trim()) {
                payload.certification_scheme = formData.certification_scheme.trim();
            }
            if (side === 'ASK') {
                payload.certification_declared = formData.certification_declared;
                payload.certifications = [formData.certification_scheme.trim()];
                payload.specification_standard = formData.specification_standard.trim();
                payload.msds_available = formData.msds_available;
                payload.carbon_intensity_gco2_mj = formData.carbon_intensity_gco2_mj;
                payload.feedstock = formData.feedstock.trim();
                payload.origin = formData.origin.trim();
            }
            if (formData.expiry_type === 'date' && formData.expiry_date) {
                payload.expires_at = new Date(formData.expiry_date + 'T23:59:59Z').toISOString();
            }

            const result = await api.orderbook.create(payload as any);

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
        setAdvancedOpen(false);
        onClose();
    };

    const sideLabel = side === 'BID' ? 'Bid' : 'Ask';

    const inputClass = "w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#5DADE2] focus:ring-1 focus:ring-[#5DADE2]";
    const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1";

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
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                                    {t('orderPlaceModal.success.body', {
                                        side: sideLabel.toLowerCase(),
                                        qty: formData.quantity_mt.toLocaleString(),
                                        product: selectedProduct?.name || 'product',
                                        price: formData.price_per_mt_usd,
                                    })}
                                </p>
                            </>
                        )}
                        <button
                            onClick={handleClose}
                            className="w-full py-3 bg-[#334155] dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                        >
                            {t('orderPlaceModal.btn.close')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 border-0 sm:border border-slate-200 dark:border-slate-700 rounded-none sm:rounded-2xl shadow-2xl max-w-lg w-full max-h-screen sm:max-h-[85vh] overflow-hidden flex flex-col">
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

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
                    <div className="p-4 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{t('orderPlaceModal.label.product')}</label>
                                {catalogLoading ? (
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg">
                                        <Loader2 size={14} className="animate-spin text-slate-400" />
                                        <span className="text-sm text-slate-400">{t('orderPlaceModal.loading.products')}</span>
                                    </div>
                                ) : (
                                    <VerdaxisSelect
                                        ariaLabel="Order product"
                                        value={formData.product_id}
                                        onChange={(value) => handleChange('product_id', value)}
                                        options={products.map(product => ({
                                            value: product.id,
                                            label: getProductDisplayName(product),
                                            description: product.market_product ? formatMarketProduct(product.market_product) : undefined,
                                        }))}
                                        placeholder={t('orderPlaceModal.select.product')}
                                    />
                                )}
                            </div>
                            <div>
                                <label className={labelClass}>{t('orderPlaceModal.label.deliveryPoint')}</label>
                                {catalogLoading ? (
                                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg">
                                        <Loader2 size={14} className="animate-spin text-slate-400" />
                                        <span className="text-sm text-slate-400">{t('orderPlaceModal.loading.generic')}</span>
                                    </div>
                                ) : (
                                    <VerdaxisSelect
                                        ariaLabel="Order delivery point"
                                        value={formData.delivery_point_id}
                                        onChange={(value) => handleChange('delivery_point_id', value)}
                                        options={deliveryPoints.map(point => ({
                                            value: point.id,
                                            label: point.name,
                                            description: point.region,
                                        }))}
                                        placeholder={t('orderPlaceModal.select.deliveryPoint')}
                                    />
                                )}
                            </div>
                        </div>

                        {selectedProduct && (
                            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2">
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500 uppercase font-bold">{t('orderPlaceModal.label.product')}</span>
                                        <div className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{getProductDisplayName(selectedProduct)}</div>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 dark:text-slate-500 uppercase font-bold">Market Product</span>
                                        <div className="font-bold text-slate-700 dark:text-slate-200 mt-0.5">{formatMarketProduct(selectedProduct.market_product)}</div>
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

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>{t('orderPlaceModal.label.quantity')}</label>
                                <div className="flex gap-2 flex-wrap mb-1">
                                    {QUANTITY_PRESETS.map(preset => (
                                        <button
                                            key={preset.value}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, quantity_mt: preset.value }))}
                                            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                                                formData.quantity_mt === preset.value
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

                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setAdvancedOpen(open => !open)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 flex items-center justify-between text-left"
                            >
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                        {t('orderPlaceModal.label.advanced')}
                                    </div>
                                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-0.5">
                                        {t('orderPlaceModal.summary.availability', { value: availabilitySummary })}
                                    </div>
                                </div>
                                <ChevronDown
                                    size={18}
                                    className={`text-slate-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {advancedOpen && (
                                <div className="p-4 space-y-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                                    <div>
                                        <label className={labelClass}>{t('orderPlaceModal.label.availability')}</label>
                                        <VerdaxisSelect
                                            ariaLabel="Order availability window"
                                            value={formData.availability_window}
                                            onChange={(value) => handleChange('availability_window', value)}
                                            options={availabilityOptions.map(option => ({ value: option.value, label: option.label }))}
                                        />
                                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                            {t('orderPlaceModal.helper.availability')}
                                        </p>
                                    </div>

                                    <div>
                                        <label className={labelClass}>{t('orderPlaceModal.label.certificationScheme')}</label>
                                        <VerdaxisSelect
                                            ariaLabel={t('orderPlaceModal.label.certificationScheme')}
                                            value={formData.certification_scheme}
                                            onChange={(value) => handleChange('certification_scheme', value)}
                                            options={side === 'BID' ? [{ value: '', label: t('orderPlaceModal.option.anyCertifiedScheme') }, ...CERTIFICATION_SCHEME_OPTIONS] : CERTIFICATION_SCHEME_OPTIONS}
                                        />
                                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                                            {t('orderPlaceModal.helper.certificationScheme')}
                                        </p>
                                    </div>

                                    {side === 'ASK' && (
                                        <>
                                            <label className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-3 bg-slate-50 dark:bg-slate-900">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.certification_declared}
                                                    onChange={(event) => handleChange('certification_declared', event.target.checked)}
                                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]"
                                                />
                                                <span>
                                                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                                        {t('orderPlaceModal.label.certificationDeclared')}
                                                    </span>
                                                    <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {t('orderPlaceModal.helper.certificationDeclared')}
                                                    </span>
                                                </span>
                                            </label>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelClass}>{t('orderPlaceModal.label.specificationStandard')}</label>
                                                    <input
                                                        type="text"
                                                        value={formData.specification_standard}
                                                        onChange={(e) => handleChange('specification_standard', e.target.value)}
                                                        placeholder="e.g. IMPCA"
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>{t('orderPlaceModal.label.carbonIntensity')}</label>
                                                    <input
                                                        type="number"
                                                        value={formData.carbon_intensity_gco2_mj || ''}
                                                        onChange={(e) => handleChange('carbon_intensity_gco2_mj', parseFloat(e.target.value) || 0)}
                                                        placeholder="e.g. 40"
                                                        min={0}
                                                        step={0.01}
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelClass}>{t('orderPlaceModal.label.feedstock')}</label>
                                                    <input
                                                        type="text"
                                                        value={formData.feedstock}
                                                        onChange={(e) => handleChange('feedstock', e.target.value)}
                                                        placeholder="e.g. Waste residue"
                                                        className={inputClass}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={labelClass}>{t('orderPlaceModal.label.origin')}</label>
                                                    <input
                                                        type="text"
                                                        value={formData.origin}
                                                        onChange={(e) => handleChange('origin', e.target.value)}
                                                        placeholder="e.g. Singapore hub"
                                                        className={inputClass}
                                                    />
                                                </div>
                                            </div>

                                            <label className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-3 bg-slate-50 dark:bg-slate-900">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.msds_available}
                                                    onChange={(event) => handleChange('msds_available', event.target.checked)}
                                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]"
                                                />
                                                <span>
                                                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                                                        {t('orderPlaceModal.label.msdsAvailable')}
                                                    </span>
                                                    <span className="block mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                        {t('orderPlaceModal.helper.msdsAvailable')}
                                                    </span>
                                                </span>
                                            </label>
                                        </>
                                    )}

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
                                </div>
                            )}
                        </div>

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

                        <div className="rounded-md border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-900/20 px-3 py-2">
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                {side === 'BID' ? t('orderPlaceModal.info.bid') : t('orderPlaceModal.info.ask')}
                            </p>
                        </div>
                    </div>

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
