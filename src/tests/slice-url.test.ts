import { describe, expect, it } from 'vitest';

import { MARKET_PRODUCTS } from '../types';
import { APPROVED_TRADING_PORTS } from '../data';
import { parseSlicePath, sliceToPath } from '../utils/sliceUrl';

const segmentsOf = (path: string) => {
  const parts = path.split('/');
  // ['', 'app', 'm', product, port, window]
  return { product: parts[3], port: parts[4], window: parts[5] };
};

describe('slice URL codec', () => {
  const windows = ['SPOT', '2026-07', '2026-Q4', '2026-CAL'];

  it('round-trips every product × approved port × window kind', () => {
    for (const product of MARKET_PRODUCTS) {
      for (const port of APPROVED_TRADING_PORTS) {
        for (const window of windows) {
          const path = sliceToPath({ product, port, window });
          expect(path.startsWith('/app/m/')).toBe(true);
          expect(path).toBe(path.toLowerCase());
          const slugs = segmentsOf(path);
          expect(parseSlicePath(slugs.product, slugs.port, slugs.window)).toEqual({ product, port, window });
        }
      }
    }
  });

  it('encodes canonical lowercase slugs', () => {
    expect(sliceToPath({ product: 'BIO_METHANOL', port: 'Los Angeles', window: 'SPOT' }))
      .toBe('/app/m/bio-methanol/los-angeles/spot');
    expect(sliceToPath({ product: 'E_METHANOL', port: 'Rotterdam', window: '2026-Q4' }))
      .toBe('/app/m/e-methanol/rotterdam/2026-q4');
    expect(sliceToPath({ product: 'SYNTHETIC_ETHANOL', port: 'Singapore', window: '2027-CAL' }))
      .toBe('/app/m/synthetic-ethanol/singapore/2027-cal');
    expect(sliceToPath({ product: 'BIO_ETHANOL', port: 'Busan', window: '2026-07' }))
      .toBe('/app/m/bio-ethanol/busan/2026-07');
  });

  it('parses case-insensitively and returns canonical values', () => {
    expect(parseSlicePath('BIO-METHANOL', 'LOS-ANGELES', 'SPOT'))
      .toEqual({ product: 'BIO_METHANOL', port: 'Los Angeles', window: 'SPOT' });
    expect(parseSlicePath('Bio-Methanol', 'Los-Angeles', 'Spot'))
      .toEqual({ product: 'BIO_METHANOL', port: 'Los Angeles', window: 'SPOT' });
    expect(parseSlicePath('e-methanol', 'rotterdam', '2026-q4'))
      .toEqual({ product: 'E_METHANOL', port: 'Rotterdam', window: '2026-Q4' });
    expect(parseSlicePath('bio-ethanol', 'santos', '2027-cal'))
      .toEqual({ product: 'BIO_ETHANOL', port: 'Santos', window: '2027-CAL' });
  });

  it('rejects products outside the canonical four', () => {
    expect(parseSlicePath('methanol', 'singapore', 'spot')).toBeNull();
    expect(parseSlicePath('bio-diesel', 'singapore', 'spot')).toBeNull();
    expect(parseSlicePath('bio-methanol-x', 'singapore', 'spot')).toBeNull();
    expect(parseSlicePath('', 'singapore', 'spot')).toBeNull();
    expect(parseSlicePath(undefined, 'singapore', 'spot')).toBeNull();
  });

  it('rejects ports outside the approved list without inventing names', () => {
    expect(parseSlicePath('bio-methanol', 'antwerp', 'spot')).toBeNull();
    expect(parseSlicePath('bio-methanol', 'los', 'spot')).toBeNull();
    expect(parseSlicePath('bio-methanol', 'los-angeles-2', 'spot')).toBeNull();
    expect(parseSlicePath('bio-methanol', '', 'spot')).toBeNull();
    expect(parseSlicePath('bio-methanol', undefined, 'spot')).toBeNull();
  });

  it('rejects windows outside the SPOT | YYYY-MM | YYYY-QN | YYYY-CAL grammar', () => {
    const junkWindows = [
      '', 'sp0t', 'spott', '2026', '2026-13', '2026-00', '2026-q5', '2026-q0',
      '2026-cal-x', 'q4-2026', 'forward-2027', '20a6-q4', 'sometime-soon',
    ];
    for (const junk of junkWindows) {
      expect(parseSlicePath('bio-methanol', 'singapore', junk)).toBeNull();
    }
    expect(parseSlicePath('bio-methanol', 'singapore', undefined)).toBeNull();
  });
});
