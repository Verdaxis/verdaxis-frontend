import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';

const controls = vi.hoisted(() => ({
    summary: vi.fn(),
    myTradesPaged: vi.fn(),
    getAll: vi.fn(),
    put: vi.fn(),
    userId: 'user-0',
    supportActive: false,
    desktop: true,
}));

vi.mock('../services/api', async importOriginal => {
    const actual = await importOriginal<typeof import('../services/api')>();
    return {
        ApiError: actual.ApiError,
        isKycRequiredError: actual.isKycRequiredError,
        ApiOutcomeUnknownError: class extends Error {},
        api: {
            trades: { summary: controls.summary, myTradesPaged: controls.myTradesPaged },
            preferences: { getAll: controls.getAll, put: controls.put },
        },
    };
});
vi.mock('../hooks/useWatchlist', () => ({
    useWatchlist: () => ({ radar: null, events: [], loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('../hooks/useSSE', () => ({ useSSE: vi.fn() }));
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ user: { id: controls.userId, organization_id: 'org-1' }, isAuthenticated: true }),
}));
vi.mock('../context/MarketSupportContext', () => ({
    useMarketSupport: () => ({
        isActive: controls.supportActive,
        context: controls.supportActive ? { id: 'ctx-1' } : null,
    }),
}));
vi.mock('../components/OrderPlaceModal', () => ({ OrderPlaceModal: () => null }));
vi.mock('../components/watchlist/MarketRadarPanel', () => ({ MarketRadarPanel: () => <div>Radar section</div> }));
vi.mock('../components/SupplierDemandFeed', () => ({ SupplierDemandFeed: () => <div>Demand section</div> }));
vi.mock('../components/dashboard/widgets', () => ({
    ForwardCurveWidget: () => <div>Forward curve content</div>,
    OrderBookWidget: () => <div>Order book content</div>,
    TradeTapeWidget: () => <div>Trade tape content</div>,
    MyTradesWidget: () => <div>My trades content</div>,
}));

import { CommandCenter } from '../components/CommandCenter';
import { renderWithProviders } from './test-utils';
import { setAccessToken } from '../services/authToken';
import { ApiError } from '../services/api';
import { defaultLayout } from '../utils/dashboardLayout';

const widgetEl = (type: string) => document.querySelector<HTMLElement>(`[data-widget-type="${type}"]`)!;
const renderedTypes = () => Array.from(document.querySelectorAll<HTMLElement>('[data-widget-type]'))
    .map(element => element.dataset.widgetType);

const stored = (widgets: Array<Record<string, unknown>>) => ({ version: 1, widgets });
const w = (type: string, x: number, y: number, ww: number, h: number, id = type) => ({ id, type, x, y, w: ww, h });

/** Renders the home and waits for the data and the layout read. */
const renderHome = async (viewMode: 'BUYER' | 'SUPPLIER' = 'BUYER') => {
    const view = renderWithProviders(<CommandCenter viewMode={viewMode} onNavigate={vi.fn()} />);
    await screen.findByRole('heading', { level: 1, name: 'Command Center' });
    return view;
};

const startCustomizing = async (viewMode: 'BUYER' | 'SUPPLIER' = 'BUYER') => {
    await renderHome(viewMode);
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    await screen.findByRole('group', { name: 'Customize home' });
};

let userCounter = 0;

