import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { AvailabilityWindow, DeliveryPoint, MarketProduct, Port, Product, ViewMode } from '../../../types';
import { PORTS } from '../../../data';
import { MARKETPLACE_SELECTION_STORAGE_KEYS } from '../../../utils/marketplaceSelection';
import { isOrderbookMarketProduct, formatMarketProduct } from '../../../utils/marketProduct';
import { getAvailabilityWindowOptions, normalizeAvailabilityWindow, formatAvailabilityWindow } from '../../../utils/availabilityWindow';
import { isApprovedTradingPortName } from '../../../utils/tradingPorts';
import { getMarketProductMapPorts } from '../../../utils/buyerMapMarket';
import { isSlicePortAllowed, sliceToPath, type MarketSlice } from '../../../utils/sliceUrl';
import { analytics } from '../../../services/analytics';

const ALL_MARKET_PRODUCTS = 'All';
function readStoredMarketProduct(): typeof ALL_MARKET_PRODUCTS | MarketProduct {
    const stored = localStorage.getItem(MARKETPLACE_SELECTION_STORAGE_KEYS.product)
        ?? localStorage.getItem(MARKETPLACE_SELECTION_STORAGE_KEYS.legacyFuel);
    return isOrderbookMarketProduct(stored) ? stored : ALL_MARKET_PRODUCTS;
}


interface MarketplaceSelectionOptions {
    initialPort?: Port | null;
    initialSlice?: MarketSlice | null;
    viewMode?: ViewMode;
    userRole?: string;
    ready: boolean;
    locale: string;
    t: TFunction;
    deliveryPoints: DeliveryPoint[];
    deliveryPointsStatus: 'loading' | 'ready' | 'failed';
    catalogProducts: Product[];
}

