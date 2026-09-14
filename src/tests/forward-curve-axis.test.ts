import { describe, expect, it } from 'vitest';
import { getAvailabilityWindowOptions } from '../utils/availabilityWindow';
import { getForwardCurveHorizon, getForwardCurveTicks } from '../utils/forwardCurveAxis';

const now = new Date('2026-09-14T12:00:00Z');
const windows = getAvailabilityWindowOptions({ now }).map(option => option.value);

describe('forward curve axis', () => {
  it('uses calendar horizons instead of counting populated data points', () => {
    expect(getForwardCurveHorizon(windows, '1Y', now)).toEqual([
      'SPOT', '2026-09', '2026-Q4', '2027-Q1', '2027-Q2', '2027-Q3',
    ]);
    expect(getForwardCurveHorizon(windows, '3Y', now).at(-1)).toBe('2029-Q3');
    expect(getForwardCurveHorizon(windows, 'All', now)).toEqual(windows);
    expect(windows.at(-1)).toBe('2031-Q3');
    expect(getForwardCurveHorizon(['SPOT', '2031-Q1'], '1Y', now)).toEqual(['SPOT']);
  });

  it('labels long curves by year while retaining every underlying period', () => {
    const ticks = getForwardCurveTicks(windows, 'All', 750, 'en');
    expect(ticks[0].label).toBe('SPOT');
    expect(ticks.at(-1)?.label).toBe('2031');
    expect(ticks.filter(tick => tick.label === '2028')).toHaveLength(1);
    expect(ticks.length).toBeLessThan(windows.length);
    expect(ticks.every(tick => tick.label === 'SPOT' || /^20\d{2}$/.test(tick.label))).toBe(true);
  });

  it.each(['en', 'zh'])('keeps ticks separated at narrow widths in %s', locale => {
    for (const width of [240, 380, 550, 900]) {
      for (const horizon of ['1Y', '3Y', 'All'] as const) {
        const visible = getForwardCurveHorizon(windows, horizon, now);
        const ticks = getForwardCurveTicks(visible, horizon, width, locale);
        for (let index = 1; index < ticks.length; index++) {
          const previous = ticks[index - 1];
          const current = ticks[index];
          const distance = (current.index - previous.index) * width / (visible.length - 1);
          expect(distance - (current.width + previous.width) / 2).toBeGreaterThanOrEqual(12);
        }
      }
    }
  });

  it('uses detailed localized month and quarter labels for shorter ranges', () => {
    const visible = getForwardCurveHorizon(windows, '1Y', now);
    const english = getForwardCurveTicks(visible, '1Y', 750, 'en');
    expect(english).toHaveLength(visible.length);
    expect(english[1]).toMatchObject({ label: 'SEP', year: '2026' });
    expect(english[2]).toMatchObject({ label: 'Q4', year: '2026' });
    const chinese = getForwardCurveTicks(visible, '1Y', 750, 'zh');
    expect(chinese[0].label).toBe('现货');
    expect(chinese[1]).toMatchObject({ label: '9月', year: '2026' });
  });

  it('handles empty, single-period and year-rollover curves', () => {
    expect(getForwardCurveTicks([], 'All', 400, 'en')).toEqual([]);
    expect(getForwardCurveTicks(['2031-Q3'], 'All', 400, 'en')).toMatchObject([
      { index: 0, label: 'Q3', year: '2031' },
    ]);
    const january = new Date('2027-01-01T00:00:00Z');
    const ladder = getAvailabilityWindowOptions({ now: january }).map(option => option.value);
    expect(getForwardCurveHorizon(ladder, '1Y', january).at(-1)).toBe('2028-Q1');
  });
});
