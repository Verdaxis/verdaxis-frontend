import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const tabMocks = vi.hoisted(() => ({
  overview: vi.fn(),
  acquisition: vi.fn(),
  activation: vi.fn(),
  engagement: vi.fn(),
  marketplace: vi.fn(),
  retention: vi.fn(),
  reliability: vi.fn(),
}));

vi.mock('../services/api', async importOriginal => {
  const original = await importOriginal<typeof import('../services/api')>();
  return {
    ...original,
    api: {
      ...original.api,
      productAnalytics: tabMocks,
      catalog: { products: vi.fn(async () => []), deliveryPoints: vi.fn(async () => []) },
    },
  };
});

import { ProductAnalyticsWorkspace } from '../components/admin/product-analytics/ProductAnalyticsWorkspace';
import { paMeta, paOverview, paRetention } from './product-analytics-fixtures';

const renderWorkspace = (initial = '/app/admin') =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <ProductAnalyticsWorkspace />
    </MemoryRouter>,
  );

describe('product analytics workspace shell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Tabs without fixture data stay in a pending fetch (loading state), so
    // navigating to them never renders a panel with the wrong shape.
    for (const mock of Object.values(tabMocks)) {
      mock.mockImplementation(() => new Promise(() => undefined));
    }
    tabMocks.overview.mockResolvedValue(paOverview());
    tabMocks.retention.mockResolvedValue(paRetention());
  });

  it('renders an accessible tab rail and fetches only the active tab', async () => {
    renderWorkspace();

    const tablist = screen.getByRole('tablist');
    expect(within(tablist).getAllByRole('tab')).toHaveLength(7);
    expect((screen.getByRole('tab', { selected: true })).textContent).toContain('Overview');

    await waitFor(() => expect(tabMocks.overview).toHaveBeenCalledTimes(1));
    // No hidden-tab waterfall (§2.6).
    expect(tabMocks.marketplace).not.toHaveBeenCalled();
    expect(tabMocks.retention).not.toHaveBeenCalled();
    await screen.findByTestId('lifecycle-spine', {}, { timeout: 10000 });
  });

  it('switching tabs updates selection and fetches the new tab once', async () => {
    renderWorkspace();
    await screen.findByTestId('lifecycle-spine', {}, { timeout: 10000 });

    fireEvent.click(screen.getByRole('tab', { name: 'Retention' }));

    await waitFor(() => expect(tabMocks.retention).toHaveBeenCalledTimes(1));
    expect((screen.getByRole('tab', { selected: true })).textContent).toContain('Retention');
    expect(tabMocks.overview).toHaveBeenCalledTimes(1); // not refetched
    await screen.findByTestId('repeat-participation', {}, { timeout: 10000 });
  });

  it('supports arrow-key navigation on the tab rail', async () => {
    renderWorkspace();
    await screen.findByTestId('lifecycle-spine', {}, { timeout: 10000 });

    const active = screen.getByRole('tab', { selected: true });
    active.focus();
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
    await waitFor(() =>
      expect((screen.getByRole('tab', { selected: true })).textContent).toContain('Acquisition'),
    );
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'End' });
    await waitFor(() =>
      expect((screen.getByRole('tab', { selected: true })).textContent).toContain('Reliability'),
    );
  });

  it('shows a scoped error state with retry when a tab fails', async () => {
    tabMocks.overview.mockRejectedValueOnce(new Error('backend exploded'));
    renderWorkspace();

    await screen.findByRole('alert');
    expect(screen.getByText('backend exploded')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByTestId('lifecycle-spine', {}, { timeout: 10000 });
    expect(tabMocks.overview).toHaveBeenCalledTimes(2);
  });

  it('shows tab-scoped filters only where they apply', async () => {
    renderWorkspace();
    await screen.findByTestId('lifecycle-spine', {}, { timeout: 10000 });
    const rail = screen.getByTestId('pa-filter-rail');
    expect(within(rail).queryByLabelText('Activity source')).toBeNull();
    expect(within(rail).queryByLabelText('Audience')).toBeNull();
    expect(within(rail).getByLabelText('From date')).toBeTruthy();
  });
});