export function useMarketplaceSelection({ initialPort, initialSlice, viewMode, userRole, ready, locale, t, deliveryPoints, deliveryPointsStatus, catalogProducts }: MarketplaceSelectionOptions) {
    const location = useLocation();
    const navigate = useNavigate();
    const isExactSliceRoute = Boolean(initialSlice && location.pathname.startsWith('/app/m/'));
    const requestedProduct = isExactSliceRoute ? null : new URLSearchParams(location.search).get('product');
    useEffect(() => {
        if (!isExactSliceRoute) return;
        const search = new URLSearchParams(location.search);
        if (!search.has('product')) return;
        search.delete('product');
        navigate({ pathname: location.pathname, search: search.toString() }, { replace: true });
    }, [isExactSliceRoute, location.pathname, location.search, navigate]);
    const historyView = new URLSearchParams(location.search).get('view');
    const requestedView = historyView;
    const marketTab = requestedView === 'orderbook' || requestedView === 'my_orders' ? requestedView : 'market';
    const isHistorySelected = requestedProduct === 'UCOME_B100'
        && ['history_offers', 'history_my_offers', 'history_rfqs', 'requests'].includes(historyView ?? '');
    const role: ViewMode = userRole === 'ADMIN'
        ? (viewMode ?? 'BUYER')
        : userRole === 'SUPPLIER'
            ? 'SUPPLIER'
            : 'BUYER';
    const [portInput, setPortInput] = useState(() => (isOrderbookMarketProduct(initialSlice?.product) ? initialSlice?.port : undefined) || initialPort?.name || localStorage.getItem(MARKETPLACE_SELECTION_STORAGE_KEYS.port) || '');
    const [storedDeliveryPointId, setStoredDeliveryPointId] = useState(() => localStorage.getItem(MARKETPLACE_SELECTION_STORAGE_KEYS.deliveryPointId) || '');
    const [selectedMarketProduct, setMarketProduct] = useState<typeof ALL_MARKET_PRODUCTS | MarketProduct>(() => (
        isOrderbookMarketProduct(initialSlice?.product) ? initialSlice.product : readStoredMarketProduct()
    ));
    const marketProduct = isOrderbookMarketProduct(requestedProduct) ? requestedProduct : selectedMarketProduct;
    const [availability, setAvailability] = useState<AvailabilityWindow | ''>(() => {
        if (initialSlice && isOrderbookMarketProduct(initialSlice.product)) return initialSlice.window;
        const stored = localStorage.getItem(MARKETPLACE_SELECTION_STORAGE_KEYS.availabilityWindow);
        return stored ? (normalizeAvailabilityWindow(stored)) : '';
    });
    const availabilityOptions = useMemo(() => getAvailabilityWindowOptions({ locale }), [locale]);
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [currentSkip, setCurrentSkip] = useState(0);

    // ─── Resolved port name (best match as user types) ─────────
    const resolvedPort = useMemo(() => {
        if (!portInput.trim()) return '';
        const q = portInput.trim().toLowerCase();
        const match = PORTS.find(p => p.name.toLowerCase() === q)
            || PORTS.find(p => p.name.toLowerCase().startsWith(q))
            || PORTS.find(p => p.name.toLowerCase().includes(q));
        return match ? match.name : '';
    }, [portInput]);

    const resolvedDeliveryPointId = useMemo(() => {
        if (!resolvedPort) return '';
        const q = resolvedPort.trim().toLowerCase();
        const storedMatch = deliveryPoints.find(point => (
            point.id === storedDeliveryPointId && point.name.trim().toLowerCase() === q
        ));
        if (storedMatch) return storedMatch.id;

        return deliveryPoints.find(point => point.name.trim().toLowerCase() === q)?.id || '';
    }, [deliveryPoints, resolvedPort, storedDeliveryPointId]);

    /**
     * Port names the selected product's catalog lanes clear. `null` means no
     * restriction is known yet (all-products view, or a catalog that has not
     * answered) and nothing is enforced. An empty list means the catalog grants
     * the product no lane, so the market fails closed.
     */
    const laneAllowedPortNames = useMemo<string[] | null>(() => {
        if (marketProduct === ALL_MARKET_PRODUCTS) return null;
        if (catalogProducts.length === 0 || deliveryPointsStatus !== 'ready') return null;
        return getMarketProductMapPorts(marketProduct, catalogProducts, deliveryPoints, PORTS).map(port => port.name);
    }, [catalogProducts, deliveryPoints, deliveryPointsStatus, marketProduct]);

    const defaultSort = role === 'SUPPLIER' ? 'price_desc' : 'price_asc';
    const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'quantity_desc' | 'newest'>(() => defaultSort);
    const fameTab = requestedView === 'history_rfqs' || requestedView === 'requests' ? 'history_rfqs' : requestedView === 'history_my_offers' ? 'history_my_offers' : 'history_offers';
    const setMarketTab = useCallback((tab: 'market' | 'orderbook' | 'my_orders' | 'history_offers' | 'history_my_offers' | 'history_rfqs') => {
        const next = new URLSearchParams(location.search);
        if (tab === 'market') next.delete('view');
        else next.set('view', tab);
        next.delete('preview');
        if (tab.startsWith('history_')) {
            next.set('product', 'UCOME_B100');
            navigate({ pathname: '/app/marketplace', search: next.toString() });
            return;
        }
        navigate({ pathname: location.pathname, search: next.toString() });
    }, [location.pathname, location.search, navigate]);
    useEffect(() => {
        setSortBy(defaultSort);
        setCurrentSkip(0);
    }, [defaultSort]);

    // ─── Slice URL sync (/app/m/:product/:port/:window) ──────────
    // URL → state: re-apply whenever the slice params change. Slice→slice
    // navigation must re-sync; the useState initializers only cover mount.
    useEffect(() => {
        if (!initialSlice) return;
        setMarketProduct(initialSlice.product);
        setPortInput(initialSlice.port);
        setStoredDeliveryPointId('');
        setAvailability(initialSlice.window);
        setCurrentSkip(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialSlice?.product, initialSlice?.port, initialSlice?.window]);

    // A catalog lane can invalidate a deep link or a restored selection. Once
    // the catalog answers, move a product/port pair the lanes do not clear to
    // the product's first allowed port, or fail closed to the marketplace root.
    useEffect(() => {
        if (!ready || isHistorySelected) return;
        if (marketProduct === ALL_MARKET_PRODUCTS || laneAllowedPortNames === null) return;
        if (!resolvedPort || isSlicePortAllowed(resolvedPort, laneAllowedPortNames)) return;
        const fallbackPort = laneAllowedPortNames[0];
        setCurrentSkip(0);
        if (fallbackPort) {
            setPortInput(fallbackPort);
            setStoredDeliveryPointId('');
            return;
        }
        setMarketProduct(ALL_MARKET_PRODUCTS);
        setPortInput('');
        setStoredDeliveryPointId('');
    }, [isHistorySelected, laneAllowedPortNames, marketProduct, ready, resolvedPort]);

    // State → URL: on a slice URL, keep the address bar truthful as the
    // user changes product/port/window in-page (replace, not push). The
    // generic /app/marketplace view never rewrites the URL. Deliberately
    // keyed on filter state only: reacting to location changes would fire
    // with stale state mid slice→slice navigation and bounce the URL back.
    useEffect(() => {
        if (!location.pathname.startsWith('/app/m/')) return;
        if (isHistorySelected) return;
        const isFullSlice = marketProduct !== ALL_MARKET_PRODUCTS && Boolean(resolvedPort) && Boolean(availability) && isApprovedTradingPortName(resolvedPort);
        const nextPath = isFullSlice
            ? sliceToPath({ product: marketProduct as MarketProduct, port: resolvedPort, window: availability })
            : '/app/marketplace';
        if (nextPath !== location.pathname) {
            navigate({ pathname: nextPath, search: location.search }, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [availability, marketProduct, resolvedPort, isHistorySelected]);

    // ─── Persist filter selections to localStorage ──────────────
    useEffect(() => {
        localStorage.setItem(MARKETPLACE_SELECTION_STORAGE_KEYS.port, portInput);
    }, [portInput]);

    useEffect(() => {
        if (resolvedDeliveryPointId) {
            localStorage.setItem(
                MARKETPLACE_SELECTION_STORAGE_KEYS.deliveryPointId,
                resolvedDeliveryPointId,
            );
        } else if (!resolvedPort) {
            localStorage.removeItem(MARKETPLACE_SELECTION_STORAGE_KEYS.deliveryPointId);
        }
    }, [resolvedDeliveryPointId, resolvedPort]);

    useEffect(() => {
        localStorage.setItem(MARKETPLACE_SELECTION_STORAGE_KEYS.product, marketProduct);
        localStorage.removeItem(MARKETPLACE_SELECTION_STORAGE_KEYS.legacyFuel);
    }, [marketProduct]);

    useEffect(() => {
        if (
            !ready
            || isHistorySelected
            || (initialSlice && availability !== initialSlice.window)
        ) return;

        if (availability) {
            localStorage.setItem(
                MARKETPLACE_SELECTION_STORAGE_KEYS.availabilityWindow,
                availability,
            );
        } else {
            localStorage.removeItem(MARKETPLACE_SELECTION_STORAGE_KEYS.availabilityWindow);
        }
    }, [availability, initialSlice?.window, isHistorySelected, ready]);

    const portOptions = useMemo(() => {
        const visiblePorts = laneAllowedPortNames === null
            ? PORTS
            : PORTS.filter((port) => isSlicePortAllowed(port.name, laneAllowedPortNames));
        return [
            { value: '', label: t('marketplace.filter.allPorts') },
            ...visiblePorts.map((port) => ({
                value: port.name,
                label: port.name,
                description: port.country,
                tourId: port.name === 'Singapore' ? 'marketplace-port-option-singapore' : undefined,
            })),
        ];
    }, [laneAllowedPortNames, t]);

    const sliceSummary = useMemo(() => {
        const parts = [
            marketProduct === ALL_MARKET_PRODUCTS ? t('marketplace.filter.allProducts') : formatMarketProduct(marketProduct),
            resolvedPort || t('marketplace.filter.allPorts'),
            availability ? formatAvailabilityWindow(availability, locale) : t('marketplace.filter.anyWindow'),
        ];
        return parts.join(' · ');
    }, [availability, locale, marketProduct, resolvedPort, t]);
    const clearMarketFilters = useCallback(() => {
        setMarketProduct(ALL_MARKET_PRODUCTS);
        setPortInput('');
        setStoredDeliveryPointId('');
        setAvailability('');
        setCurrentSkip(0);
        if (requestedProduct) {
            const next = new URLSearchParams(location.search);
            next.delete('product');
            navigate({ pathname: '/app/marketplace', search: next.toString() });
        }
    }, [location.search, navigate, requestedProduct]);

    const handlePortChange = useCallback((value: string) => {
        setPortInput(value);
        setStoredDeliveryPointId('');
        setCurrentSkip(0);
    }, []);

    const handleProductChipClick = (productCode: typeof ALL_MARKET_PRODUCTS | MarketProduct) => {
        if (productCode === 'UCOME_B100') {
            const search = new URLSearchParams({ product: 'UCOME_B100' });
            if (marketTab !== 'market') search.set('view', marketTab);
            navigate({ pathname: '/app/marketplace', search: search.toString() });
            setCurrentSkip(0);
            return;
        }
        setMarketProduct(productCode);
        setCurrentSkip(0);
        if (requestedProduct) {
            const next = new URLSearchParams(location.search);
            next.delete('product');
            if (isHistorySelected) next.delete('view');
            navigate({ pathname: '/app/marketplace', search: next.toString() });
        }
    };

    const handleSortChange = useCallback((value: string) => {
        setSortBy(value as typeof sortBy);
        setCurrentSkip(0);
    }, []);

    useEffect(() => {
        if (isHistorySelected || marketProduct === ALL_MARKET_PRODUCTS || !resolvedDeliveryPointId || !availability) return;
        analytics.track('market_slice_selected', {
            product: marketProduct,
            delivery_point: resolvedDeliveryPointId,
            window: availability,
        });
    }, [availability, marketProduct, resolvedDeliveryPointId, isHistorySelected]);

    return { role, requestedProduct, marketTab, isHistorySelected, fameTab, setMarketTab, portInput, storedDeliveryPointId, resolvedPort, resolvedDeliveryPointId, laneAllowedPortNames, marketProduct, availability, availabilityOptions, filtersExpanded, setFiltersExpanded, currentSkip, setCurrentSkip, sortBy, setSortBy, setAvailability, portOptions, sliceSummary, clearMarketFilters, handlePortChange, handleProductChipClick, handleSortChange };
}
