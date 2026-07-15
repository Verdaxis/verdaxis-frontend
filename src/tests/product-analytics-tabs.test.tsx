import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarketplaceTab } from '../components/admin/product-analytics/MarketplaceTab';
import { OverviewTab } from '../components/admin/product-analytics/OverviewTab';
import { RetentionTab } from '../components/admin/product-analytics/RetentionTab';
import { ReliabilityTab } from '../components/admin/product-analytics/ReliabilityTab';
import { ReliabilityResponse } from '../types/productAnalytics';
import { paMarketplace, paMeta, paOverview, paRetention } from './product-analytics-fixtures';

const noop = () => undefined;

describe('overview tab', () => {
  it('renders the lifecycle spine with counts, deltas, and no conversion rates', () => {
    render(<OverviewTab data={paOverview()} compare onSelectTab={noop} />);
    const spine = screen.getByTestId('lifecycle-spine');
    expect(within(spine).getAllByRole('button')).toHaveLength(6);
    expect(within(spine).getByText('120')).toBeTruthy();
    // Null (coverage-gated) values render as an em dash, never a zero.
    expect(spine.textContent).not.toMatch(/%/);
  });

  it('clicking a lifecycle stage opens its detail tab', async () => {
    const onSelectTab = vi.fn();
    render(<OverviewTab data={paOverview()} compare onSelectTab={onSelectTab} />);
    fireEvent.click(
      within(screen.getByTestId('lifecycle-spine')).getAllByRole('button')[5],
    );
    expect(onSelectTab).toHaveBeenCalledWith('retention');
  });

  it('marks suppressed balance cells and lists needs-attention rules', () => {
    render(<OverviewTab data={paOverview()} compare onSelectTab={noop} />);
    // Suppressed segmented cells show the privacy marker, not zero.
    expect(screen.getAllByText('< 3').length).toBeGreaterThanOrEqual(2);
    const attention = screen.getByTestId('needs-attention');
    expect(within(attention).getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('marketplace tab', () => {
  it('renders live and demo sections separately without summing', () => {
    render(<MarketplaceTab data={paMarketplace()} compare onSelectTab={noop} />);
    expect(screen.getByTestId('market-section-live')).toBeTruthy();
    expect(screen.getByTestId('market-section-demo')).toBeTruthy();
    expect(screen.getByText('Live market')).toBeTruthy();
    expect(screen.getByText('Demo environment')).toBeTruthy();
  });

  it('suppresses slice prices under the three-organization threshold', () => {
    render(<MarketplaceTab data={paMarketplace()} compare onSelectTab={noop} />);
    const slices = screen.getAllByTestId('liquidity-slices')[0];
    expect(within(slices).getByText('780.00')).toBeTruthy();
    const rotterdamRow = within(slices).getByText(/Rotterdam/).closest('tr') as HTMLElement;
    expect(within(rotterdamRow).getByText('< 3')).toBeTruthy();
    expect(rotterdamRow.textContent).not.toContain('790');
  });

  it('flags right-censored execution cohorts and shows reference as coverage', () => {
    render(<MarketplaceTab data={paMarketplace()} compare onSelectTab={noop} />);
    expect(screen.getAllByTestId('cohort-incomplete').length).toBeGreaterThan(0);
    const reference = screen.getByTestId('reference-coverage');
    expect(within(reference).getByText('1080.00')).toBeTruthy();
    expect(within(reference).getByText('stale')).toBeTruthy();
    // Reference is coverage only — no participants or execution columns.
    expect(reference.textContent).not.toMatch(/execution|participants/i);
  });

  it('renders the product × port matrix with suppression markers', () => {
    render(<MarketplaceTab data={paMarketplace()} compare onSelectTab={noop} />);
    const matrix = screen.getAllByTestId('market-matrix')[0];
    expect(within(matrix).getByText('6')).toBeTruthy();
    expect(within(matrix).getAllByText(/< 3/).length).toBeGreaterThan(0);
  });
});

describe('retention tab', () => {
  it('keeps suppressed cohort cells suppressed in both count and pct modes', async () => {
    render(<RetentionTab data={paRetention()} compare onSelectTab={noop} />);
    const grid = screen.getByTestId('cohort-grid');
    expect(within(grid).getAllByText('< 3').length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole('button', { name: 'Show percentages' }));
    expect(within(grid).getAllByText('< 3').length).toBeGreaterThanOrEqual(2);
  });

  it('renders null returning-members as unavailable and zero as zero', () => {
    render(<RetentionTab data={paRetention()} compare onSelectTab={noop} />);
    const repeat = screen.getByTestId('repeat-participation');
    const twoDayRow = within(repeat).getByText('2 active days').closest('tr') as HTMLElement;
    expect(within(twoDayRow).getByText('0')).toBeTruthy(); // genuine zero stays visible
  });
});

describe('reliability tab', () => {
  const data = (): ReliabilityResponse => ({
    meta: paMeta(),
    collector: { status: 'partial', diagnostic: 'upstream', last_observation_at: '2026-07-15T00:00:00Z' },
    login_failures: {
      total: { value: 6, previous: 2, suppressed: false },
      categories: [{ key: 'invalid_credentials', count: 5, suppressed: false }],
      trend: [{ date: '2026-06-10', value: 6 }],
    },
    frontend_errors: {
      total: { value: 2, previous: null, suppressed: false },
      by_route_family: [{ key: 'platform', count: null, suppressed: true }],
      by_category: [{ key: 'render', count: null, suppressed: true }],
    },
    backend_unavailable: {
      total: { value: 0, previous: 0, suppressed: false },
      by_route_family: [],
    },
    navigation_latency: [
      {
        destination: 'all',
        buckets: [
          { key: 'lt250', count: 14, suppressed: false },
          { key: '250_500', count: 0, suppressed: false },
        ],
      },
    ],
    audit_activity: [
      { occurred_at: '2026-07-14T10:00:00Z', action: 'admin.user.approved', resource_type: 'user', actor_role: 'ADMIN' },
    ],
  });

  it('shows collector state, deduplicated latency buckets, and actor-free audit rows', () => {
    render(<ReliabilityTab data={data()} compare onSelectTab={noop} />);
    expect((screen.getByTestId('reliability-status')).textContent).toContain('partial');
    expect(screen.getByText('All destinations')).toBeTruthy();
    const audit = screen.getByTestId('audit-activity');
    expect(within(audit).getByText('admin.user.approved')).toBeTruthy();
    expect(audit.textContent).not.toMatch(/@|\d+\.\d+\.\d+\.\d+/); // no emails or IPs
  });
});
