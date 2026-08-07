export const SPOT_WINDOW = 'SPOT';

export const MONTH_WINDOW_RE = /^(?<year>\d{4})-(?<month>0[1-9]|1[0-2])$/;
export const QUARTER_WINDOW_RE = /^(?<year>\d{4})-Q(?<quarter>[1-4])$/;
export const CALENDAR_WINDOW_RE = /^(?<year>\d{4})-CAL$/;

const LEGACY_WINDOW_ALIASES: Record<string, string> = {
    SPOT: SPOT_WINDOW,
    Spot: SPOT_WINDOW,
    Q1_2025: '2025-Q1',
    Q2_2025: '2025-Q2',
    Q3_2025: '2025-Q3',
    Q4_2025: '2025-Q4',
    Q1_2026: '2026-Q1',
    Q2_2026: '2026-Q2',
    Q3_2026: '2026-Q3',
    Q4_2026: '2026-Q4',
    'Q1 2025': '2025-Q1',
    'Q2 2025': '2025-Q2',
    'Q3 2025': '2025-Q3',
    'Q4 2025': '2025-Q4',
    'Q1 2026': '2026-Q1',
    'Q2 2026': '2026-Q2',
    'Q3 2026': '2026-Q3',
    'Q4 2026': '2026-Q4',
    FORWARD_2027: '2027-CAL',
    FORWARD_2028: '2028-CAL',
    FORWARD_2029: '2029-CAL',
    FORWARD_2030: '2030-CAL',
    'Forward 2027': '2027-CAL',
    'Forward 2028': '2028-CAL',
    'Forward 2029': '2029-CAL',
    'Forward 2030': '2030-CAL',
};

export interface AvailabilityWindowOption {
    value: string;
    label: string;
    summaryLabel: string;
    kind: 'spot' | 'month' | 'quarter' | 'calendar';
}

function normalizedLocale(locale = 'en'): string {
    return locale.toLowerCase().startsWith('zh') ? 'zh-CN' : locale;
}

function spotLabel(locale = 'en'): string {
    return normalizedLocale(locale) === 'zh-CN' ? '现货' : 'Spot';
}

function monthLabel(year: number, month: number, locale = 'en'): string {
    return new Intl.DateTimeFormat(normalizedLocale(locale), {
        year: 'numeric',
        month: 'short',
        timeZone: 'UTC',
    }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getZonedYearMonth(now: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
    }).formatToParts(now);

    const year = Number(parts.find(part => part.type === 'year')?.value ?? now.getUTCFullYear());
    const month = Number(parts.find(part => part.type === 'month')?.value ?? now.getUTCMonth() + 1);
    return { year, month };
}

function getQuarter(month: number) {
    return Math.floor((month - 1) / 3) + 1;
}

function padMonth(month: number) {
    return String(month).padStart(2, '0');
}

function quarterStartMonth(quarter: number) {
    return ((quarter - 1) * 3) + 1;
}

function parseWindow(value: string) {
    const normalized = normalizeAvailabilityWindow(value);
    if (normalized === SPOT_WINDOW) {
        return { normalized, kind: 'spot' as const };
    }

    const monthMatch = normalized.match(MONTH_WINDOW_RE);
    if (monthMatch?.groups) {
        return {
            normalized,
            kind: 'month' as const,
            year: Number(monthMatch.groups.year),
            month: Number(monthMatch.groups.month),
        };
    }

    const quarterMatch = normalized.match(QUARTER_WINDOW_RE);
    if (quarterMatch?.groups) {
        return {
            normalized,
            kind: 'quarter' as const,
            year: Number(quarterMatch.groups.year),
            quarter: Number(quarterMatch.groups.quarter),
        };
    }

    const calendarMatch = normalized.match(CALENDAR_WINDOW_RE);
    if (calendarMatch?.groups) {
        return {
            normalized,
            kind: 'calendar' as const,
            year: Number(calendarMatch.groups.year),
        };
    }

    return { normalized, kind: 'calendar' as const, year: Number.MAX_SAFE_INTEGER };
}

export function normalizeAvailabilityWindow(value: string | null | undefined): string {
    if (!value) return SPOT_WINDOW;

    const trimmed = value.trim();
    if (!trimmed) return SPOT_WINDOW;

    if (LEGACY_WINDOW_ALIASES[trimmed]) {
        return LEGACY_WINDOW_ALIASES[trimmed];
    }

    if (
        trimmed === SPOT_WINDOW ||
        MONTH_WINDOW_RE.test(trimmed) ||
        QUARTER_WINDOW_RE.test(trimmed) ||
        CALENDAR_WINDOW_RE.test(trimmed)
    ) {
        return trimmed;
    }

    return trimmed;
}

