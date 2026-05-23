import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import React from 'react';

import { buildPrimarySidebarItems } from '../components/layout/sidebarConfig';
import { Sidebar } from '../components/layout/Sidebar';
import { renderWithProviders } from './test-utils';

const t = (key: string) => key;

describe('sidebar config', () => {
  it('keeps buyer and supplier nav labels in the same order', () => {
    const buyer = buildPrimarySidebarItems(t as any, 'BUYER');
    const supplier = buildPrimarySidebarItems(t as any, 'SUPPLIER');

    expect(buyer.map((item) => item.key)).toEqual(supplier.map((item) => item.key));
    expect(buyer.map((item) => item.label)).toEqual(supplier.map((item) => item.label));
  });

  it('routes analytics to the correct page for each role', () => {
    const buyerAnalytics = buildPrimarySidebarItems(t as any, 'BUYER').find((item) => item.key === 'ANALYTICS');
    const supplierAnalytics = buildPrimarySidebarItems(t as any, 'SUPPLIER').find((item) => item.key === 'ANALYTICS');

    expect(buyerAnalytics?.page).toBe('DATA_ANALYTICS');
    expect(supplierAnalytics?.page).toBe('ANALYTICS');
  });

  it('routes Forward Curve to the monitoring workspace, not the trading terminal', () => {
    const forwardCurve = buildPrimarySidebarItems(t as any, 'BUYER').find((item) => item.key === 'FORWARD_CURVE');

    expect(forwardCurve?.page).toBe('FORWARD_CURVE');
    expect(forwardCurve?.label).toBe('sidebar.marketTerminal');
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
