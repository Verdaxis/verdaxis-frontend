import React from 'react';
import { createHash } from 'node:crypto';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { Marketplace } from '../components/Marketplace';
import { renderWithProviders } from './test-utils';
import i18n, { loadNamespace } from '../i18n';

const mocks = vi.hoisted(() => ({
    role: 'BUYER', products: vi.fn(), deliveryPoints: vi.fn(), asks: vi.fn(), bids: vi.fn(),
    counts: vi.fn(), myOrders: vi.fn(), initiate: vi.fn(), cancel: vi.fn(), overlay: vi.fn(),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'viewer', organization_id: 'org', role: mocks.role } }) }));
vi.mock('../context/MarketSupportContext', () => ({ useMarketSupport: () => ({ isActive: false }) }));
vi.mock('../hooks/useWatchlist', () => ({ useWatchlist: () => ({ trackedSliceKeys: new Set(), pinnedOrderIds: new Set(), toggleSlice: vi.fn(), togglePin: vi.fn() }) }));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/OrderBook', () => ({ OrderBook: () => <div data-testid="depth-child" /> }));
vi.mock('../components/TradeTape', () => ({ TradeTape: () => <div data-testid="tape-child" /> }));
vi.mock('../components/rfq/FameRfqWorkspace', () => ({ FameRfqWorkspace: () => <div data-testid="rfq-history" /> }));
vi.mock('../components/supplier/SupplierOffersWorkspace', () => ({ SupplierOffersWorkspace: () => <div data-testid="offer-history" /> }));
vi.mock('../services/api', async importOriginal => {
    const original = await importOriginal<typeof import('../services/api')>();
    return { ...original, api: {
        catalog: { products: mocks.products, deliveryPoints: mocks.deliveryPoints },
        orderbook: { listAsksPaged: mocks.asks, listBidsPaged: mocks.bids, productCounts: mocks.counts, myOrders: mocks.myOrders, cancel: mocks.cancel },
        trades: { initiate: mocks.initiate }, compliance: { pricingOverlay: mocks.overlay },
    } };
});

const ask = {
    id: 'ask-1', side: 'ASK', market_product: 'B30', product_id: 'b30', product_name: 'B30',
    fuel_type: 'Biofuel', fuel_grade: 'B30', delivery_point_id: 'dp-sg', delivery_point_name: 'Singapore',
    region: 'Singapore', quantity_mt: 1000, remaining_quantity_mt: 500, price_per_mt_usd: 915,
    availability_window: 'SPOT', certifications: ['ISCC EU'], certification_declared: true,
    is_verdaxis_verified: true, is_demo_listing: false, off_spec: false, status: 'OPEN',
    version: 1, terms_digest: 'digest', created_at: '2026-10-18T04:00:00Z',
};

