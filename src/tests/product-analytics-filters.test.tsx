import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import {
  filtersToQuery,
  parseProductAnalyticsFilters,
  serializeProductAnalyticsFilters,
  useProductAnalyticsFilters,
} from '../hooks/useProductAnalyticsFilters';

const params = (qs: string) => new URLSearchParams(qs);

describe('product analytics URL filters', () => {
  it('parses canonical defaults from an empty query', () => {
    const filters = parseProductAnalyticsFilters(params(''));
    expect(filters).toMatchObject({
      tab: 'overview',
      period: '30d',
      compare: true,
      audience: 'ALL',
      activity: 'LIVE',
      productId: null,
    });
  });

  it('canonicalizes unknown tab and filter values to safe defaults', () => {
    const filters = parseProductAnalyticsFilters(
      params('analytics=finance&period=14d&audience=ROBOTS&activity=MIXED'),
    );
    expect(filters.tab).toBe('overview');
    expect(filters.period).toBe('30d');
    expect(filters.audience).toBe('ALL');
    expect(filters.activity).toBe('LIVE');
  });

  it('accepts a valid custom range and rejects an inverted one', () => {
    const valid = parseProductAnalyticsFilters(
      params('period=custom&from=2026-06-01&to=2026-06-15'),
    );
    expect(valid.period).toBe('custom');
    expect(valid.from).toBe('2026-06-01');

    const inverted = parseProductAnalyticsFilters(
      params('period=custom&from=2026-06-15&to=2026-06-01'),
    );
    expect(inverted.period).toBe('30d');
    expect(inverted.from).toBeNull();
  });

  it('scopes audience and marketplace filters to their tabs', () => {
    const overview = parseProductAnalyticsFilters(
      params('analytics=overview&audience=BUYER&activity=DEMO&window=SPOT'),
    );
    expect(overview.audience).toBe('ALL');
    expect(overview.activity).toBe('LIVE');
    expect(overview.availabilityWindow).toBeNull();

    const marketplace = parseProductAnalyticsFilters(
      params('analytics=marketplace&activity=ALL&window=2026-Q3'),
    );
    expect(marketplace.activity).toBe('ALL');
    expect(marketplace.availabilityWindow).toBe('2026-Q3');

    const engagement = parseProductAnalyticsFilters(
      params('analytics=engagement&audience=SUPPLIER'),
    );
    expect(engagement.audience).toBe('SUPPLIER');
  });

  it('serialization preserves unrelated query parameters and omits defaults', () => {
    const existing = params(
      'utm_source=deck&analytics=overview&period=7d&compare=0&token=secret&refresh=secret',
    );
    const filters = parseProductAnalyticsFilters(existing);
    const serialized = serializeProductAnalyticsFilters(filters, existing);
    expect(serialized.get('utm_source')).toBe('deck');
    expect(serialized.get('token')).toBeNull();
    expect(serialized.get('refresh')).toBeNull();
    expect(serialized.get('analytics')).toBe('overview');
    expect(serialized.get('period')).toBe('7d');
    expect(serialized.get('compare')).toBe('0');
    // Defaults stay out of the URL.
    expect(serialized.get('audience')).toBeNull();
    expect(serialized.get('activity')).toBeNull();
  });

  it('derives half-open UTC query instants', () => {
    const custom = filtersToQuery(
      parseProductAnalyticsFilters(params('period=custom&from=2026-06-01&to=2026-06-15')),
    );
    expect(custom.start).toBe('2026-06-01T00:00:00Z');
    // The "to" date is included by ending at the next UTC midnight.
    expect(custom.end).toBe('2026-06-16T00:00:00Z');

    const now = new Date('2026-07-15T10:03:21Z');
    const rolling = filtersToQuery(parseProductAnalyticsFilters(params('period=7d')), now);
    expect(rolling.end).toBe('2026-07-15T10:00:00Z'); // five-minute quantized
    expect(rolling.start).toBe('2026-07-08T10:00:00Z');
  });
});

describe('useProductAnalyticsFilters', () => {
  const wrapper = (initial: string) =>
    function Wrapper({ children }: { children: React.ReactNode }) {
      return <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>;
    };

  it('replaces invalid URL state with canonical defaults', async () => {
    const { result } = renderHook(
      () => ({ hook: useProductAnalyticsFilters(), location: useLocation() }),
      { wrapper: wrapper('/app/admin?analytics=bogus&period=nope&utm_source=deck') },
    );

    await waitFor(() => {
      expect(result.current.location.search).toContain('analytics=overview');
    });
    expect(result.current.location.search).toContain('utm_source=deck');
    expect(result.current.location.search).not.toContain('bogus');
    expect(result.current.hook.filters.tab).toBe('overview');
  });

  it('updates the URL when filters change and keeps foreign params', async () => {
    const { result } = renderHook(
      () => ({ hook: useProductAnalyticsFilters(), location: useLocation() }),
      { wrapper: wrapper('/app/admin?analytics=overview&utm_source=deck') },
    );

    act(() => {
      result.current.hook.update({ tab: 'marketplace', activity: 'ALL' });
    });

    await waitFor(() => {
      expect(result.current.location.search).toContain('analytics=marketplace');
    });
    expect(result.current.location.search).toContain('activity=ALL');
    expect(result.current.location.search).toContain('utm_source=deck');
    expect(result.current.hook.filters.activity).toBe('ALL');
  });
});
