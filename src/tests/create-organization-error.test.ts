import { describe, expect, it } from 'vitest';
import {
  CREATE_ORGANIZATION_ORG_TYPES,
  formatApiErrorDetail,
  organizationTypesForRole,
} from '../pages/CreateOrganizationPage';

describe('formatApiErrorDetail', () => {
  it('uses FastAPI validation messages instead of returning objects', () => {
    expect(
      formatApiErrorDetail(
        {
          type: 'value_error',
          loc: ['body', 'organization', 'country_code'],
          msg: 'Country code must be a valid ISO 3166-1 alpha-2 code',
          input: 'CH',
          ctx: { error: 'invalid country' },
        },
        'Failed to create organization',
      ),
    ).toBe('Country code must be a valid ISO 3166-1 alpha-2 code');
  });

  it('joins array validation details into a renderable message', () => {
    expect(
      formatApiErrorDetail(
        [
          { msg: 'Organization name is required' },
          { msg: 'Country is required' },
        ],
        'Failed to create organization',
      ),
    ).toBe('Organization name is required Country is required');
  });

  it('falls back for unknown error shapes', () => {
    expect(formatApiErrorDetail({ detail: { nested: true } }, 'Failed')).toBe('Failed');
  });
});

describe('CREATE_ORGANIZATION_ORG_TYPES', () => {
  it('shows only clearly buy-side or sell-side organization types', () => {
    expect(CREATE_ORGANIZATION_ORG_TYPES.map(({ value, side }) => ({ value, side }))).toEqual([
      { value: 'SHIPPING_LINE', side: 'BUYER' },
      { value: 'SHIP_MANAGER', side: 'BUYER' },
      { value: 'FUEL_BUYER', side: 'BUYER' },
      { value: 'CHARTERER', side: 'BUYER' },
      { value: 'FUEL_SUPPLIER', side: 'SELLER' },
    ]);
  });

  it('offers only organization types matching the selected account side', () => {
    expect(organizationTypesForRole('SUPPLIER').map(({ value }) => value)).toEqual(['FUEL_SUPPLIER']);
    expect(organizationTypesForRole('BUYER').map(({ value }) => value)).toEqual([
      'SHIPPING_LINE',
      'SHIP_MANAGER',
      'FUEL_BUYER',
      'CHARTERER',
    ]);
  });
});
