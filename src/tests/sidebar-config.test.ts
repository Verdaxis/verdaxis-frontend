import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import React from 'react';
import type { TFunction } from 'i18next';

import { buildPrimarySidebarItems } from '../components/layout/sidebarConfig';
import { Sidebar } from '../components/layout/Sidebar';
import { renderWithProviders } from './test-utils';

const t = ((key: string) => key) as TFunction;

describe('sidebar config', () => {
  it('keeps buyer and supplier nav labels in the same order', () => {
    const buyer = buildPrimarySidebarItems(t);
    const supplier = buildPrimarySidebarItems(t);

    expect(buyer.map((item) => item.key)).toEqual(supplier.map((item) => item.key));
    expect(buyer.map((item) => item.label)).toEqual(supplier.map((item) => item.label));
  });

  it('routes analytics to the shared data page for each role', () => {
    const buyerAnalytics = buildPrimarySidebarItems(t).find((item) => item.key === 'ANALYTICS');
    const supplierAnalytics = buildPrimarySidebarItems(t).find((item) => item.key === 'ANALYTICS');

    expect(buyerAnalytics?.page).toBe('DATA_ANALYTICS');
    expect(supplierAnalytics?.page).toBe('DATA_ANALYTICS');
  });

  it('exposes a route path for every nav item', () => {
    const buyer = buildPrimarySidebarItems(t);

    expect(Object.fromEntries(buyer.map((item) => [item.key, item.path]))).toEqual({
      DASHBOARD: '/app/home',
      MAP: '/app/map',
      MARKETPLACE: '/app/marketplace',
      FORWARD_CURVE: '/app/curve',
      WATCHLISTS: '/app/watchlist',
      ANALYTICS: '/app/analytics',
      TRADES: '/app/trades',
    });

    const supplierAnalytics = buildPrimarySidebarItems(t).find((item) => item.key === 'ANALYTICS');
    expect(supplierAnalytics?.path).toBe('/app/analytics');
  });

  it('routes Forward Curve to the monitoring workspace', () => {
    const forwardCurve = buildPrimarySidebarItems(t).find((item) => item.key === 'FORWARD_CURVE');

    expect(forwardCurve?.page).toBe('FORWARD_CURVE');
    expect(forwardCurve?.label).toBe('sidebar.forwardCurve');
  });

  it('does not render deferred compliance or education sidebar links', () => {
    renderWithProviders(
      React.createElement(Sidebar, {
        viewMode: 'BUYER',
        currentPage: 'DASHBOARD',
        onNavigate: () => undefined,
        isCollapsed: false,
        onToggleCollapse: () => undefined,
        isMobileOpen: false,
        onMobileClose: () => undefined,
      }),
    );

    expect(screen.queryByText('Partners')).toBeNull();
    expect(screen.queryByText('Compliance')).toBeNull();
    expect(screen.queryByText('Education')).toBeNull();
  });
});
