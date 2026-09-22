import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, PanelRightClose, Anchor, Ship, LineChart, ArrowRight, Shield } from 'lucide-react';
import { Port, Product, ForwardCurvePoint } from '../../types';
import { api } from '../../services/api';
import { useNamespace } from '../../hooks/useNamespace';
import { NewsFeed } from '../NewsFeed';
import { ComplianceEstimatorCard } from './ComplianceEstimatorCard';
import { getProductDisplayName, isOrderbookMarketProduct, isOrderbookProduct } from '../../utils/marketProduct';
import { normalizeAvailabilityWindow } from '../../utils/availabilityWindow';

const enumKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

interface CurveReference {
    productId: string;
    label: string;
    status: 'ready' | 'empty' | 'unavailable';
    spotPrice: number | null;
    change: number | null;
}

const positivePrice = (value: number | null | undefined): number | null => {
    if (value == null) return null;
    const price = Number(value);
    return Number.isFinite(price) && price > 0 ? price : null;
};

function supportsDeliveryPoint(product: Product, deliveryPointId: string | undefined): boolean {
    if (!deliveryPointId) return true;
    if (product.available_delivery_point_ids) {
        return product.available_delivery_point_ids.includes(deliveryPointId);
    }
    // Only legacy alcohol catalogs can omit delivery coverage. B100 needs
    // explicit coverage before requesting a price for a selected port.
    return product.market_product !== 'UCOME_B100';
}

function buildCurveReference(
    product: Product,
    result: PromiseSettledResult<{ curve: ForwardCurvePoint[] }>,
): CurveReference {
    const reference: CurveReference = {
        productId: product.id,
        label: getProductDisplayName(product),
        status: result.status === 'rejected' ? 'unavailable' : 'empty',
        spotPrice: null,
        change: null,
    };
    if (result.status !== 'fulfilled' || !result.value.curve?.length) return reference;

    reference.status = 'ready';
    const curve = result.value.curve;
    const spot = curve.find(point => normalizeAvailabilityWindow(point.availability_window) === 'SPOT');
    reference.spotPrice = positivePrice(spot?.mid_price);
    // The API sorts points by delivery window. Do not substitute a forward
    // price for spot, or show a flat curve when only one period has evidence.
    const forwardPoints = curve.filter(point => (
        normalizeAvailabilityWindow(point.availability_window) !== 'SPOT'
        && positivePrice(point.mid_price) !== null
    ));
    const farPrice = positivePrice(forwardPoints[forwardPoints.length - 1]?.mid_price);
    if (reference.spotPrice !== null && farPrice !== null) {
        reference.change = ((farPrice - reference.spotPrice) / reference.spotPrice) * 100;
    }
    return reference;
}

