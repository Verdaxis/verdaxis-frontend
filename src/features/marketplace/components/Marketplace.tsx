import { ListingsTable } from './ListingsTable';
import { MarketplaceHeader } from './MarketplaceHeader';
import { MarketplaceTabs } from './MarketplaceTabs';
import { MarketplaceFilters } from './MarketplaceFilters';
import { TakeTradeDialog } from './TakeTradeDialog';
import { MarketDepthPanel } from './MarketDepthPanel';
import { MyListingsPanel } from './MyListingsPanel';
import { CancelOrderDialog } from './CancelOrderDialog';
import { MarketplaceHistory } from './MarketplaceHistory';
import { useMarketplaceQueries, useMarketplaceReferences } from '../hooks/useMarketplaceQueries';
import { useMarketplaceSelection } from '../hooks/useMarketplaceSelection';
import { useTakeTrade } from '../hooks/useTakeTrade';
import { useCancelOrder } from '../hooks/useCancelOrder';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Port, OrderBookOrder, MarketProduct, ViewMode, DeliveryPoint, ListingComplianceOverlay, ComplianceOverlayAssumptions, Product } from '../../../types';
import { getAuthGeneration } from '../../../services/authToken';
import { OrderPlaceModal } from '../../../components/OrderPlaceModal';
import { useNamespace } from '../../../hooks/useNamespace';
import { useDashboardContentReady } from '../../../hooks/useDashboardContentReady';
import { formatMarketProduct, isOrderbookProduct } from '../../../utils/marketProduct';
import { type MarketSlice } from '../../../utils/sliceUrl';
import { useWatchlist } from '../../../hooks/useWatchlist';
import { getWatchlistSliceKeyFromParts } from '../../../utils/watchlist';
import i18n from '../../../i18n';
import { useMarketSupport } from '../../../context/MarketSupportContext';

// ─── Role Config ──────────────────────────────────────────────────
export type MarketplaceColumnId = 'fuel' | 'grade' | 'volume' | 'price' | 'window' | 'expiry' | 'cert' | 'status' | 'action';

type ColumnId = MarketplaceColumnId;

export interface MarketplaceRolePresentation {
    subtitleKey: string;
    primaryAction: { labelKey: string; side: 'BID' | 'ASK' };
    counterAction: { labelKey: string };
    columns: ColumnId[];
}

interface RoleConfigEntry extends MarketplaceRolePresentation {
    defaultSort: 'price_asc' | 'price_desc' | 'quantity_desc' | 'newest';
}

const ROLE_CONFIG_BASE: Record<string, RoleConfigEntry> = {
    BUYER: {
        subtitleKey: 'marketplace.subtitle.buyer',
        primaryAction: { labelKey: 'marketplace.btn.placeBid', side: 'BID' as const },
        counterAction: { labelKey: 'marketplace.btn.hitAsk' },
        defaultSort: 'price_asc',
        columns: ['fuel', 'grade', 'volume', 'price', 'window', 'expiry', 'cert', 'action'],
    },
    SUPPLIER: {
        subtitleKey: 'marketplace.subtitle.supplier',
        primaryAction: { labelKey: 'marketplace.btn.placeAsk', side: 'ASK' as const },
        counterAction: { labelKey: 'marketplace.btn.hitBid' },
        defaultSort: 'price_desc',
        columns: ['fuel', 'volume', 'price', 'window', 'status', 'action'],
    },
};

// ─── Product chip options ─────────────────────────────────────────
const ALL_MARKET_PRODUCTS = 'All';

