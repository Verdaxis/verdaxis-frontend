import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '../services/api';

describe('admin product usage API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps the backend aggregate into the typed frontend contract', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      behavioral_status: 'available',
      observed_at: '2026-07-14T08:00:00Z',
      days: 30,
      behavioral: {
        visitors: 120,
        visits: 160,
        pageviews: 410,
        total_time_seconds: 32000,
        average_session_duration_seconds: 200,
        event_totals: { signup_started: 24, market_slice_selected: 18 },
        daily_visitors: [{ date: '2026-07-14', value: 5 }],
        top_entries: [{ name: '/en', value: 44 }],
        top_referrers: [{ name: 'linkedin.com', value: 12 }],
      },
      authoritative: { registrations: 8, users_logging_in: 6, order_placing_organizations: 2 },
      funnel: [
        { name: 'visitors', value: 120, conversion_from_previous_pct: null },
        { name: 'signup_started', value: 24, conversion_from_previous_pct: 20 },
      ],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await api.admin.productUsage(30);

    expect(fetchMock.mock.calls[0][0]).toContain('/admin/analytics/product-usage?days=30');
    expect(result).toMatchObject({
      behavioralStatus: 'ready',
      periodDays: 30,
      metrics: { visitors: 120, completedRegistrations: 8 },
      featureUsage: [{ event: 'market_slice_selected', count: 18 }],
      topEntryPages: [{ value: '/en', count: 44 }],
    });
  });
});