interface IntelligencePanelProps {
    active?: boolean;
    isOpen: boolean;
    onClose: () => void;
    selectedPort: Port | undefined;
    portOptions?: Port[];
    onMapPortSelect?: (port: Port) => void;
    onPortSelect: (port: Port) => void;
    selectedProduct?: string;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
    active = true,
    isOpen,
    onClose,
    selectedPort,
    portOptions = [],
    onMapPortSelect,
    onPortSelect,
    selectedProduct,
}) => {
    const { t, ready } = useNamespace('dashboard');
    const [activeTab, setActiveTab] = useState<'PRIMARY' | 'NEWS'>('NEWS');

    const [curveProducts, setCurveProducts] = useState<CurveReference[]>([]);
    const [curveStatus, setCurveStatus] = useState<'loading' | 'ready' | 'unavailable'>('loading');
    const deliveryPointId = selectedPort?.catalogDeliveryPointId;
    const curveProduct = isOrderbookMarketProduct(selectedProduct) ? selectedProduct : undefined;

    const marketPriceLabel = selectedPort && selectedPort.priceMethanol > 0
        ? `$${selectedPort.priceMethanol}`
        : '--';
    const availabilityValue = selectedPort && selectedPort.methanolSupply !== 'Unknown'
        ? selectedPort.methanolSupply
        : null;
    const availabilityLabel = availabilityValue
        ? t(`intelligencePanel.availabilityLevels.${enumKey(availabilityValue)}`, { defaultValue: t('intelligencePanel.availabilityLevels.unknown') })
        : '--';
    const availabilityTone = availabilityValue === 'High'
        ? 'text-emerald-500'
        : availabilityValue === 'Medium'
            ? 'text-amber-500'
            : availabilityValue === 'Low'
                ? 'text-red-500'
                : 'text-slate-400 dark:text-slate-500';
    const availabilityDotTone = availabilityValue === 'High'
        ? 'bg-emerald-500 animate-pulse'
        : availabilityValue === 'Medium'
            ? 'bg-amber-500'
            : availabilityValue === 'Low'
                ? 'bg-red-500'
                : 'bg-slate-400';
    const hasPriceHistory = Boolean(selectedPort?.details?.priceHistory?.length);
    const congestionValue = selectedPort?.details?.congestionLevel && selectedPort.details.congestionLevel !== 'Unknown'
        ? selectedPort.details.congestionLevel
        : null;
    const congestionLabel = congestionValue
        ? t(`intelligencePanel.congestionLevels.${enumKey(congestionValue)}`, { defaultValue: t('intelligencePanel.congestionLevels.unknown') })
        : '--';

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        setCurveStatus('loading');
        setCurveProducts([]);
        (async () => {
            try {
                const products: Product[] = await api.catalog.products();
                if (cancelled) return;
                const activeProducts = products.filter(product => (
                    isOrderbookProduct(product)
                    && (!curveProduct || product.market_product === curveProduct)
                    && supportsDeliveryPoint(product, deliveryPointId)
                ));
                const results = await Promise.allSettled(activeProducts.map(product => (
                    api.curves.forward({
                        product_id: product.id,
                        ...(deliveryPointId ? { delivery_point_id: deliveryPointId } : {}),
                    })
                )));
                if (cancelled) return;
                setCurveProducts(results.map((result, index) => (
                    buildCurveReference(activeProducts[index], result)
                )));
                setCurveStatus('ready');
            } catch {
                if (!cancelled) setCurveStatus('unavailable');
            }
        })();
        return () => { cancelled = true; };
    }, [active, curveProduct, deliveryPointId]);


    if (!ready) return null;

    const primaryTabLabel = selectedPort ? t('intelligencePanel.tabs.portIntel') : t('intelligencePanel.tabs.estimator');
    const tabOptions = [
        { key: 'NEWS' as const, label: t('intelligencePanel.tabs.news') },
        { key: 'PRIMARY' as const, label: primaryTabLabel },
    ];

    const curvePriceLabel = (item: CurveReference) => {
        if (item.status === 'unavailable') return t('intelligencePanel.curveUnavailable');
        if (item.status === 'empty') return t('intelligencePanel.noCurveData');
        if (item.spotPrice === null) return t('intelligencePanel.noSpotReference');
        return `${t('intelligencePanel.spotReference')} $${item.spotPrice.toFixed(0)}/MT`;
    };

    const forwardReferences = (
        <section>
            <div className="mb-2 flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('intelligencePanel.indicativeForwardReferences')}
                </h3>
                <LineChart size={14} className="text-slate-400" />
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                {curveStatus !== 'ready' ? (
                    <div role="status" className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {t(`intelligencePanel.${curveStatus === 'loading' ? 'loadingIndicativeCurveReferences' : 'curveUnavailable'}`)}
                    </div>
                ) : curveProducts.length === 0 ? (
                    <div className="px-3 py-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {t('intelligencePanel.noCurveProducts')}
                    </div>
                ) : curveProducts.map(item => (
                    <div
                        key={item.productId}
                        className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-slate-800"
                    >
                        <div className="min-w-0">
                            <div className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{item.label}</div>
                            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                {curvePriceLabel(item)}
                            </div>
                            <div className="mt-0.5 text-[9px] text-slate-400 dark:text-slate-500">
                                {t(`intelligencePanel.${deliveryPointId ? 'portLevelReference' : 'productLevelReference'}`)}
                            </div>
                        </div>
                        {item.change !== null && (
                            <div className="text-right">
                                <div className={`text-xs font-bold tabular-nums ${item.change >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                    {item.change >= 0 ? '+' : ''}{item.change.toFixed(1)}%
                                </div>
                                <div className="mt-0.5 rounded border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                    {t(`intelligencePanel.${item.change >= 0 ? 'contango' : 'backwardation'}`)}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <div className="mt-2 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500">
                {deliveryPointId
                    ? t('intelligencePanel.selectedDeliveryPointFilter', { port: selectedPort?.name })
                    : t('intelligencePanel.noDeliveryPointFilter')}
            </div>
        </section>
    );

    const primaryContent = selectedPort ? (
        <>
            {/* Market Price & Trend */}
            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="mb-1 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('intelligencePanel.marketPrice')}</div>
                    <div className="flex items-center font-['Montserrat'] text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {marketPriceLabel}
                        {selectedPort.priceMethanol > 0 && selectedPort.priceTrend !== undefined && (
                            <span className={`ml-2 flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${selectedPort.priceTrend >= 0 ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20' : 'bg-red-50 text-red-500 dark:bg-red-900/20'}`}>
                                {selectedPort.priceTrend >= 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                                {selectedPort.priceTrend >= 0 ? '+' : ''}{selectedPort.priceTrend.toFixed(1)}%
                            </span>
                        )}
                    </div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="mb-1 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('intelligencePanel.availability')}</div>
                    <div className={`flex items-center text-xl font-bold ${availabilityTone}`}>
                        {availabilityLabel}
                        <div className={`ml-2 h-3 w-3 rounded-full ${availabilityDotTone}`}></div>
                    </div>
                </div>
            </div>

            <ComplianceEstimatorCard
                selectedPort={selectedPort}
                portOptions={portOptions}
                onSelectPort={onMapPortSelect}
                onOpenMarketplace={onPortSelect}
            />

            {/* Port Specific Data — auto-hidden when no real data */}
            {selectedPort.details && (selectedPort.details.avgWaitingTime > 0 || selectedPort.details.activeBarges > 0) && (
                <div className="grid grid-cols-2 gap-3">
                    {selectedPort.details.avgWaitingTime > 0 && (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400">
                                <Anchor size={10} /> {t('intelligencePanel.congestion')}
                            </div>
                            <div className={`text-sm font-bold ${congestionValue === 'High' ? 'text-red-500' : congestionValue === 'Moderate' ? 'text-amber-500' : 'text-green-600'}`}>
                                {congestionLabel}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('intelligencePanel.waitAvg', { hours: selectedPort.details.avgWaitingTime })}</div>
                        </div>
                    )}
                    {selectedPort.details.activeBarges > 0 && (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
                            <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400">
                                <Ship size={10} /> {t('intelligencePanel.supply')}
                            </div>
                            <div className="text-sm font-bold text-[#334155] dark:text-slate-200">
                                {t(`intelligencePanel.supplyLevels.${enumKey(selectedPort.details.forecastSupply)}`, { defaultValue: t('intelligencePanel.supplyLevels.unknown') })}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">{t('intelligencePanel.activeBarges', { count: selectedPort.details.activeBarges })}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Compliance & Future Projects */}
            {selectedPort.details?.upcomingProjects && selectedPort.details.upcomingProjects.length > 0 && (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                        <Shield size={16} className="text-blue-500" /> {t('intelligencePanel.futurePipeline')}
                    </h3>
                    <div className="space-y-2">
                        {selectedPort.details.upcomingProjects.map((project, idx) => (
                            <div key={idx} className="flex items-center justify-between rounded border border-slate-100 bg-white p-2 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800">
                                <div>
                                    <div className="font-bold text-verdaxis-dark dark:text-slate-200">{project.project}</div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{project.year}</div>
                                </div>
                                <div className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono font-bold text-emerald-600 dark:bg-emerald-900/20">
                                    {project.capacity}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Price history is supplied only for the selected market. */}
            <div className="rounded-lg border border-slate-100 p-4 dark:border-slate-700">
                <h3 className="mb-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('intelligencePanel.methanolPrice7Day')}</h3>
                {hasPriceHistory ? (
                    <div className="flex h-24 items-end space-x-1">
                        {selectedPort.details!.priceHistory.map((price, i) => {
                            const h = (price / 600) * 100;
                            return (
                                <div key={i} className="group relative flex-1 rounded-t bg-blue-100 transition-colors hover:bg-[#5DADE2]">
                                    <div className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-slate-800 px-1 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                                        ${price}
                                    </div>
                                    <div style={{ height: `${h}%` }}></div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{t('intelligencePanel.noPortHistory')}</div>
                )}
            </div>

            {forwardReferences}

            <button
                onClick={() => onPortSelect(selectedPort)}
                className="flex w-full items-center justify-center space-x-2 rounded-lg bg-[#5DADE2] py-3 font-bold text-white shadow-lg transition-colors hover:bg-[#4FA3D9]"
            >
                <span>{t('intelligencePanel.viewMarketProcure')}</span>
                <ArrowRight size={16} />
            </button>
        </>
    ) : (
        <>
            <ComplianceEstimatorCard
                selectedPort={selectedPort}
                portOptions={portOptions}
                onSelectPort={onMapPortSelect}
                onOpenMarketplace={onPortSelect}
            />
            {forwardReferences}
        </>
    );

    return (
        <div className={`
            absolute right-0 top-0 h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-l border-slate-200 dark:border-slate-700 shadow-xl z-10 flex flex-col transition-transform duration-300
            ${isOpen ? 'translate-x-0' : 'translate-x-full'}
            w-full md:w-80
        `}>
            <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                <div>
                    <div className="mb-1 flex items-center space-x-2 text-[#5DADE2]">
                        <TrendingUp size={18} />
                        <span className="text-xs font-bold tracking-widest uppercase">
                            {selectedPort ? t('intelligencePanel.portIntelligence') : t('intelligencePanel.globalInsights')}
                        </span>
                    </div>
                    <h2 className="font-['Montserrat'] font-bold text-lg text-[#334155] dark:text-slate-100">
                        {selectedPort ? selectedPort.name : t('intelligencePanel.globalOverview')}
                    </h2>
                </div>
                <button 
                    onClick={onClose}
                    aria-label={t('intelligencePanel.close')}
                    className="text-slate-400 hover:text-slate-600"
                >
                    <PanelRightClose size={20} />
                </button>
            </div>

            <div className="flex border-b border-slate-100 px-4 py-2 dark:border-slate-800" role="tablist" aria-label={t('intelligencePanel.tabs.label')}>
                {tabOptions.map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 ${
                            activeTab === tab.key
                                ? 'bg-slate-900 text-white dark:bg-emerald-400 dark:text-slate-950'
                                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
                {activeTab === 'NEWS' ? (
                    <div className="h-full p-4">
                        <NewsFeed active={active} embedded />
                    </div>
                ) : (
                    <div className="h-full space-y-5 overflow-y-auto p-5">
                        {curveProduct === 'UCOME_B100' && (
                            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                                {t('buyerMap.specificationScope')}
                            </p>
                        )}
                        {primaryContent}
                    </div>
                )}
                </div>
        </div>
    );
};
