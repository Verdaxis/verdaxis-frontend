import {
    CALENDAR_WINDOW_RE,
    MONTH_WINDOW_RE,
    QUARTER_WINDOW_RE,
    compareAvailabilityWindows,
    formatAvailabilityWindowPeriod,
    getAvailabilityWindowOptions,
    normalizeAvailabilityWindow,
} from './availabilityWindow';

export type ForwardCurveHorizon = '1Y' | '3Y' | 'All';

export function getForwardCurveHorizon(
    windows: string[],
    horizon: ForwardCurveHorizon,
    now = new Date(),
): string[] {
    if (horizon === 'All') return windows;
    const options = getAvailabilityWindowOptions({ now, quarterCount: horizon === '1Y' ? 4 : 12 });
    const lastWindow = options[options.length - 1].value;
    return windows.filter(window => compareAvailabilityWindows(window, lastWindow) <= 0);
}

type CurveTick = { index: number; label: string; year?: string; width: number };

// Conservative text widths for the console's fixed 12px monospace ticks.
// CJK glyphs take a full em; leave 12px clear between adjacent labels.
const textWidth = (text: string) => Array.from(text).reduce(
    (width, character) => width + (character.charCodeAt(0) > 255 ? 12 : 7.5), 0,
);

export function getForwardCurveTicks(
    windows: string[],
    horizon: ForwardCurveHorizon,
    plotWidth: number,
    locale: string,
): CurveTick[] {
    const yearly = horizon === 'All' && windows.length > 8;
    const candidates: CurveTick[] = [];
    let previousYear: string | undefined;

    windows.forEach((window, index) => {
        const normalized = normalizeAvailabilityWindow(window);
        const month = normalized.match(MONTH_WINDOW_RE)?.groups;
        const quarter = normalized.match(QUARTER_WINDOW_RE)?.groups;
        const calendar = normalized.match(CALENDAR_WINDOW_RE)?.groups;
        const year = month?.year ?? quarter?.year ?? calendar?.year;
        if (yearly && year && year === previousYear) return;
        previousYear = year;

        let label = formatAvailabilityWindowPeriod(normalized, locale);
        if (yearly && year) {
            label = year;
        } else if (quarter) {
            label = `Q${quarter.quarter}`;
        } else if (month) {
            label = new Intl.DateTimeFormat(locale.startsWith('zh') ? 'zh-CN' : locale, {
                month: 'short', timeZone: 'UTC',
            }).format(new Date(Date.UTC(Number(month.year), Number(month.month) - 1, 1))).toUpperCase();
        } else if (calendar) {
            label = locale.startsWith('zh') ? '全年' : 'CAL';
        }
        const secondaryYear = yearly ? undefined : year;
        candidates.push({
            index,
            label,
            year: secondaryYear,
            width: Math.max(textWidth(label), textWidth(secondaryYear ?? '')),
        });
    });

    const ticks: CurveTick[] = [];
    const step = plotWidth / Math.max(windows.length - 1, 1);
    const fits = (previous: CurveTick, next: CurveTick) => (
        (next.index - previous.index) * step >= (previous.width + next.width) / 2 + 12
    );
    candidates.forEach((candidate, index) => {
        // Keep the far end identified; remove a conflicting penultimate label.
        if (index === candidates.length - 1) {
            while (ticks.length > 1 && !fits(ticks[ticks.length - 1], candidate)) ticks.pop();
        }
        if (ticks.length === 0 || fits(ticks[ticks.length - 1], candidate)) ticks.push(candidate);
    });
    return ticks;
}