// ─── Props ────────────────────────────────────────────────────────
interface MarketplaceProps {
    initialPort?: Port | null;
    viewMode?: ViewMode;
    initialSlice?: MarketSlice | null;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ initialPort, viewMode, initialSlice }) => {
    const { user } = useAuth();
    const { t, ready } = useNamespace('trading');
    const { t: tRfq } = useNamespace('rfq');
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
    const { trackedSliceKeys, pinnedOrderIds, toggleSlice, togglePin } = useWatchlist();

    const { deliveryPoints, deliveryPointsStatus, catalogProducts, catalogError, loadCatalogProducts } = useMarketplaceReferences(ready);
    const b100Product = catalogProducts.find(product => product.market_product === 'UCOME_B100');
    const b100TradingEnabled = Boolean(b100Product && isOrderbookProduct(b100Product));
    const bioLngProduct = catalogProducts.find(product => product.market_product === 'BIO_LNG');
    const bioLngTradingEnabled = Boolean(bioLngProduct && isOrderbookProduct(bioLngProduct));
    const {
        role, marketTab, isHistorySelected, fameTab, setMarketTab,
        portInput, resolvedPort, resolvedDeliveryPointId, marketProduct, availability,
        availabilityOptions, filtersExpanded, setFiltersExpanded, currentSkip, setCurrentSkip,
        sortBy, setAvailability, portOptions, sliceSummary, clearMarketFilters,
        handlePortChange, handleProductChipClick, handleSortChange,
    } = useMarketplaceSelection({
        initialPort, initialSlice, viewMode, userRole: user?.role, ready, locale, t,
        deliveryPoints, deliveryPointsStatus, catalogProducts,
    });
    const configBase = ROLE_CONFIG_BASE[role] ?? ROLE_CONFIG_BASE.BUYER;
    const { context: marketSupportContext, isActive: isMarketSupportActive } = useMarketSupport();
    const isCatalogScopeResolving = Boolean(resolvedPort) && deliveryPointsStatus === 'loading';
    const queryScope = useMemo(() => [getAuthGeneration(), user?.id ?? '', user?.organization_id ?? null,
        marketSupportContext?.id ?? null] as const,
    [user?.id, user?.organization_id, marketSupportContext?.id]);
    const {
        listings, totalCount, acceptedSkip, loading, refreshing, error, hasLoadedListings,
        complianceOverlays, overlayAssumptions, marketProductCounts,
        myOrders, myOrdersLoading, myOrdersReadError,
        fetchListings, fetchProductCounts, fetchMyOrders,
    } = useMarketplaceQueries({
        ready, isHistorySelected, marketTab, isCatalogScopeResolving, hasUser: Boolean(user),
        scope: queryScope,
        selection: { side: role === 'BUYER' ? 'ASK' : 'BID', region: resolvedPort,
            deliveryPointId: resolvedDeliveryPointId, product: marketProduct === ALL_MARKET_PRODUCTS ? null : marketProduct,
            window: availability, sort: sortBy, skip: currentSkip },
    });
    const takeTrade = useTakeTrade({
        userId: user?.id, organizationId: user?.organization_id, isMarketSupportActive, isHistorySelected, marketTab,
        b100TradingEnabled, bioLngTradingEnabled, t, tRfq, fetchProductCounts, fetchListings, currentSkip,
        prefillAskOrder: order => { setOrderModalPrefill(order); setOrderModalSide('ASK'); },
    });
    const cancellation = useCancelOrder({
        userId: user?.id, organizationId: user?.organization_id,
        marketSupportContextId: marketSupportContext?.id ?? null, scope: queryScope,
        isMarketSupportActive, isHistorySelected, readError: myOrdersReadError, t, fetchMyOrders,
    });
    const {
        selectedOrder, tradeState, tradeResult, tradeError, tradeKycBlocked, tradeNeedsRefresh,
        tradeQuantity, setTradeQuantity, tradeTermsForm, tradeLngTermsForm, tradeFameInput, tradeLngInput,
        initialBuyerTerms, initialLngTaker, openTradeModal, reviewTrade, confirmTrade, closeTradeModal,
        refreshReview, setTradeState,
    } = takeTrade;
    const {
        pendingCancellation, cancellationReason, setCancellationReason, cancellationLoading,
        cancellationOutcomeUnknown, myOrdersError, handleCancelOrder, confirmCancelOrder, closeCancellationModal,
    } = cancellation;
    useDashboardContentReady('MARKETPLACE', !isHistorySelected && ready && (marketTab !== 'market' || (!loading && hasLoadedListings)));

    const currentSliceTarget = useMemo(() => {
        if (marketProduct === ALL_MARKET_PRODUCTS || !resolvedPort || !availability) return null;

        const matchingOrder = listings.find((order) => (
            order.market_product === marketProduct
            && order.availability_window === availability
            && order.delivery_point_id
            && (resolvedDeliveryPointId
                ? order.delivery_point_id === resolvedDeliveryPointId
                : (order.delivery_point_name === resolvedPort || order.region === resolvedPort))
        ));

        if (!matchingOrder?.delivery_point_id) return null;

        return {
            marketProductCode: marketProduct,
            deliveryPointId: matchingOrder.delivery_point_id,
            availabilityWindowCode: matchingOrder.availability_window,
        };
    }, [availability, listings, marketProduct, resolvedDeliveryPointId, resolvedPort]);

    const currentSliceKey = currentSliceTarget
        ? getWatchlistSliceKeyFromParts(
            currentSliceTarget.marketProductCode,
            currentSliceTarget.deliveryPointId,
            currentSliceTarget.availabilityWindowCode,
        )
        : '';
    const isCurrentSliceTracked = Boolean(currentSliceTarget) && trackedSliceKeys.has(currentSliceKey);
    const marketScopeReadyCopyKey = resolvedDeliveryPointId
        ? 'marketScope.ready'
        : 'marketScope.readyRegionTape';

    // ─── Server-side sorting ──────────────────────────────────────
    const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

    // ─── Order placement modal ────────────────────────────────────
    const [orderModalPrefill, setOrderModalPrefill] = useState<OrderBookOrder | null>(null);
    const [orderModalSide, setOrderModalSide] = useState<'BID' | 'ASK' | null>(null);

    useEffect(() => {
        setOrderModalSide(null);
    }, [user?.id, user?.organization_id, isMarketSupportActive]);


    useEffect(() => {
        if (!isHistorySelected) return;
        setOrderModalSide(null);
    }, [isHistorySelected]);

    const filteredListings = listings;

    const totalMarketProductCount = useMemo(
        () => Object.values(marketProductCounts).reduce((sum, count) => sum + count, 0),
        [marketProductCounts],
    );
    const currentSliceCount = marketTab === 'market'
        ? totalCount
        : marketProduct === ALL_MARKET_PRODUCTS
            ? totalMarketProductCount
            : marketProductCounts[marketProduct] || 0;
    const hasActiveSliceFilters = marketProduct !== ALL_MARKET_PRODUCTS || Boolean(resolvedPort) || Boolean(availability);

    const handlePageChange = (newSkip: number) => {
        setCurrentSkip(newSkip);
    };

    const hasExactProduct = marketProduct !== ALL_MARKET_PRODUCTS;
    const hasExactPort = Boolean(resolvedDeliveryPointId);
    const hasExactAvailability = Boolean(availability);
    const orderbookRequiresExactSlice = !hasExactProduct || !hasExactPort || !hasExactAvailability;
    const selectedAvailabilityLabel = availabilityOptions.find(option => option.value === availability)?.label || availability;
    const orderbookSliceRequirements = [
        {
            key: 'product',
            label: t('orderBook.requirement.product'),
            value: hasExactProduct ? formatMarketProduct(marketProduct) : t('orderBook.requirement.anyProduct'),
            complete: hasExactProduct,
        },
        {
            key: 'port',
            label: t('orderBook.requirement.port'),
            value: hasExactPort ? resolvedPort : t('orderBook.requirement.anyPort'),
            complete: hasExactPort,
        },
        {
            key: 'window',
            label: t('orderBook.requirement.window'),
            value: hasExactAvailability ? selectedAvailabilityLabel : t('orderBook.requirement.anyWindow'),
            complete: hasExactAvailability,
        },
    ];

    // Market product changes are handled by the listing callback dependencies.

    const handleOrderbookLevelClick = useCallback((order: OrderBookOrder) => {
        setHighlightedOrderId(order.id);
        setMarketTab('market');
    }, [setMarketTab]);

    useEffect(() => {
        if (marketTab !== 'market' || !highlightedOrderId) return;
        const node = document.querySelector(`[data-order-id="${highlightedOrderId}"]`);
        if (!(node instanceof HTMLElement)) return;
        requestAnimationFrame(() => {
            node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }, [filteredListings, highlightedOrderId, marketTab]);

    const outstandingMyOrders = useMemo(() => myOrders.filter((order) => (
        order.status === 'OPEN' || order.status === 'PARTIALLY_FILLED'
    )), [myOrders]);

    const filteredMyOrders = useMemo(() => outstandingMyOrders.filter((order) => {
        if (marketProduct !== ALL_MARKET_PRODUCTS && order.market_product !== marketProduct) {
            return false;
        }

        if (availability && order.availability_window !== availability) {
            return false;
        }

        if (resolvedPort) {
            const matchesPort = resolvedDeliveryPointId
                ? order.delivery_point_id === resolvedDeliveryPointId
                : (order.delivery_point_name || order.region || '') === resolvedPort;
            if (!matchesPort) {
                return false;
            }
        }

        return true;
    }), [availability, marketProduct, outstandingMyOrders, resolvedDeliveryPointId, resolvedPort]);

    if (!ready) return null;

    // ─── Render ───────────────────────────────────────────────────
    return (
        <div
            className={isHistorySelected ? 'min-h-full flex flex-col' : 'h-full min-h-0 flex flex-col overflow-hidden'}
            data-tour-market-product={isHistorySelected ? 'UCOME_B100' : marketProduct === ALL_MARKET_PRODUCTS ? '' : marketProduct}
            data-tour-port={isHistorySelected ? 'Singapore' : resolvedPort}
            data-tour-window={isHistorySelected ? '' : availability}
            data-tour-tab={marketTab}
        >
            <MarketplaceHeader
                isHistorySelected={isHistorySelected}
                t={t}
                configBase={configBase}
                setOrderModalSide={setOrderModalSide}
                marketProduct={marketProduct}
                setMarketTab={setMarketTab}
                marketTab={marketTab}
                loadCatalogProducts={loadCatalogProducts}
                fetchProductCounts={fetchProductCounts}
                fetchListings={fetchListings}
                currentSkip={currentSkip}
                refreshing={refreshing}
                isMarketSupportActive={isMarketSupportActive}
                currentSliceTarget={currentSliceTarget}
                toggleSlice={toggleSlice}
                isCurrentSliceTracked={isCurrentSliceTracked}
            >
            <MarketplaceFilters
                t={t}
                isHistorySelected={isHistorySelected}
                marketProduct={marketProduct}
                marketProductCounts={marketProductCounts}
                handleProductChipClick={handleProductChipClick}
                filtersExpanded={filtersExpanded}
                setFiltersExpanded={setFiltersExpanded}
                portInput={portInput}
                handlePortChange={handlePortChange}
                portOptions={portOptions}
                availability={availability}
                setAvailability={setAvailability}
                availabilityOptions={availabilityOptions}
                sortBy={sortBy}
                handleSortChange={handleSortChange}
                currentSliceCount={currentSliceCount}
                sliceSummary={sliceSummary}
            />

            <MarketplaceTabs
                isHistorySelected={isHistorySelected}
                isMarketSupportActive={isMarketSupportActive}
                t={t}
                setMarketTab={setMarketTab}
                user={user}
                fameTab={fameTab}
                marketTab={marketTab}
                role={role}
            />

            </MarketplaceHeader>

            <MarketplaceHistory
                isHistorySelected={isHistorySelected}
                isMarketSupportActive={isMarketSupportActive}
                fameTab={fameTab}
                user={user}
                t={t}
            />

            {/* Error state */}
            {!isHistorySelected && marketTab === 'market' && error && !loading && !hasLoadedListings && (
                <div className="flex-1 min-h-0 overflow-auto px-4 lg:px-10 pb-4">
                    <div className="max-w-7xl mx-auto">
                        <div role="alert" className="v-card p-8 flex flex-col items-center text-center">
                            <div className="p-4 bg-red-500/10 rounded-full mb-4">
                                <AlertCircle size={32} className="text-red-500" />
                            </div>
                            <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">{t('marketplace.error.title')}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 max-w-md">
                                {locale.startsWith('zh') ? t('marketplace.error.message') : error || t('marketplace.error.message')}
                            </p>
                            <button
                                onClick={() => { void fetchListings(false, 0); }}
                                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                {t('marketplace.btn.tryAgain')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!isHistorySelected && marketTab === 'market' && error && hasLoadedListings && (
                <div role="alert" className="mx-4 mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300 lg:mx-10">
                    {locale.startsWith('zh') ? t('marketplace.error.message') : error || t('marketplace.error.message')}
                </div>
            )}

            <MarketDepthPanel
                isHistorySelected={isHistorySelected}
                marketTab={marketTab}
                t={t}
                orderbookRequiresExactSlice={orderbookRequiresExactSlice}
                marketScopeReadyCopyKey={marketScopeReadyCopyKey}
                orderbookSliceRequirements={orderbookSliceRequirements}
                isCatalogScopeResolving={isCatalogScopeResolving}
                marketProduct={marketProduct}
                resolvedDeliveryPointId={resolvedDeliveryPointId}
                availability={availability}
                resolvedPort={resolvedPort}
                role={role}
                b100Product={b100Product}
                bioLngProduct={bioLngProduct}
                handleOrderbookLevelClick={handleOrderbookLevelClick}
            />

            <MyListingsPanel
                isHistorySelected={isHistorySelected}
                marketTab={marketTab}
                myOrdersError={myOrdersError}
                myOrdersLoading={myOrdersLoading}
                outstandingMyOrders={outstandingMyOrders}
                filteredMyOrders={filteredMyOrders}
                role={role}
                setOrderModalSide={setOrderModalSide}
                sliceSummary={sliceSummary}
                hasActiveSliceFilters={hasActiveSliceFilters}
                clearMarketFilters={clearMarketFilters}
                locale={locale}
                t={t}
                isMarketSupportActive={isMarketSupportActive}
                handleCancelOrder={handleCancelOrder}
                fetchMyOrders={fetchMyOrders}
            />

            <ListingsTable
                isHistorySelected={isHistorySelected}
                marketTab={marketTab}
                error={error}
                hasLoadedListings={hasLoadedListings}
                configBase={configBase}
                loading={loading}
                filteredListings={filteredListings}
                highlightedOrderId={highlightedOrderId}
                t={t}
                role={role}
                locale={locale}
                complianceOverlays={complianceOverlays}
                overlayAssumptions={overlayAssumptions}
                b100TradingEnabled={b100TradingEnabled}
                bioLngTradingEnabled={bioLngTradingEnabled}
                pinnedOrderIds={pinnedOrderIds}
                isMarketSupportActive={isMarketSupportActive}
                openTradeModal={openTradeModal}
                catalogError={catalogError}
                togglePin={togglePin}
                totalCount={totalCount}
                currentSkip={acceptedSkip}
                handlePageChange={handlePageChange}
            />

            <TakeTradeDialog
                isHistorySelected={isHistorySelected}
                selectedOrder={selectedOrder}
                tradeState={tradeState}
                tradeResult={tradeResult}
                t={t}
                locale={locale}
                role={role}
                tradeError={tradeError}
                confirmTrade={confirmTrade}
                closeTradeModal={closeTradeModal}
                tradeKycBlocked={tradeKycBlocked}
                tradeNeedsRefresh={tradeNeedsRefresh}
                refreshReview={refreshReview}
                configBase={configBase}
                tradeQuantity={tradeQuantity}
                setTradeQuantity={setTradeQuantity}
                tradeTermsForm={tradeTermsForm}
                tradeLngTermsForm={tradeLngTermsForm}
                reviewTrade={reviewTrade}
                initialBuyerTerms={initialBuyerTerms}
                initialLngTaker={initialLngTaker}
                tradeFameInput={tradeFameInput}
                tradeLngInput={tradeLngInput}
                setTradeState={setTradeState}
            />

            {/* ─── Order Placement Modal ────────────────────────────── */}
            <CancelOrderDialog
                isHistorySelected={isHistorySelected}
                pendingCancellation={pendingCancellation}
                closeCancellationModal={closeCancellationModal}
                confirmCancelOrder={confirmCancelOrder}
                t={t}
                cancellationOutcomeUnknown={cancellationOutcomeUnknown}
                cancellationLoading={cancellationLoading}
                cancellationReason={cancellationReason}
                setCancellationReason={setCancellationReason}
            />

            <OrderPlaceModal
                isOpen={orderModalSide !== null && !isHistorySelected}
                onClose={() => {
                    setOrderModalSide(null);
                    setOrderModalPrefill(null);
                    // A placed order already invalidated the orderbook reads;
                    // the Query bridge refreshes them once. Closing the window
                    // without an order changed nothing, so do not read either.
                    // My Listings keeps its explicit close refresh.
                    if (marketTab === 'my_orders') void fetchMyOrders(true);
                }}
                side={orderModalSide || configBase.primaryAction.side}
                prefillFuelType={marketProduct !== ALL_MARKET_PRODUCTS ? formatMarketProduct(marketProduct) : undefined}
                prefillRegion={orderModalPrefill?.region || portInput || undefined}
                prefillMarketProduct={orderModalPrefill?.market_product || (marketProduct !== ALL_MARKET_PRODUCTS ? marketProduct : undefined)}
                prefillDeliveryPointId={orderModalPrefill?.delivery_point_id || currentSliceTarget?.deliveryPointId}
                prefillAvailabilityWindow={orderModalPrefill?.availability_window || availability || undefined}
                prefillQuantity={orderModalPrefill?.remaining_quantity_mt}
                prefillPrice={orderModalPrefill?.price_per_mt_usd}
            />
        </div>
    );
};
