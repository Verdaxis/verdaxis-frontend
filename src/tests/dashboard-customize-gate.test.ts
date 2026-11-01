import { describe, expect, it } from 'vitest';

import { dashboardCustomizeEnabled } from '../hooks/useDashboardLayout';

describe('dashboardCustomizeEnabled', () => {
  it('is off in production builds until the backend can save layouts there', () => {
    expect(dashboardCustomizeEnabled('production')).toBe(false);
  });

  it('is on in staging, development and test builds', () => {
    expect(dashboardCustomizeEnabled('staging')).toBe(true);
    expect(dashboardCustomizeEnabled('development')).toBe(true);
    expect(dashboardCustomizeEnabled('test')).toBe(true);
  });
});
