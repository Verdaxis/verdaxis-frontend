import React from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import {
    SPOT_WINDOW,
    formatAvailabilityWindow,
    getAvailabilityWindowOptions,
    normalizeAvailabilityWindow,
} from '../utils/availabilityWindow';
import { MARKET_PRODUCTS } from '../types';
import { VerdaxisSelect } from '../components/ui/VerdaxisSelect';
import { renderWithProviders } from './test-utils';

describe('Availability Windows', () => {
    const VALID_WINDOWS = getAvailabilityWindowOptions({
        now: new Date('2026-04-08T00:00:00Z'),
        timeZone: 'UTC',
        quarterCount: 4,
    });

    it('should start with Spot and current-quarter months', () => {
        expect(VALID_WINDOWS[0]?.value).toBe(SPOT_WINDOW);
        expect(VALID_WINDOWS[1]?.value).toBe('2026-04');
        expect(VALID_WINDOWS[2]?.value).toBe('2026-05');
        expect(VALID_WINDOWS[3]?.value).toBe('2026-06');
    });

    it('should continue with future quarter buckets', () => {
        expect(VALID_WINDOWS.map(option => option.value)).toContain('2026-Q3');
        expect(VALID_WINDOWS.map(option => option.value)).toContain('2026-Q4');
        expect(VALID_WINDOWS.map(option => option.value)).toContain('2027-Q1');
    });

    it('should normalize legacy labels to canonical codes', () => {
        expect(normalizeAvailabilityWindow('Spot')).toBe(SPOT_WINDOW);
        expect(normalizeAvailabilityWindow('Q3 2026')).toBe('2026-Q3');
        expect(normalizeAvailabilityWindow('Forward 2027')).toBe('2027-CAL');
    });

    it('should format canonical codes for display', () => {
        expect(formatAvailabilityWindow(SPOT_WINDOW)).toBe('Spot');
        expect(formatAvailabilityWindow('2026-04')).toBe('Apr 2026');
        expect(formatAvailabilityWindow('2026-Q3')).toBe('Q3 2026');
    });
});

describe('Green Fuels Market Products', () => {
    it('should expose exactly the approved market products', () => {
        expect(MARKET_PRODUCTS).toEqual([
            'BIO_METHANOL',
            'E_METHANOL',
            'BIO_ETHANOL',
            'SYNTHETIC_ETHANOL',
        ]);
    });
});

describe('VerdaxisSelect', () => {
    it('renders a shared select trigger and supports keyboard selection', () => {
        let selected = 'one';
        renderWithProviders(
            React.createElement(VerdaxisSelect, {
                ariaLabel: 'Test select',
                value: selected,
                onChange: (value: string) => {
                    selected = value;
                },
                options: [
                    { value: 'one', label: 'Option One' },
                    { value: 'two', label: 'Option Two' },
                ],
            })
        );

        const trigger = screen.getByRole('combobox', { name: 'Test select' });
        expect(trigger.textContent).toContain('Option One');

        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        fireEvent.keyDown(trigger, { key: 'ArrowDown' });
        fireEvent.keyDown(trigger, { key: 'Enter' });

        expect(selected).toBe('two');
    });
});
