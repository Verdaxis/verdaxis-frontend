import { formatQuantity } from '../../../utils/numberFormat';
import React from 'react';
import { MapPin, Shield, AlertCircle, Star, Ship } from 'lucide-react';
import { OrderBookOrder, ViewMode, ListingComplianceOverlay, ComplianceOverlayAssumptions } from '../../../types';
import { Pagination } from '../../../components/ui/Pagination';
import { getFuelRowClasses, getFuelBadgeClasses, getFuelStickyBg, getStatusConfig, formatExpiry, formatDeliveryWindow } from '../../../utils/fuel';
import { getOrderDisplayName } from '../../../utils/marketProduct';
import { BenchmarkPriceBlock } from '../../../components/trading/BenchmarkPriceBlock';
import { CompliancePriceHint } from '../../../components/trading/CompliancePriceHint';
import { LngOrderTermsDetails } from '../../../components/lng/LngOrderTermsDetails';


import type { TFunction } from 'i18next';
import type { MarketplaceColumnId, MarketplaceRolePresentation } from './Marketplace';
const PAGE_SIZE = 8;
type ColumnId = MarketplaceColumnId;

interface ListingsTableProps {
    isHistorySelected: boolean;
    marketTab: 'market' | 'orderbook' | 'my_orders';
    error: string | null;
    hasLoadedListings: boolean;
    configBase: MarketplaceRolePresentation;
    loading: boolean;
    filteredListings: OrderBookOrder[];
    highlightedOrderId: string | null;
    t: TFunction;
    role: ViewMode;
    locale: string;
    complianceOverlays: Record<string, ListingComplianceOverlay | null>;
    overlayAssumptions: ComplianceOverlayAssumptions | null;
    b100TradingEnabled: boolean;
    bioLngTradingEnabled: boolean;
    pinnedOrderIds: Set<string>;
    isMarketSupportActive: boolean;
    openTradeModal: (order: OrderBookOrder) => void;
    catalogError: boolean;
    togglePin: (id: string) => Promise<unknown>;
    totalCount: number;
    currentSkip: number;
    handlePageChange: (skip: number) => void;
}

