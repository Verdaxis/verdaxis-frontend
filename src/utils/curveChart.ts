import type { Time, UTCTimestamp } from 'lightweight-charts';
import { normalizeAvailabilityWindow } from './availabilityWindow';

const MONTH_WINDOW_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
const QUARTER_WINDOW_RE = /^(\d{4})-Q([1-4])$/;
const CALENDAR_WINDOW_RE = /^(\d{4})-CAL$/;

const DAY_SECONDS = 24 * 60 * 60;

const toUtcTimestamp = (date: Date): UTCTimestamp => Math.floor(date.getTime() / 1000) as UTCTimestamp;

export const serializeChartTime = (time: Time): string => {
    if (typeof time === 'number') return String(time);
    if (typeof time === 'string') return time;
    return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
};

export const availabilityWindowToChartTime = (
    availabilityWindow: string,
    now: Date = new Date(),
): UTCTimestamp => {
    const normalizedWindow = normalizeAvailabilityWindow(availabilityWindow);

    if (normalizedWindow === 'SPOT') {
        return toUtcTimestamp(new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0,
            0,
            0,
        )));
    }

    const monthMatch = normalizedWindow.match(MONTH_WINDOW_RE);
    if (monthMatch) {
        return toUtcTimestamp(new Date(Date.UTC(
            Number(monthMatch[1]),
            Number(monthMatch[2]) - 1,
            1,
            0,
            0,
            0,
        )));
    }

    const quarterMatch = normalizedWindow.match(QUARTER_WINDOW_RE);
    if (quarterMatch) {
        const quarterStartMonth = (Number(quarterMatch[2]) - 1) * 3;
        const quarterStart = new Date(Date.UTC(
            Number(quarterMatch[1]),
            quarterStartMonth,
            1,
            0,
            0,
            0,
        ));
        return (toUtcTimestamp(quarterStart) + (7 * DAY_SECONDS)) as UTCTimestamp;
    }

    const calendarMatch = normalizedWindow.match(CALENDAR_WINDOW_RE);
    if (calendarMatch) {
        const calendarStart = new Date(Date.UTC(
            Number(calendarMatch[1]),
            0,
            1,
            0,
            0,
            0,
        ));
        return (toUtcTimestamp(calendarStart) + (14 * DAY_SECONDS)) as UTCTimestamp;
    }

    return toUtcTimestamp(new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
    )));
};