export function compareAvailabilityWindows(left: string, right: string): number {
    const a = parseWindow(left);
    const b = parseWindow(right);

    const rank = (item: ReturnType<typeof parseWindow>) => {
        if (item.kind === 'spot') return [0, 0, 0, 0];
        if (item.kind === 'month') return [1, item.year, item.month, 0];
        if (item.kind === 'quarter') return [1, item.year, quarterStartMonth(item.quarter), 1];
        return [1, item.year, 1, 2];
    };

    const aRank = rank(a);
    const bRank = rank(b);
    for (let index = 0; index < aRank.length; index += 1) {
        if (aRank[index] !== bRank[index]) {
            return aRank[index] - bRank[index];
        }
    }
    return 0;
}

export function formatAvailabilityWindow(value: string | null | undefined, locale = 'en'): string {
    const parsed = parseWindow(value ?? SPOT_WINDOW);
    const isChinese = normalizedLocale(locale) === 'zh-CN';
    if (parsed.kind === 'spot') return spotLabel(locale);
    if (parsed.kind === 'month') return monthLabel(parsed.year, parsed.month, locale);
    if (parsed.kind === 'quarter') {
        return isChinese ? `${parsed.year}年第${parsed.quarter}季度` : `Q${parsed.quarter} ${parsed.year}`;
    }
    if (isChinese) return `${parsed.year}年`;
    return `CAL ${parsed.year}`;
}

export function formatAvailabilityWindowPeriod(value: string | null | undefined, locale = 'en'): string {
    const parsed = parseWindow(value ?? SPOT_WINDOW);
    if (parsed.kind === 'spot') return normalizedLocale(locale) === 'zh-CN' ? '现货' : 'SPOT';
    if (parsed.kind === 'month') {
        const month = new Intl.DateTimeFormat(normalizedLocale(locale), {
            month: 'short',
            timeZone: 'UTC',
        }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, 1)));
        return normalizedLocale(locale) === 'zh-CN' ? `${String(parsed.year).slice(-2)}年${month}` : `${month.toUpperCase()} ${String(parsed.year).slice(-2)}`;
    }
    if (parsed.kind === 'quarter') {
        return normalizedLocale(locale) === 'zh-CN'
            ? `${String(parsed.year).slice(-2)}年第${parsed.quarter}季度`
            : `Q${parsed.quarter} ${String(parsed.year).slice(-2)}`;
    }
    return normalizedLocale(locale) === 'zh-CN' ? `${parsed.year}年` : `CAL ${String(parsed.year).slice(-2)}`;
}

export function getAvailabilityWindowOptions(options?: {
    now?: Date;
    timeZone?: string;
    quarterCount?: number;
    locale?: string;
}): AvailabilityWindowOption[] {
    const now = options?.now ?? new Date();
    const timeZone = options?.timeZone ?? 'UTC';
    const quarterCount = options?.quarterCount ?? 8;
    const locale = options?.locale ?? 'en';
    const { year, month } = getZonedYearMonth(now, timeZone);
    const currentQuarter = getQuarter(month);
    const currentQuarterEndMonth = currentQuarter * 3;

    const result: AvailabilityWindowOption[] = [
        { value: SPOT_WINDOW, label: spotLabel(locale), summaryLabel: spotLabel(locale), kind: 'spot' },
    ];

    for (let currentMonth = month; currentMonth <= currentQuarterEndMonth; currentMonth += 1) {
        const offset = currentMonth - month;
        const value = `${year}-${padMonth(currentMonth)}`;
        const relative = offset === 0 ? 'M' : `M+${offset}`;
        result.push({
            value,
            label: `${relative} (${monthLabel(year, currentMonth, locale)})`,
            summaryLabel: relative,
            kind: 'month',
        });
    }

    for (let index = 0; index < quarterCount; index += 1) {
        const absoluteQuarter = (year * 4) + (currentQuarter - 1) + 1 + index;
        const quarterYear = Math.floor(absoluteQuarter / 4);
        const quarter = (absoluteQuarter % 4) + 1;
        result.push({
            value: `${quarterYear}-Q${quarter}`,
            label: formatAvailabilityWindow(`${quarterYear}-Q${quarter}`, locale),
            summaryLabel: formatAvailabilityWindow(`${quarterYear}-Q${quarter}`, locale),
            kind: 'quarter',
        });
    }

    return result;
}

export function getAvailabilityWindowSummary(
    value: string | null | undefined,
    options?: AvailabilityWindowOption[],
    locale = 'en',
) {
    const normalized = normalizeAvailabilityWindow(value);
    const match = options?.find(option => option.value === normalized);
    return match?.summaryLabel ?? formatAvailabilityWindow(normalized, locale);
}
