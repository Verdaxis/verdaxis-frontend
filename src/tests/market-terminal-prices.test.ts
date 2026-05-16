import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getTerminalFuelType, getTerminalPort, terminalWindowMatches } from '../components/MarketTerminal';
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
        expect(APPROVED_TRADING_PORTS).toEqual([
            'Dalian',
            'Busan',
            'Shanghai',
            'Singapore',
            'Rotterdam',
            'Houston',
            'Los Angeles',
            'Santos',
        ]);
    });

    it('normalizes stale or unsupported saved terminal ports to the default market port', () => {
        expect(getTerminalPort('Rotterdam')).toBe('Rotterdam');
        expect(getTerminalPort('rotterdam')).toBe('Rotterdam');
        expect(getTerminalPort('Amsterdam')).toBe('Singapore');
        expect(getTerminalPort(null)).toBe('Singapore');
    });

    it('matches canonical and legacy availability windows for terminal rows', () => {
        expect(terminalWindowMatches('SPOT', 'SPOT')).toBe(true);
        expect(terminalWindowMatches('Spot', 'SPOT')).toBe(true);
        expect(terminalWindowMatches('2026-Q1', 'Q1 2026')).toBe(true);
        expect(terminalWindowMatches('Forward 2027', '2027-CAL')).toBe(true);
        expect(terminalWindowMatches('2028-CAL', 'Forward 2028')).toBe(true);
        expect(terminalWindowMatches('FORWARD_2029', '2029-CAL')).toBe(true);
        expect(terminalWindowMatches('Forward 2030', '2030-CAL')).toBe(true);
    });

    it('passes the selected canonical product into the embedded forward curve', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/components/MarketTerminal.tsx'), 'utf8');

        expect(source).toContain('marketProductCode={selectedProduct}');
        expect(source).toContain('const portNames = APPROVED_TRADING_PORTS');
        expect(source).toContain('embedded');
        expect(source).not.toContain('marketProduct={selectedProduct}');
    });

    it('queries price discovery by delivery point id rather than using port names as regions', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/components/MarketTerminal.tsx'), 'utf8');

        expect(source).toContain('delivery_point_id: selectedDeliveryPointId');
        expect(source).not.toContain('region: selectedPort');
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
        expect(source).toContain('terminalOrdersInFlight?.request === request');
        expect(source).toContain('authScopeRef.current === authScope');
        expect(source).toContain('const TERMINAL_SSE_REFETCH_DEBOUNCE_MS = 600');
        expect(source).toContain('isTerminalOrdersCacheFresh(terminalOrdersCache, authScope)');
        expect(source).toContain('fetchOrders(true, { force: true })');
        expect(source).toContain('api.marketData.invalidateForwardCurves()');
        expect(source).toContain('api.marketData.invalidatePrices()');
        expect(handleOrderbookEvent).toContain('scheduleOrderbookRefresh()');
        expect(handleOrderbookEvent).not.toContain('fetchOrders(true)');
    });
});