export function ListingsTable({ isHistorySelected, marketTab, error, hasLoadedListings, configBase, loading, filteredListings, highlightedOrderId, t, role, locale, complianceOverlays, overlayAssumptions, b100TradingEnabled, bioLngTradingEnabled, pinnedOrderIds, isMarketSupportActive, openTradeModal, catalogError, togglePin, totalCount, currentSkip, handlePageChange }: ListingsTableProps) {
    // ─── Column header labels (inside component to access t()) ────
    const COLUMN_HEADERS: Record<ColumnId, string> = {
        fuel: t('marketplace.col.fuel'),
        grade: t('marketplace.col.grade'),
        volume: t('marketplace.col.volume'),
        price: t('marketplace.col.price'),
        window: t('marketplace.col.window'),
        expiry: t('marketplace.col.expiry'),
        cert: t('marketplace.col.cert'),
        status: t('marketplace.col.status'),
        action: t('marketplace.col.action'),
    };

    // ─── Column renderer ──────────────────────────────────────────
    const renderCell = (col: ColumnId, order: OrderBookOrder): React.ReactNode => {
        switch (col) {
            case 'fuel': {
                const badgeClasses = getFuelBadgeClasses(order.fuel_type);
                const stickyBg = getFuelStickyBg(order.fuel_type);
                return (
                    <td key={col} className={`px-4 py-2 sticky left-0 z-20 ${stickyBg} whitespace-nowrap min-w-[180px]`}>
                        <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${badgeClasses}`}>
                                {getOrderDisplayName(order, t('marketplace.unknownProduct'))}
                            </span>
                            {order.is_verdaxis_verified && (
                                <Shield size={12} className="text-emerald-500 flex-shrink-0" />
                            )}
                            {order.off_spec && (
                                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                                    {t('marketplace.grade.offSpec')}
                                </span>
                            )}
                            {order.is_demo_listing && (
                                <span
                                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                                    title={t('marketplace.demo.tooltip')}
                                >
                                    <AlertCircle size={11} />
                                    {t('marketplace.demo.label')}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                            <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                                {order.delivery_point_name || order.region}
                            </span>
                        </div>
                        <div className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300 xl:hidden">
                            <p>{formatDeliveryWindow(order, locale)}</p>
                            {configBase.columns.includes('expiry') && (
                                <div>{t('marketplace.col.expiry')}: {formatExpiry(order, locale)}</div>
                            )}
                            {configBase.columns.includes('grade') && (
                                <details className="max-w-[220px] whitespace-normal">
                                    <summary className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
                                        {t('marketplace.col.grade')}
                                    </summary>
                                    <p className="mt-1">{order.certification_declared ? t('marketplace.cert.declared') : t('marketplace.cert.missing')}</p>
                                    {order.certifications.length > 0 && <p>{order.certifications.join(', ')}</p>}
                                </details>
                            )}
                        </div>
                    </td>
                );
            }
            case 'grade':
                return (
                    <td key={col} className="hidden whitespace-nowrap px-4 py-2 xl:table-cell">
                        <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                            {order.certification_declared ? t('marketplace.cert.declared') : t('marketplace.cert.missing')}
                        </span>
                    </td>
                );
            case 'volume':
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap font-mono text-slate-700 dark:text-slate-200 text-xs">
                        {formatQuantity(order.remaining_quantity_mt)}
                    </td>
                );
            case 'price': {
                const overlay = order.side === 'ASK' ? complianceOverlays[order.id] : null;
                return (
                    <td key={col} className="w-[160px] max-w-[160px] whitespace-nowrap px-4 py-2 font-mono text-xs xl:w-auto xl:max-w-none">
                        <BenchmarkPriceBlock
                            priceUsd={order.price_per_mt_usd}
                            benchmarkUsd={order.benchmark_price_per_mt_usd}
                            deltaUsd={order.premium_discount_per_mt_usd}
                            benchmarkSource={order.benchmark_source}
                            contextUpdatedAt={order.updated_at}
                        />
                        {overlay && (
                            <CompliancePriceHint overlay={overlay} assumptions={overlayAssumptions} />
                        )}
                    </td>
                );
            }
            case 'window':
                return (
                    <td key={col} className="hidden whitespace-nowrap px-4 py-2 text-xs text-slate-600 dark:text-slate-300 xl:table-cell">
                        {formatDeliveryWindow(order, locale)}
                    </td>
                );
            case 'expiry':
                return (
                    <td key={col} className="hidden whitespace-nowrap px-4 py-2 xl:table-cell">
                        {formatExpiry(order, locale)}
                    </td>
                );
            case 'cert':
                return (
                    <td key={col} className="hidden whitespace-nowrap px-4 py-2 xl:table-cell">
                        <div className="flex flex-wrap gap-1">
                            {order.certifications.map(cert => (
                                <span
                                    key={cert}
                                    className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded"
                                >
                                    {cert}
                                </span>
                            ))}
                        </div>
                    </td>
                );
            case 'status': {
                const statusCfg = getStatusConfig(order.status, t);
                return (
                    <td key={col} className="px-4 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${statusCfg.bg} ${statusCfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                            {statusCfg.label}
                        </span>
                    </td>
                );
            }
            case 'action': {
                const catalogAllowsExecution = order.market_product === 'UCOME_B100' ? b100TradingEnabled
                    : order.market_product === 'BIO_LNG' ? bioLngTradingEnabled
                        : true;
                const isExecutable = catalogAllowsExecution && (order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED');
                const pinnable = Boolean(order.market_product && order.delivery_point_id && order.availability_window);
                const isPinned = pinnedOrderIds.has(order.id);
                return (
                    <td key={col} className="sticky right-0 z-20 min-w-[108px] whitespace-nowrap bg-white/95 px-3 py-2 shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.55)] backdrop-blur-sm dark:bg-slate-900/95">
                        <div className="flex flex-col items-end gap-2">
                            {order.is_demo_listing || (isExecutable && !isMarketSupportActive) ? (
                                <button
                                    type="button"
                                    data-tour="marketplace-listing-action"
                                    onClick={(e) => { e.stopPropagation(); openTradeModal(order); }}
                                    className="px-3 py-1.5 text-xs font-bold bg-[#334155] hover:bg-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 text-white rounded-md shadow-sm hover:shadow transition-shadow whitespace-nowrap"
                                >
                                    {t(order.is_demo_listing ? 'marketplace.demo.view' : configBase.counterAction.labelKey)}
                                </button>
                            ) : (
                                <span className="text-xs text-slate-400 font-medium">
                                    {!catalogAllowsExecution ? t(catalogError ? 'marketplace.b100.catalogError' : 'marketplace.b100.catalogUnavailable') : order.status === 'FILLED'
                                        ? t('marketplace.status.filled')
                                        : order.status === 'PARTIALLY_FILLED'
                                            ? t('marketplace.status.partial')
                                            : t('marketplace.status.closed')}
                                </span>
                            )}
                            {pinnable && !isMarketSupportActive && (
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        await togglePin(order.id);
                                    }}
                                    aria-pressed={isPinned}
                                    aria-label={isPinned ? t('marketplace.btn.pinned') : t('marketplace.btn.pinToWatchlist')}
                                    title={isPinned ? t('marketplace.btn.pinned') : t('marketplace.btn.pinToWatchlist')}
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${isPinned ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' : 'border-slate-200 text-slate-500 hover:border-amber-200 hover:text-amber-700 dark:border-slate-700 dark:text-slate-300'}`}
                                >
                                    <Star size={12} fill={isPinned ? 'currentColor' : 'none'} />
                                    {isPinned ? t('marketplace.btn.pinned') : t('marketplace.btn.watchListing')}
                                </button>
                            )}
                        </div>
                    </td>
                );
            }
            default:
                return <td key={col} />;
        }
    };

    // ─── Skeleton rows ────────────────────────────────────────────
    const SkeletonRows = () => (
        <>
            {[...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-slate-200/50 dark:border-slate-700/50">
                    {configBase.columns.map((col, ci) => (
                        <td key={ci} className={`px-4 py-3 ${col === 'grade' || col === 'window' || col === 'expiry' || col === 'cert' ? 'hidden xl:table-cell' : ''}`}>
                            <div className="animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-4 w-full" />
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );

    return <>
            {/* Market tab: listings table */}
            {!isHistorySelected && marketTab === 'market' && (!error || hasLoadedListings) && (
                <div className="flex-1 min-h-0 px-4 lg:px-10 pb-4">
                    <div className="h-full min-h-0 max-w-7xl mx-auto">
                        <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden" data-tour="marketplace-listings-table">
                            <div className="min-h-0 flex-1 overflow-auto">
                            <table className="w-full min-w-[680px] border-collapse text-sm xl:min-w-[900px]">
                                <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-800">
                                    <tr>
                                        {configBase.columns.map((col) => (
                                            <th
                                                key={col}
                                                className={`${col === 'action' ? 'text-right' : 'text-left'} px-3 py-2 text-xs uppercase tracking-wider text-slate-500 font-semibold whitespace-nowrap ${
                                                    col === 'fuel' ? 'sticky left-0 z-40 bg-slate-100 dark:bg-slate-800 min-w-[180px]' :
                                                    col === 'grade' || col === 'window' || col === 'expiry' || col === 'cert' ? 'hidden xl:table-cell' :
                                                    col === 'action' ? 'sticky right-0 z-40 min-w-[108px] bg-slate-100 text-right shadow-[-12px_0_18px_-18px_rgba(15,23,42,0.55)] dark:bg-slate-800' : ''
                                                }`}
                                            >
                                                {COLUMN_HEADERS[col]}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <SkeletonRows />
                                    ) : filteredListings.length > 0 ? (
                                        filteredListings.map(order => (
                                            <React.Fragment key={order.id}>
                                                <tr
                                                    data-order-id={order.id}
                                                    data-tour="marketplace-listing-row"
                                                    className={`h-9 border-b border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors duration-150 ${getFuelRowClasses(order.fuel_type)} ${highlightedOrderId === order.id ? 'ring-2 ring-emerald-400/70 bg-emerald-50/70 dark:bg-emerald-950/20' : ''}`}
                                                >
                                                    {configBase.columns.map(col => renderCell(col, order))}
                                                </tr>
                                                {order.market_product === 'BIO_LNG' && order.lng_terms && (
                                                    <tr className="border-b border-sky-100 bg-sky-50/40 dark:border-sky-950/40 dark:bg-sky-950/10">
                                                        <td colSpan={configBase.columns.length} className="px-4 py-2 align-top">
                                                            <details>
                                                                <summary className="cursor-pointer text-xs font-medium text-slate-500 dark:text-slate-400">{t('marketplace.bioLng.orderTerms')}</summary>
                                                                <div className="mt-3 max-w-3xl"><LngOrderTermsDetails terms={order.lng_terms} /></div>
                                                            </details>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={configBase.columns.length} className="py-16 text-center">
                                                <Ship className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                                                <h3 className="text-lg font-bold text-slate-500">{t('marketplace.empty.title')}</h3>
                                                <p className="text-slate-400 mt-1 text-sm max-w-md mx-auto">
                                                    {role === 'BUYER'
                                                        ? t('marketplace.empty.buyer')
                                                        : t('marketplace.empty.supplier')}
                                                </p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            </div>
                            {/* Pagination */}
                            {!loading && totalCount > 0 && (
                                <div className="flex-none border-t border-slate-200 dark:border-slate-700 px-4 bg-white dark:bg-slate-900">
                                    <Pagination
                                        total={totalCount}
                                        skip={currentSkip}
                                        limit={PAGE_SIZE}
                                        onPageChange={handlePageChange}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


    </>;
}
