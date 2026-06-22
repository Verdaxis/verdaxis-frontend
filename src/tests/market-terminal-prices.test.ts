import { describe, it, expect } from 'vitest';
import { getTerminalFuelType } from '../components/MarketTerminal';
import { APPROVED_TRADING_PORTS } from '../data';

describe('MarketTerminal trading taxonomy', () => {
    it('maps canonical market products back to the underlying terminal fuel family', () => {
        expect(getTerminalFuelType('BIO_METHANOL')).toBe('Methanol');
        expect(getTerminalFuelType('E_METHANOL')).toBe('Methanol');
        expect(getTerminalFuelType('BIO_ETHANOL')).toBe('Ethanol');
        expect(getTerminalFuelType('SYNTHETIC_ETHANOL')).toBe('Ethanol');
    });

    it('uses the approved trading port set for terminal selectors', () => {
        expect(APPROVED_TRADING_PORTS).toEqual(['Dalian', 'Busan', 'Shanghai', 'Singapore', 'Rotterdam', 'Houston', 'Los Angeles', 'Santos']);
    });
});