// Hash the complete DOM tree, including text, attributes, classes, SVGs and portals.
// Only React-generated ids are normalized. No presentation field is discarded.
function contractTree(node: Node): unknown {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (!(node instanceof Element)) return null;
    return [node.tagName, [...node.attributes].map(({ name, value }) => [name, value.replace(/_[rR]_[^\s]+?_/g, '_react_id_')]).sort(), [...node.childNodes].map(contractTree)];
}
function expectTree(name: string) {
    const digest = createHash('sha256').update(JSON.stringify(contractTree(document.body))).digest('hex');
    console.info(`DOM_CONTRACT ${name} ${digest}`);
    expect(contracts[name], `Missing pre-move contract: ${name}`).toBeDefined();
    expect(digest).toBe(contracts[name]);
}
const contracts: Record<string, string> = {
    'buyer-listings': '441e0941e2f4882dd733f07a1ba06f847592e14086de0ba62962efe118d7f00a',
    'advanced-filters': '22db62e51303fe87cbcb58be56f393e61a60693ea9682071545baa8df564d58c',
    'supplier-listings': '2e60b6dcaa395d74b1b889e2cf3f754aab2dcb0690fb056038b1057c518f641c',
    'loading': '5ca2cab523afefd6ad3107e213774b6c5b294bb8c1e128774e0cc05fd4a542fd',
    'error': '9f147038bb92b966b26c2144d12a1a32176ba892b78ac4fa96046451c48bbc6e',
    'empty': '1fc83e7736928e58750d3be2a14157b1173b25587b6b649b7c1fb631bffa398e',
    'depth-gate': '1608af8d1789f99066fa56d648bbcf65e0dc585a717f352a4cd7d47bc2d0cf5b',
    'my-orders': '15d8d2576de9b342553dda6cd4a34cbd015474d59d1614053c4d56bbe2303daa',
    'cancellation': 'f956f743fc6db9bbf728f75e4242295472b179cdae00596c7d71a95881b69a7f',
    'history_offers': 'b9d19889ec341e94683a2a911fa90bf5f51dd394b6df332189fa245e708f1357',
    'history_rfqs': '893188a04920cc62bc7ffd286015cddb524d8d0e81d5d7e29a7300b7e00bb2b3',
    'history_my_offers': 'dfd475adde25fabc2ad29347ca8afa7f2ab1eae59c3aef47405decedc67b1fdf',
    'lng-paired-rows': '124617c3f798ccb0505e1c341ba2f3066efe88c69647c69f772a68210126e15a',
    'refresh-warning': '93cd23b426ff3a87cc71b47d4be0f6fb621d6e9ee1890d77ce43d633f33f27cc',
    'take-confirming': '02cd9d82a8fb3296f7b18f525bbad895580b3645425e2711aaa2cb4bc8fcaa3c',
    'take-reviewing': '259a659260f652630ac9ff67b90d93ee960746ef7ac9f424aae7d1c24d30961f',
    'take-success': '7079608d4113a348a443f2853d87e55287408346c17169062e75f8a23a9787f6',
    'take-error': '5bac1db8979bfe129dfdbd46262f3bf020a627eedc61ac2130fe19eb37660978',
    'take-unknown': '1f7afc1358214399e05efb9db6dd20b4bac0f90e437cce09088c907ef7b1433d',
};

beforeEach(async () => {
    await loadNamespace('trading');
    await loadNamespace('rfq');
    await i18n.changeLanguage('en');
    vi.resetAllMocks();
    mocks.role = 'BUYER';
    localStorage.clear();
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-10-18T12:00:00Z').getTime());
    mocks.products.mockResolvedValue([{ id: 'b30', market_product: 'B30', execution_mode: 'ORDERBOOK', is_active: true }]);
    mocks.deliveryPoints.mockResolvedValue([{ id: 'dp-sg', name: 'Singapore', is_active: true }]);
    mocks.asks.mockResolvedValue({ items: [ask], total: 9, skip: 0, limit: 8 });
    mocks.bids.mockResolvedValue({ items: [{ ...ask, id: 'bid-1', side: 'BID', market_product: 'BIO_LNG', fuel_type: 'LNG' }], total: 1, skip: 0, limit: 8 });
    mocks.counts.mockResolvedValue({ counts: { B30: 9 }, total: 9 });
    mocks.myOrders.mockResolvedValue([ask]);
    mocks.overlay.mockResolvedValue({ overlays: {}, assumptions: null });
    mocks.initiate.mockResolvedValue({ ...ask, status: 'PENDING_CONFIRMATION' });
    mocks.cancel.mockResolvedValue(undefined);
});
afterEach(() => vi.restoreAllMocks());

async function loaded(route = '/app/marketplace') {
    renderWithProviders(<Marketplace />, { route });
    await screen.findByRole('button', { name: 'Lift Ask' });
    await waitFor(() => expect(mocks.overlay).toHaveBeenCalled());
}
async function openReview() {
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Lift Ask' }));
    expectTree('take-confirming');
    fireEvent.click(screen.getByRole('button', { name: 'Submit Trade' }));
    await screen.findByRole('button', { name: 'Confirm Trade' });
    expectTree('take-reviewing');
}

