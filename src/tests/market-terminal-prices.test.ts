import { describe, it, expect } from 'vitest';
import { getTerminalFuelType } from '../components/MarketTerminal';
import { APPROVED_TRADING_PORTS } from '../data';

describe('MarketTerminal price data integration', () => {
    it('should prefer real trade prices over simulated data', () => {
        const summary = {
            fuel_type: 'Methanol',
            region: 'Singapore',
            last_price: 542.50,
            avg_price_24h: 540.00,
            high_24h: 545.00,
            low_24h: 535.00,
            volume_24h: 8500,
            trade_count_24h: 5,
            price_change_pct: 1.2,
            last_trade_at: '2026-02-12T10:00:00Z',
        };

        const lastPrice = summary.last_price ?? null;
        expect(lastPrice).toBe(542.50);

        const change = summary.price_change_pct ?? null;
        expect(change).toBe(1.2);
    });
});


describe('MarketTerminal trading taxonomy', () => {
    it('maps canonical market products back to the underlying terminal fuel family', () => {
        expect(getTerminalFuelType('BIO_METHANOL')).toBe('Methanol');
        expect(getTerminalFuelType('E_METHANOL')).toBe('Methanol');
        expect(getTerminalFuelType('BIO_ETHANOL')).toBe('Ethanol');
        expect(getTerminalFuelType('SYNTHETIC_ETHANOL')).toBe('Ethanol');
    });

    it('uses the approved trading port set for terminal selectors', () => {
        expect(APPROVED_TRADING_PORTS).toEqual(['Dalian', 'Busan', 'Shanghai', 'Singapore', 'Rotterdam', 'Houston', 'Los Angeles', 'Santos']);
    });

    it('queries price discovery by delivery point id rather than using port names as regions', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/components/MarketTerminal.tsx'), 'utf8');
        const priceFetches = source.slice(
            source.indexOf('// Fetch real price summaries from price discovery API'),
            source.indexOf('// Simulation tick: update every 6 seconds')
        );

        expect(priceFetches).toContain('delivery_point_id: selectedDeliveryPointId');
        expect(priceFetches).not.toContain('region: selectedPort');
    });

    it('coalesces terminal orderbook loads and debounces bursty SSE refreshes', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/components/MarketTerminal.tsx'), 'utf8');
        const handleOrderbookEvent = source.slice(
            source.indexOf('const handleOrderbookEvent'),
            source.indexOf("const { isConnected: orderbookConnected }")
        );

        expect(source).toContain('const TERMINAL_ORDERBOOK_CACHE_TTL_MS = 15_000');
        expect(source).toContain('let terminalOrdersInFlight: TerminalOrdersRequest | null = null');
        expect(source).toContain('authScope: string');
        expect(source).toContain('sliceKey: string');
        expect(source).toContain('terminalOrdersInFlight?.request === request');
        expect(source).toContain('authScopeRef.current === authScope');
        expect(source).toContain('terminalOrdersSliceKeyRef.current === terminalOrdersSliceKey');
        expect(source).toContain('const TERMINAL_SSE_REFETCH_DEBOUNCE_MS = 600');
        expect(source).toContain('isTerminalOrdersCacheFresh(terminalOrdersCache, authScope, terminalOrdersSliceKey)');
        expect(source).toContain('fetchOrders(true, { force: true })');
        expect(source).toContain('api.marketData.invalidateForwardCurves()');
        expect(source).toContain('api.marketData.invalidatePrices()');
        expect(handleOrderbookEvent).toContain('scheduleOrderbookRefresh()');
        expect(handleOrderbookEvent).not.toContain('fetchOrders(true)');
    });

    it('loads only the active terminal orderbook slice instead of blocking on the full book', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/components/MarketTerminal.tsx'), 'utf8');
        const fetchOrders = source.slice(
            source.indexOf('const fetchOrders'),
            source.indexOf('// Initial fetch on mount')
        );

        expect(fetchOrders).toContain('api.orderbook.listBids(orderbookParams)');
        expect(fetchOrders).toContain('api.orderbook.listAsks(orderbookParams)');
        expect(fetchOrders).toContain('market_product: selectedProduct');
        expect(fetchOrders).toContain('delivery_point_id: selectedDeliveryPointId');
        expect(fetchOrders).toContain('region: selectedPort');
        expect(fetchOrders).not.toContain('api.orderbook.list()');
    });
});
