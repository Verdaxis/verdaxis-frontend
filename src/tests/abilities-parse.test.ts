import { describe, expect, it } from 'vitest';
import { isAbilitiesRouteMissing, parseAbilitiesResponse } from '../services/abilities';
import { ApiError } from '../services/api';
import { abilitiesPayload } from './abilities-fixtures';

describe('parseAbilitiesResponse', () => {
  it('maps every action to allowed, reason code, and reason', () => {
    const parsed = parseAbilitiesResponse(abilitiesPayload({
      place_ask_order: { code: 'SUPPLIER_ROLE_REQUIRED', reason: 'Only supplier accounts can do this.' },
    }));

    expect(parsed?.get('place_bid_order')).toEqual({ allowed: true, reasonCode: null, reason: null });
    expect(parsed?.get('place_ask_order')).toEqual({
      allowed: false,
      reasonCode: 'SUPPLIER_ROLE_REQUIRED',
      reason: 'Only supplier accounts can do this.',
    });
  });

  it.each([
    ['a schema version this client does not know', abilitiesPayload({}, { schema_version: 2 })],
    ['a missing schema version', { abilities: [] }],
    ['an abilities field that is not a list', { schema_version: 1, abilities: {} }],
    ['a body that is not an object', 'oops'],
    ['null', null],
  ])('rejects %s', (_label, body) => {
    expect(parseAbilitiesResponse(body)).toBeNull();
  });

  it('keeps ids and reason codes it has never seen', () => {
    const parsed = parseAbilitiesResponse(abilitiesPayload({}, {
      extraRows: [{ action: 'export_reports', allowed: false, reason_code: 'BRAND_NEW_CODE', reason: 'New text.' }],
    }));

    expect(parsed?.get('export_reports')).toEqual({ allowed: false, reasonCode: 'BRAND_NEW_CODE', reason: 'New text.' });
  });

  it('skips a malformed entry without discarding the others', () => {
    const parsed = parseAbilitiesResponse(abilitiesPayload({}, {
      extraRows: [null, { action: 'cancel_order', allowed: 'yes' }, { allowed: true }, 7],
    }));

    // The valid cancel_order row from the base payload survives; the bad duplicate is ignored.
    expect(parsed?.get('cancel_order')?.allowed).toBe(true);
    expect(parsed?.size).toBe(23);
  });
});

describe('isAbilitiesRouteMissing', () => {
  it('is true for 404 and 405 and false for transient or permission failures', () => {
    expect(isAbilitiesRouteMissing(new ApiError('nf', 404))).toBe(true);
    expect(isAbilitiesRouteMissing(new ApiError('method', 405))).toBe(true);
    expect(isAbilitiesRouteMissing(new ApiError('forbidden', 403))).toBe(false);
    expect(isAbilitiesRouteMissing(new ApiError('boom', 503))).toBe(false);
    expect(isAbilitiesRouteMissing(new TypeError('Failed to fetch'))).toBe(false);
  });
});
