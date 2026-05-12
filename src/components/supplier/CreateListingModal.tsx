import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react';

import { api } from '../../services/api';
import type { BenchmarkQuote, DeliveryPoint, Product, SupplierListingTemplate } from '../../types';
import { VerdaxisSelect } from '../ui/VerdaxisSelect';
import { SPOT_WINDOW, getAvailabilityWindowOptions } from '../../utils/availabilityWindow';
import { formatMarketProduct, getProductDisplayName } from '../../utils/marketProduct';

interface CreateListingModalProps {
    onSubmit: (data: ListingFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export interface ListingFormData {
    product_id: string;
    delivery_point_id: string;
    quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: string;
    certifications: string[];
    certification_declared: boolean;
    certification_scheme: string;
    specification_standard: string;
    msds_available: boolean;
    carbon_intensity_gco2_mj?: number;
    carbon_intensity_method: string;
    feedstock: string;
    origin: string;
    off_spec: boolean;
    off_spec_notes: string;
}

const CERTIFICATION_SCHEME_OPTIONS = [
    { value: 'ISCC EU', label: 'ISCC EU', description: 'Renewable transport fuels certification' },
    { value: 'ISCC PLUS', label: 'ISCC PLUS', description: 'Chain-of-custody for circular and bio-based feedstocks' },
    { value: 'REDcert EU', label: 'REDcert EU', description: 'EU renewable fuels certification scheme' },
];

const SPECIFICATION_OPTIONS = [
    { value: 'IMPCA', label: 'IMPCA Methanol Reference', description: 'Methanol commercial reference quality' },
    { value: 'ASTM D4806', label: 'ASTM D4806', description: 'Denatured fuel ethanol specification' },
    { value: 'Supplier COA', label: 'Supplier COA', description: 'Supplier certificate of analysis' },
];

const INITIAL_FORM: ListingFormData = {
    product_id: '',
    delivery_point_id: '',
    quantity_mt: 1_000,
    price_per_mt_usd: 0,
    availability_window: SPOT_WINDOW,
    certifications: [],
    certification_declared: false,
    certification_scheme: '',
    specification_standard: '',
    msds_available: false,
    carbon_intensity_gco2_mj: undefined,
    carbon_intensity_method: '',
    feedstock: '',
    origin: '',
    off_spec: false,
    off_spec_notes: '',
};

function mapTemplateToForm(template: SupplierListingTemplate): ListingFormData {
    return {
        product_id: template.product_id,
        delivery_point_id: template.delivery_point_id,
        quantity_mt: Number(template.quantity_mt) || 1_000,
        price_per_mt_usd: Number(template.price_per_mt_usd) || 0,
        availability_window: template.availability_window || SPOT_WINDOW,
        certifications: [...(template.certifications || [])],
        certification_declared: Boolean(template.certification_declared),
        certification_scheme: template.certification_scheme || '',
        specification_standard: template.specification_standard || '',
        msds_available: Boolean(template.msds_available),
        carbon_intensity_gco2_mj:
            template.carbon_intensity_gco2_mj == null ? undefined : Number(template.carbon_intensity_gco2_mj),
        carbon_intensity_method: template.carbon_intensity_method || '',
        feedstock: template.feedstock || '',
        origin: template.origin || '',
        off_spec: false,
        off_spec_notes: '',
    };
}

function normalizeFormForSubmit(formData: ListingFormData): ListingFormData {
    const trimmedScheme = formData.certification_scheme.trim();
    return {
        ...formData,
        certifications: trimmedScheme ? [trimmedScheme] : [],
        certification_scheme: trimmedScheme,
        specification_standard: formData.specification_standard.trim(),
        carbon_intensity_method: formData.carbon_intensity_method.trim(),
        feedstock: formData.feedstock.trim(),
        origin: formData.origin.trim(),
        off_spec_notes: formData.off_spec ? formData.off_spec_notes.trim() : '',
    };
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
    onSubmit,
    onCancel,
    isLoading = false,
}) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [deliveryPoints, setDeliveryPoints] = useState<DeliveryPoint[]>([]);
    const [formData, setFormData] = useState<ListingFormData>(INITIAL_FORM);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [templateLoaded, setTemplateLoaded] = useState(false);
    const [benchmark, setBenchmark] = useState<BenchmarkQuote | null>(null);
    const [benchmarkLoading, setBenchmarkLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadDependencies() {
            setCatalogLoading(true);
            try {
                const [productsData, deliveryPointsData, latestTemplate] = await Promise.all([
                    api.catalog.products().catch(() => [] as Product[]),
                    api.catalog.deliveryPoints().catch(() => [] as DeliveryPoint[]),
                    api.orderbook.latestAskTemplate().catch(() => null),
                ]);

                if (cancelled) return;

                const activeProducts = productsData.filter(product => product.is_active);
                const activeDeliveryPoints = deliveryPointsData.filter(point => point.is_active);
                setProducts(activeProducts);
                setDeliveryPoints(activeDeliveryPoints);

                if (latestTemplate) {
                    setFormData(mapTemplateToForm(latestTemplate));
                    setTemplateLoaded(true);
                    return;
                }

                setFormData(prev => ({
                    ...prev,
                    product_id: prev.product_id || activeProducts[0]?.id || '',
                    delivery_point_id: prev.delivery_point_id || activeDeliveryPoints[0]?.id || '',
                }));
            } finally {
                if (!cancelled) setCatalogLoading(false);
            }
        }

        loadDependencies();
        return () => {
            cancelled = true;
        };
    }, []);

    const selectedProduct = products.find(product => product.id === formData.product_id);
    const selectedDeliveryPoint = deliveryPoints.find(point => point.id === formData.delivery_point_id);
    const availabilityOptions = useMemo(
        () => getAvailabilityWindowOptions({ timeZone: selectedDeliveryPoint?.timezone || 'UTC' }),
        [selectedDeliveryPoint?.timezone],
    );

    useEffect(() => {
        if (!availabilityOptions.some(option => option.value === formData.availability_window)) {
            setFormData(prev => ({ ...prev, availability_window: availabilityOptions[0]?.value ?? SPOT_WINDOW }));
        }
    }, [availabilityOptions, formData.availability_window]);

    useEffect(() => {
        let cancelled = false;

        async function loadBenchmark() {
            if (!selectedProduct?.market_product || !formData.delivery_point_id || !formData.availability_window) {
                setBenchmark(null);
                return;
            }

            setBenchmarkLoading(true);
            try {
                const response = await api.benchmarks.lookup({
                    market_product: selectedProduct.market_product,
                    delivery_point_id: formData.delivery_point_id,
                    availability_window: formData.availability_window,
                });

                if (!cancelled) {
                    setBenchmark(response.items?.[0] ?? null);
                }
            } catch {
                if (!cancelled) {
                    setBenchmark(null);
                }
            } finally {
                if (!cancelled) setBenchmarkLoading(false);
            }
        }

        loadBenchmark();
        return () => {
            cancelled = true;
        };
    }, [formData.delivery_point_id, formData.availability_window, selectedProduct?.market_product]);

    const benchmarkDelta = benchmark
        ? Number(formData.price_per_mt_usd || 0) - Number(benchmark.benchmark_price_per_mt_usd || 0)
        : null;

    const canSubmit =
        formData.product_id !== '' &&
        formData.delivery_point_id !== '' &&
        formData.quantity_mt > 0 &&
        formData.price_per_mt_usd > 0 &&
        formData.certification_declared &&
        formData.certification_scheme.trim() !== '' &&
        (!formData.off_spec || formData.off_spec_notes.trim() !== '');

    const handleChange = (field: keyof ListingFormData, value: string | number | boolean | undefined) => {
        setFormData(prev => ({ ...prev, [field]: value as never }));
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        onSubmit(normalizeFormForSubmit(formData));
    };

    const productOptions = products.map(product => ({
        value: product.id,
        label: getProductDisplayName(product),
        description: product.market_product ? formatMarketProduct(product.market_product) : undefined,
    }));

    const deliveryPointOptions = deliveryPoints.map(point => ({
        value: point.id,
        label: point.name,
        description: point.region,
    }));

    const availabilitySelectOptions = availabilityOptions.map(option => ({
        value: option.value,
        label: option.label,
    }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-5 dark:border-slate-700 dark:bg-slate-900/80">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create supplier listing</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Benchmark-linked green fuels listing with compliance and sustainability detail.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                        <X size={22} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.4fr)_320px]">
                        <div className="space-y-6">
                            {templateLoaded && (
                                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                    Prefilled from your latest supplier listing. Off-spec is reset and must be re-declared explicitly.
                                </div>
                            )}

                            <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="mb-4">
                                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Commercial</div>
                                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Market identity</h3>
                                </div>
                                {catalogLoading ? (
                                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        <Loader2 size={16} className="animate-spin" />
                                        Loading catalog and defaults...
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Product
                                            </label>
                                            <VerdaxisSelect
                                                ariaLabel="Listing product"
                                                value={formData.product_id}
                                                onChange={value => handleChange('product_id', value)}
                                                options={productOptions}
                                                placeholder="Select product"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Delivery point
                                            </label>
                                            <VerdaxisSelect
                                                ariaLabel="Listing delivery point"
                                                value={formData.delivery_point_id}
                                                onChange={value => handleChange('delivery_point_id', value)}
                                                options={deliveryPointOptions}
                                                placeholder="Select delivery point"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Availability window
                                            </label>
                                            <VerdaxisSelect
                                                ariaLabel="Listing availability window"
                                                value={formData.availability_window}
                                                onChange={value => handleChange('availability_window', value)}
                                                options={availabilitySelectOptions}
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Quantity (MT)
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                step={1}
                                                value={formData.quantity_mt || ''}
                                                onChange={event => handleChange('quantity_mt', Number(event.target.value) || 0)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5DADE2]/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                                placeholder="e.g. 1000"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                                Offer price ($/MT)
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                step={0.01}
                                                value={formData.price_per_mt_usd || ''}
                                                onChange={event => handleChange('price_per_mt_usd', Number(event.target.value) || 0)}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5DADE2]/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                                placeholder="e.g. 625"
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="mb-4">
                                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Compliance</div>
                                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Certification and documents</h3>
                                </div>
                                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
                                    <input
                                        type="checkbox"
                                        checked={formData.certification_declared}
                                        onChange={event => handleChange('certification_declared', event.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <span>
                                        <span className="block font-semibold text-slate-900 dark:text-slate-100">
                                            I declare this listing is certified and eligible for Verdaxis.
                                        </span>
                                        <span className="mt-1 block text-slate-500 dark:text-slate-400">
                                            This is required for every supplier listing. Off-platform logistics can differ, but certification cannot be implied.
                                        </span>
                                    </span>
                                </label>

                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            Certification scheme
                                        </label>
                                        <VerdaxisSelect
                                            ariaLabel="Certification scheme"
                                            value={formData.certification_scheme}
                                            onChange={value => handleChange('certification_scheme', value)}
                                            options={CERTIFICATION_SCHEME_OPTIONS}
                                            placeholder="Select certification scheme"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            Standard / spec
                                        </label>
                                        <VerdaxisSelect
                                            ariaLabel="Specification standard"
                                            value={formData.specification_standard}
                                            onChange={value => handleChange('specification_standard', value)}
                                            options={SPECIFICATION_OPTIONS}
                                            placeholder="Select standard"
                                        />
                                    </div>
                                </div>

                                <label className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
                                    <input
                                        type="checkbox"
                                        checked={formData.msds_available}
                                        onChange={event => handleChange('msds_available', event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-[#5DADE2] focus:ring-[#5DADE2]"
                                    />
                                    <span className="text-slate-700 dark:text-slate-300">MSDS is available for this listing</span>
                                </label>
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="mb-4">
                                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Sustainability</div>
                                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Attribute pack</h3>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            CI (gCO2e/MJ)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            step={0.01}
                                            value={formData.carbon_intensity_gco2_mj ?? ''}
                                            onChange={event => handleChange(
                                                'carbon_intensity_gco2_mj',
                                                event.target.value === '' ? undefined : Number(event.target.value),
                                            )}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5DADE2]/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            placeholder="e.g. 12.4"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            CI methodology
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.carbon_intensity_method}
                                            onChange={event => handleChange('carbon_intensity_method', event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5DADE2]/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            placeholder="e.g. LCFS, RED II, supplier LCA"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            Feedstock
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.feedstock}
                                            onChange={event => handleChange('feedstock', event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5DADE2]/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            placeholder="e.g. waste residue"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            Origin
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.origin}
                                            onChange={event => handleChange('origin', event.target.value)}
                                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5DADE2]/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            placeholder="e.g. Brazil, Europe, waste gas"
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="mb-4">
                                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Exceptions</div>
                                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">Off-spec handling</h3>
                                </div>
                                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-950">
                                    <input
                                        type="checkbox"
                                        checked={formData.off_spec}
                                        onChange={event => handleChange('off_spec', event.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                    />
                                    <span className="text-slate-700 dark:text-slate-300">
                                        This listing is off-spec and should be handled as an exception listing.
                                    </span>
                                </label>
                                {formData.off_spec && (
                                    <div className="mt-4">
                                        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            Off-spec notes
                                        </label>
                                        <textarea
                                            value={formData.off_spec_notes}
                                            onChange={event => handleChange('off_spec_notes', event.target.value)}
                                            className="min-h-[110px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5DADE2]/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            placeholder="Describe the variance clearly. This field is required for off-spec listings."
                                        />
                                    </div>
                                )}
                            </section>
                        </div>

                        <aside className="space-y-4">
                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                    <ShieldCheck size={14} />
                                    Listing summary
                                </div>
                                <div className="mt-4 space-y-3">
                                    <div>
                                        <div className="text-xs uppercase tracking-wide text-slate-400">Product</div>
                                        <div className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
                                            {selectedProduct ? getProductDisplayName(selectedProduct) : 'Select product'}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs uppercase tracking-wide text-slate-400">Delivery point</div>
                                        <div className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                            {selectedDeliveryPoint ? `${selectedDeliveryPoint.name} · ${selectedDeliveryPoint.region}` : 'Select delivery point'}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
                                            <div className="text-xs uppercase tracking-wide text-slate-400">Quantity</div>
                                            <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                                {formData.quantity_mt.toLocaleString()} MT
                                            </div>
                                        </div>
                                        <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-slate-950">
                                            <div className="text-xs uppercase tracking-wide text-slate-400">Price</div>
                                            <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                                                ${formData.price_per_mt_usd || 0}/MT
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="flex items-center justify-between">
                                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Benchmark</div>
                                    {benchmarkLoading && <Loader2 size={14} className="animate-spin text-slate-400" />}
                                </div>
                                {benchmark ? (
                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <div className="text-xs uppercase tracking-wide text-slate-400">Reference price</div>
                                            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                                                ${Number(benchmark.benchmark_price_per_mt_usd).toLocaleString()}/MT
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                {benchmark.source || 'Benchmark'}
                                            </div>
                                        </div>
                                        <div
                                            className={`rounded-2xl border px-4 py-3 text-sm ${
                                                benchmarkDelta != null && benchmarkDelta <= 0
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                                                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                                            }`}
                                        >
                                            {benchmarkDelta == null ? (
                                                'Enter a price to compare against the benchmark.'
                                            ) : benchmarkDelta === 0 ? (
                                                'At benchmark.'
                                            ) : benchmarkDelta < 0 ? (
                                                `${Math.abs(benchmarkDelta).toFixed(2)} below benchmark`
                                            ) : (
                                                `${benchmarkDelta.toFixed(2)} above benchmark`
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        No benchmark is available for this product, port, and availability window yet.
                                    </div>
                                )}
                            </div>

                            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900/70">
                                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Readiness</div>
                                <div className="mt-4 space-y-3 text-sm">
                                    <div className={`flex items-center gap-2 ${formData.certification_declared ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {formData.certification_declared ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        Certification declaration
                                    </div>
                                    <div className={`flex items-center gap-2 ${formData.certification_scheme ? 'text-emerald-600 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                                        {formData.certification_scheme ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        Certification scheme
                                    </div>
                                    <div className={`flex items-center gap-2 ${!formData.off_spec || formData.off_spec_notes.trim() ? 'text-emerald-600 dark:text-emerald-300' : 'text-amber-600 dark:text-amber-300'}`}>
                                        {!formData.off_spec || formData.off_spec_notes.trim() ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        Off-spec note ready
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>

                    <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/80">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!canSubmit || isLoading}
                            className={`flex-1 rounded-2xl px-4 py-3 font-semibold transition ${
                                canSubmit && !isLoading
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                                    : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                            }`}
                        >
                            {isLoading ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Publishing...
                                </span>
                            ) : (
                                'Publish listing'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
