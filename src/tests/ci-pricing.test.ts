import { describe, it, expect } from 'vitest';

describe('CIAdjustedPrice type', () => {
    it('should represent compliance-adjusted fuel pricing', () => {
        const ci: import('../types').CIAdjustedPrice = {
            base_price_per_mt: 540,
            carbon_intensity_gco2_mj: 15.3,
            fueleu_ghg_intensity: 91.0,
            compliance_cost_per_mt: -105.77,
            effective_price_per_mt: 434.23,
            ghg_reduction_pct: 83.5,
        };
        expect(ci.effective_price_per_mt).toBeLessThan(ci.base_price_per_mt);
        expect(ci.ghg_reduction_pct).toBeGreaterThan(0);
    });
});