describe('customizable home', () => {
    beforeEach(() => {
        // The preference read is cached per user for the session; use a new user per test.
        controls.userId = `user-${++userCounter}`;
        controls.supportActive = false;
        controls.desktop = true;
        setAccessToken(`dashboard-session-${userCounter}`);
        controls.summary.mockReset().mockResolvedValue({
            total_count: 5, action_required_count: 1, awaiting_counterparty_count: 2, confirmed_count: 2,
        });
        controls.myTradesPaged.mockReset().mockResolvedValue({ items: [], total: 0, skip: 0, limit: 8 });
        controls.getAll.mockReset().mockResolvedValue({});
        controls.put.mockReset().mockResolvedValue(undefined);
        window.matchMedia = vi.fn().mockImplementation((query: string) => ({
            matches: controls.desktop,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    });

    afterEach(() => cleanup());

    describe('default layout', () => {
        it("renders today's buyer home, section by section, in order", async () => {
            await renderHome('BUYER');
            expect(renderedTypes()).toEqual(['quick_actions', 'trade_summary', 'needs_attention', 'market_radar']);
            expect(screen.getByRole('heading', { level: 1, name: 'Command Center' })).toBeTruthy();
            expect(screen.getByRole('button', { name: /Post a bid|Post Bid|Post a BID/i })).toBeTruthy();
            expect(screen.getByText('Awaiting your confirmation')).toBeTruthy();
            expect(screen.getByText('Radar section')).toBeTruthy();
            expect(screen.queryByText('Demand section')).toBeNull();
            // Never customized: nothing is written.
            expect(controls.put).not.toHaveBeenCalled();
        });

        it('adds the supplier demand feed for suppliers', async () => {
            await renderHome('SUPPLIER');
            expect(renderedTypes()).toEqual([
                'quick_actions', 'trade_summary', 'needs_attention', 'market_radar', 'supplier_demand',
            ]);
            expect(screen.getByText('Demand section')).toBeTruthy();
        });

        it('stacks every section on the full 12-column width', async () => {
            await renderHome('BUYER');
            for (const type of renderedTypes()) {
                expect(widgetEl(type!).style.getPropertyValue('--dash-col')).toBe('1 / span 12');
            }
            expect(widgetEl('quick_actions').style.getPropertyValue('--dash-row')).toBe('1 / span 2');
        });

        it('reads the saved layout once and never writes on load', async () => {
            await renderHome('BUYER');
            expect(controls.getAll).toHaveBeenCalledTimes(1);
            expect(controls.put).not.toHaveBeenCalled();
        });
    });

    describe('stored layouts', () => {
        it('uses a saved layout, in its saved order', async () => {
            controls.getAll.mockResolvedValue({
                dashboard: stored([w('needs_attention', 0, 0, 12, 3), w('quick_actions', 0, 3, 12, 2)]),
            });
            await renderHome('BUYER');
            expect(renderedTypes()).toEqual(['needs_attention', 'quick_actions']);
            expect(screen.queryByText('Awaiting your confirmation')).toBeNull();
        });

        it('drops unknown widget types and keeps the known ones', async () => {
            controls.getAll.mockResolvedValue({
                dashboard: stored([w('weather', 0, 0, 12, 2), w('trade_summary', 0, 2, 12, 2)]),
            });
            await renderHome('BUYER');
            expect(renderedTypes()).toEqual(['trade_summary']);
        });

        it.each([
            ['an unsupported version', { version: 2, widgets: [w('trade_summary', 0, 0, 12, 2)] }],
            ['a layout of only unknown types', stored([w('weather', 0, 0, 12, 2)])],
            ['a value that is not an object', 'broken'],
        ])('ignores %s and shows the default', async (_name, value) => {
            controls.getAll.mockResolvedValue({ dashboard: value });
            await renderHome('BUYER');
            expect(renderedTypes()).toEqual(['quick_actions', 'trade_summary', 'needs_attention', 'market_radar']);
        });

        it('shows an empty state for a layout the user emptied on purpose', async () => {
            controls.getAll.mockResolvedValue({ dashboard: stored([]) });
            await renderHome('BUYER');
            expect(await screen.findByText('Your home has no widgets')).toBeTruthy();
        });

        it('hides the supplier demand widget from buyers even when it is saved', async () => {
            controls.getAll.mockResolvedValue({
                dashboard: stored([w('trade_summary', 0, 0, 12, 2), w('supplier_demand', 0, 2, 12, 3)]),
            });
            await renderHome('BUYER');
            expect(renderedTypes()).toEqual(['trade_summary']);
        });
    });

    describe('when the layout cannot be read', () => {
        it('shows the default with a non-blocking notice and keeps the page usable', async () => {
            controls.getAll.mockRejectedValue(new ApiError('Not Found', 404));
            await renderHome('BUYER');
            expect(renderedTypes()).toEqual(['quick_actions', 'trade_summary', 'needs_attention', 'market_radar']);
            expect(screen.getByText(/saved layout could not be loaded/i)).toBeTruthy();
            fireEvent.click(screen.getByRole('button', { name: 'Dismiss this message' }));
            expect(screen.queryByText(/saved layout could not be loaded/i)).toBeNull();
        });

        it('keeps edits in memory when saving is refused with 404', async () => {
            controls.put.mockRejectedValue(new ApiError('Unknown preference namespace', 404));
            await startCustomizing();
            fireEvent.click(screen.getByRole('button', { name: 'Remove Trade summary' }));
            fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));

            await waitFor(() => expect(screen.queryByRole('group', { name: 'Customize home' })).toBeNull());
            expect(controls.put).toHaveBeenCalledTimes(1);
            expect(renderedTypes()).toEqual(['quick_actions', 'needs_attention', 'market_radar']);
            expect(screen.getByText(/Your layout could not be saved/i)).toBeTruthy();
        });
    });

    describe('customizing', () => {
        it('offers Customize on desktop only, and not while acting for another organization', async () => {
            await renderHome('BUYER');
            expect(screen.getByRole('button', { name: 'Customize' })).toBeTruthy();
            cleanup();

            controls.supportActive = true;
            controls.userId = `user-${++userCounter}`;
            await renderHome('BUYER');
            expect(screen.queryByRole('button', { name: 'Customize' })).toBeNull();
            expect(controls.getAll).toHaveBeenCalledTimes(1); // the first render only
            expect(renderedTypes()).toEqual(['quick_actions', 'trade_summary', 'needs_attention']);
        });

        it('removes a widget', async () => {
            await startCustomizing();
            fireEvent.click(screen.getByRole('button', { name: 'Remove Market radar' }));
            expect(renderedTypes()).toEqual(['quick_actions', 'trade_summary', 'needs_attention']);
            expect(screen.getByTestId('dashboard-announcer').textContent).toBe('Market radar removed.');
        });

        it('moves a widget down and up through the order', async () => {
            await startCustomizing();
            fireEvent.click(screen.getByRole('button', { name: 'Move Quick actions down' }));
            expect(renderedTypes()).toEqual(['trade_summary', 'quick_actions', 'needs_attention', 'market_radar']);
            expect(screen.getByTestId('dashboard-announcer').textContent)
                .toBe('Quick actions is in column 1, position 2 of 4.');
            fireEvent.click(screen.getByRole('button', { name: 'Move Quick actions up' }));
            expect(renderedTypes()).toEqual(['quick_actions', 'trade_summary', 'needs_attention', 'market_radar']);
        });

        it('disables a move that cannot happen', async () => {
            await startCustomizing();
            expect((screen.getByRole('button', { name: 'Move Quick actions up' }) as HTMLButtonElement).disabled).toBe(true);
            expect((screen.getByRole('button', { name: 'Move Quick actions left' }) as HTMLButtonElement).disabled).toBe(true);
            expect((screen.getByRole('button', { name: 'Move Market radar down' }) as HTMLButtonElement).disabled).toBe(true);
        });

        it('resizes a widget and says what it is now', async () => {
            await startCustomizing();
            fireEvent.click(screen.getByRole('button', { name: 'Make Needs attention narrower' }));
            expect(widgetEl('needs_attention').style.getPropertyValue('--dash-col')).toBe('1 / span 11');
            fireEvent.click(screen.getByRole('button', { name: 'Make Needs attention taller' }));
            expect(widgetEl('needs_attention').style.getPropertyValue('--dash-row')).toBe('5 / span 4');
            expect(screen.getByTestId('dashboard-announcer').textContent)
                .toBe('Needs attention is now 11 columns wide and 4 rows tall.');
            expect(widgetEl('market_radar').style.getPropertyValue('--dash-row')).toBe('9 / span 3');
        });

        it('moves a narrowed widget beside another', async () => {
            await startCustomizing();
            for (let i = 0; i < 6; i += 1) {
                fireEvent.click(screen.getByRole('button', { name: 'Make Trade summary narrower' }));
                fireEvent.click(screen.getByRole('button', { name: 'Make Needs attention narrower' }));
            }
            for (let i = 0; i < 6; i += 1) {
                fireEvent.click(screen.getByRole('button', { name: 'Move Needs attention right' }));
            }
            const summary = widgetEl('trade_summary');
            const attention = widgetEl('needs_attention');
            expect(summary.style.getPropertyValue('--dash-col')).toBe('1 / span 6');
            expect(attention.style.getPropertyValue('--dash-col')).toBe('7 / span 6');
            expect(attention.style.getPropertyValue('--dash-row').split(' / ')[0])
                .toBe(summary.style.getPropertyValue('--dash-row').split(' / ')[0]);
        });

        it('adds a widget from the picker and offers only widgets that are not placed', async () => {
            await startCustomizing('BUYER');
            fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
            const picker = screen.getByRole('group', { name: 'Available widgets' });
            const offered = within(picker).getAllByRole('button').map(button => button.getAttribute('data-picker-type'));
            expect(offered).toEqual(['forward_curve', 'order_book', 'trade_tape', 'my_trades']);
            expect(offered).not.toContain('supplier_demand');

            fireEvent.click(within(picker).getByRole('button', { name: /Add Forward curve/ }));
            expect(renderedTypes().at(-1)).toBe('forward_curve');
            expect(screen.getByText('Forward curve content')).toBeTruthy();
            expect(screen.queryByRole('group', { name: 'Available widgets' })).toBeNull();

            fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
            const again = within(screen.getByRole('group', { name: 'Available widgets' })).getAllByRole('button');
            expect(again.map(button => button.getAttribute('data-picker-type'))).not.toContain('forward_curve');
        });

        it('offers supplier demand to suppliers once it was removed', async () => {
            await startCustomizing('SUPPLIER');
            fireEvent.click(screen.getByRole('button', { name: 'Remove Buyer demand' }));
            fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
            expect(within(screen.getByRole('group', { name: 'Available widgets' })).getByRole('button', { name: /Add Buyer demand/ })).toBeTruthy();
        });

        it('resets to the default layout', async () => {
            await startCustomizing();
            const reset = screen.getByRole('button', { name: 'Reset to default' }) as HTMLButtonElement;
            expect(reset.disabled).toBe(true);
            fireEvent.click(screen.getByRole('button', { name: 'Remove Trade summary' }));
            fireEvent.click(screen.getByRole('button', { name: 'Move Quick actions down' }));
            expect(reset.disabled).toBe(false);
            fireEvent.click(reset);
            expect(renderedTypes()).toEqual(['quick_actions', 'trade_summary', 'needs_attention', 'market_radar']);
            expect(reset.disabled).toBe(true);
        });

        it('discards the edits on Cancel and writes nothing', async () => {
            await startCustomizing();
            fireEvent.click(screen.getByRole('button', { name: 'Remove Trade summary' }));
            fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
            expect(screen.queryByRole('group', { name: 'Customize home' })).toBeNull();
            expect(renderedTypes()).toEqual(['quick_actions', 'trade_summary', 'needs_attention', 'market_radar']);
            expect(controls.put).not.toHaveBeenCalled();
            // The next edit starts from the saved layout, not the discarded draft.
            fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
            expect(screen.getByRole('button', { name: 'Remove Trade summary' })).toBeTruthy();
        });

        it('keeps previews inert so a stray click cannot act', async () => {
            await startCustomizing();
            const preview = widgetEl('quick_actions').querySelector('[inert]');
            expect(preview).not.toBeNull();
            expect(preview!.textContent).toMatch(/Browse/);
        });
    });

    describe('saving', () => {
        it('sends exactly the schema: version and widgets, nothing else', async () => {
            await startCustomizing();
            fireEvent.click(screen.getByRole('button', { name: 'Remove Trade summary' }));
            fireEvent.click(screen.getByRole('button', { name: 'Make Quick actions narrower' }));
            fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));

            await waitFor(() => expect(controls.put).toHaveBeenCalledTimes(1));
            expect(controls.put).toHaveBeenCalledWith('dashboard', {
                version: 1,
                widgets: [
                    { id: 'quick_actions', type: 'quick_actions', x: 0, y: 0, w: 11, h: 2 },
                    { id: 'needs_attention', type: 'needs_attention', x: 0, y: 2, w: 12, h: 3 },
                    { id: 'market_radar', type: 'market_radar', x: 0, y: 5, w: 12, h: 3 },
                ],
            });
            await waitFor(() => expect(screen.queryByRole('group', { name: 'Customize home' })).toBeNull());
            expect(renderedTypes()).toEqual(['quick_actions', 'needs_attention', 'market_radar']);
            expect(screen.queryByText(/Your layout could not be saved/i)).toBeNull();
        });

        it('keeps a saved layout for the next visit in the session', async () => {
            await startCustomizing();
            fireEvent.click(screen.getByRole('button', { name: 'Remove Market radar' }));
            fireEvent.click(screen.getByRole('button', { name: 'Save layout' }));
            await waitFor(() => expect(controls.put).toHaveBeenCalledTimes(1));
            await waitFor(() => expect(screen.queryByRole('group', { name: 'Customize home' })).toBeNull());
            cleanup();

            // The shared preference read now holds the saved value; no second request is needed.
            await renderHome('BUYER');
            expect(renderedTypes()).toEqual(['quick_actions', 'trade_summary', 'needs_attention']);
            expect(controls.getAll).toHaveBeenCalledTimes(1);
        });

        it('shows a saving state and does not send twice', async () => {
            let release: () => void = () => undefined;
            controls.put.mockReturnValue(new Promise<void>(resolve => { release = resolve; }));
            await startCustomizing();
            const save = screen.getByRole('button', { name: 'Save layout' });
            fireEvent.click(save);
            fireEvent.click(save);
            expect(await screen.findByRole('button', { name: 'Saving...' })).toBeTruthy();
            expect(controls.put).toHaveBeenCalledTimes(1);
            await act(async () => release());
            await waitFor(() => expect(screen.queryByRole('group', { name: 'Customize home' })).toBeNull());
        });
    });

    describe('keyboard use', () => {
        it('exposes every move, resize and remove control as a named native button', async () => {
            await startCustomizing();
            const group = screen.getByRole('group', { name: 'Needs attention controls' });
            const buttons = within(group).getAllByRole('button');
            expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual([
                'Move Needs attention left',
                'Move Needs attention right',
                'Move Needs attention up',
                'Move Needs attention down',
                'Make Needs attention wider',
                'Make Needs attention narrower',
                'Make Needs attention taller',
                'Make Needs attention shorter',
                'Remove Needs attention',
            ]);
            for (const button of buttons) {
                // Native buttons are focusable and respond to Enter and Space; no drag is needed.
                expect(button.tagName).toBe('BUTTON');
                expect(button.getAttribute('type')).toBe('button');
                expect(button.getAttribute('draggable')).toBeNull();
            }
        });

        it('keeps focus on the pressed control after the order changes', async () => {
            await startCustomizing();
            const down = screen.getByRole('button', { name: 'Move Quick actions down' });
            down.focus();
            fireEvent.click(down);
            await waitFor(() => expect(document.activeElement?.getAttribute('aria-label')).toBe('Move Quick actions down'));
            expect(widgetEl('quick_actions').contains(document.activeElement)).toBe(true);
        });

        it('moves focus to the widget controls when the pressed move is no longer possible', async () => {
            await startCustomizing();
            const down = screen.getByRole('button', { name: 'Move Needs attention down' });
            down.focus();
            fireEvent.click(down); // now last: "down" is disabled
            await waitFor(() => expect(document.activeElement?.hasAttribute('data-widget-controls')).toBe(true));
            expect(widgetEl('needs_attention').contains(document.activeElement)).toBe(true);
        });
    });

    describe('small screens', () => {
        it('shows one column in saved order and offers no editing', async () => {
            controls.desktop = false;
            controls.getAll.mockResolvedValue({
                dashboard: stored([
                    w('market_radar', 6, 7, 6, 3),
                    w('quick_actions', 0, 0, 12, 2),
                    w('needs_attention', 0, 2, 6, 3),
                ]),
            });
            await renderHome('BUYER');
            expect(screen.queryByRole('button', { name: 'Customize' })).toBeNull();
            // Reading order: top to bottom, then left to right.
            expect(renderedTypes()).toEqual(['quick_actions', 'needs_attention', 'market_radar']);
            const grid = document.querySelector('[data-dashboard-grid]')!;
            expect(grid.className).toContain('grid-cols-1');
            for (const cell of Array.from(grid.children)) {
                expect(cell.className).toContain('col-span-full');
            }
        });
    });
});
