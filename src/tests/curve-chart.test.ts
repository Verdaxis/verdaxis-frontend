import { describe, expect, it } from 'vitest';
import { availabilityWindowToChartTime, serializeChartTime } from '../utils/curveChart';

describe('curveChart helpers', () => {
    it('maps spot and forward windows onto real chart timestamps instead of unix-epoch indexes', () => {
        const now = new Date('2026-04-14T00:00:00Z');

        const spot = availabilityWindowToChartTime('SPOT', now);
        const may = availabilityWindowToChartTime('2026-05', now);
        const q3 = availabilityWindowToChartTime('2026-Q3', now);
        const cal = availabilityWindowToChartTime('2027-CAL', now);

        expect(new Date(spot * 1000).toISOString().slice(0, 10)).toBe('2026-04-14');
        expect(new Date(may * 1000).toISOString().slice(0, 10)).toBe('2026-05-01');
        expect(may).toBeLessThan(q3);
        expect(q3).toBeLessThan(cal);
    });

    it('serializes numeric chart times deterministically for lookup maps', () => {
        const time = availabilityWindowToChartTime('2026-06', new Date('2026-04-14T00:00:00Z'));
        expect(serializeChartTime(time)).toBe(String(time));
    });
});