describe('Marketplace DOM contract before presentation extraction', () => {
    it('preserves buyer rows, sticky cells, pagination, expanded filters and keyboard focus', async () => {
        await loaded();
        expectTree('buyer-listings');
        const toggle = screen.getByRole('button', { name: 'More Filters' });
        toggle.focus();
        fireEvent.click(toggle);
        expect(document.activeElement).toBe(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(document.getElementById('marketplace-advanced-filters')).not.toBeNull();
        expectTree('advanced-filters');
    });
    it('preserves supplier columns and actions', async () => {
        mocks.role = 'SUPPLIER';
        mocks.products.mockResolvedValue([{ id: 'lng', market_product: 'BIO_LNG', execution_mode: 'ORDERBOOK', is_active: true }]);
        renderWithProviders(<Marketplace />);
        await screen.findByRole('button', { name: 'Hit Bid' });
        expectTree('supplier-listings');
    });
    it('preserves skeleton rows', async () => {
        mocks.asks.mockReturnValue(new Promise(() => undefined));
        renderWithProviders(<Marketplace />);
        await waitFor(() => expect(mocks.counts).toHaveBeenCalled());
        expect(document.querySelectorAll('tbody tr')).toHaveLength(4);
        await waitFor(() => expectTree('loading'));
    });
    it('preserves first-load error', async () => {
        mocks.asks.mockRejectedValue(new Error('Market unavailable'));
        renderWithProviders(<Marketplace />);
        await screen.findByRole('alert');
        expectTree('error');
    });
    it('preserves empty listings', async () => {
        mocks.asks.mockResolvedValue({ items: [], total: 0, skip: 0, limit: 8 });
        renderWithProviders(<Marketplace />);
        await waitFor(() => expect(document.querySelector('tbody .h-12')).not.toBeNull());
        expectTree('empty');
    });
    it('preserves the exact-slice depth gate and tab DOM', async () => {
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?view=orderbook' });
        await waitFor(() => expect(mocks.counts).toHaveBeenCalled());
        await waitFor(() => expectTree('depth-gate'));
    });
    it('preserves my orders and cancellation portal, focus and reason input', async () => {
        renderWithProviders(<Marketplace />, { route: '/app/marketplace?view=my_orders' });
        const cancel = await screen.findByRole('button', { name: 'Cancel' });
        expectTree('my-orders');
        fireEvent.click(cancel);
        await screen.findByRole('dialog');
        expect(document.activeElement).toBe(screen.getByRole('textbox'));
        expectTree('cancellation');
    });
    it.each(['history_offers', 'history_rfqs', 'history_my_offers'])('preserves %s history', async view => {
        mocks.role = 'SUPPLIER';
        renderWithProviders(<Marketplace />, { route: `/app/marketplace?product=UCOME_B100&view=${view}` });
        await screen.findByTestId(view === 'history_rfqs' ? 'rfq-history' : 'offer-history');
        expectTree(view);
    });
    it('preserves Bio-LNG paired rows and disclosed terms', async () => {
        mocks.asks.mockResolvedValue({ items: [{ ...ask, market_product: 'BIO_LNG', fuel_type: 'LNG', lng_terms: {
            side: 'ASK', sustainability_scheme: 'ISCC_EU', chain_of_custody: 'MASS_BALANCE',
            union_database_registered: true, bio_share_pct: 95, feedstock: 'MANURE', feedstock_detail: null,
            production_country: 'NL', wtt_ghg_gco2e_mj: -110, specification_standard: 'ISO 23306:2020',
            min_methane_number: 80, delivery_method: 'SHIP_TO_SHIP', seller_is_physical_supplier: false,
            pos_timing: 'WITH_DELIVERY', reseller: true, fueleu_recognition: 'UNION_DATABASE',
        } }], total: 1, skip: 0, limit: 8 });
        renderWithProviders(<Marketplace />);
        await waitFor(() => expect(document.querySelectorAll('tbody tr')).toHaveLength(2));
        expectTree('lng-paired-rows');
    });
    it('preserves last-good rows with a refresh warning', async () => {
        await loaded();
        mocks.asks.mockRejectedValue(new Error('Refresh unavailable'));
        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        await screen.findByRole('alert');
        expectTree('refresh-warning');
    });
    it('preserves take review and success', async () => {
        await openReview();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));
        await waitFor(() => expect(document.querySelector('[data-tour="trade-modal"]')?.textContent).toContain('PENDING CONFIRMATION'));
        expectTree('take-success');
    });
    it('preserves take failure', async () => {
        mocks.initiate.mockRejectedValue(new Error('Trade unavailable'));
        await openReview();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));
        await screen.findByText('Trade unavailable');
        expectTree('take-error');
    });
    it('preserves unknown-outcome retry', async () => {
        const { ApiOutcomeUnknownError } = await import('../services/api');
        mocks.initiate.mockRejectedValue(new ApiOutcomeUnknownError(new Error('timeout')));
        await openReview();
        fireEvent.click(screen.getByRole('button', { name: 'Confirm Trade' }));
        await screen.findByRole('button', { name: 'Retry safely with the same request' });
        expectTree('take-unknown');
    });
});
