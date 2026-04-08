/**
 * Tests for new features: vessel data mapping, trade route building,
 * availability windows, and market terminal data derivation.
 */
import { describe, it, expect } from 'vitest';
import {
    SPOT_WINDOW,
    formatAvailabilityWindow,
    getAvailabilityWindowOptions,
    normalizeAvailabilityWindow,
} from '../utils/availabilityWindow';
import { MARKET_PRODUCTS } from '../types';

// -------- Vessel API Mapping --------
describe('Vessel API Data Mapping', () => {
    const VOYAGE_DATA: Record<string, { status: string; nextVoyage: string; nextDryDock: string }> = {
        '9919475': { status: 'At Sea', nextVoyage: 'Colombo → Rotterdam (ETA: 12 Days)', nextDryDock: 'Mar 2027' },
        '9919528': { status: 'In Port', nextVoyage: 'Hamburg → Gothenburg (Dep: Tomorrow)', nextDryDock: 'Apr 2027' },
    };

    const mapVessel = (v: any) => {
        const meta = VOYAGE_DATA[v.imo_number] || { status: 'At Sea', nextVoyage: 'En route', nextDryDock: 'TBD' };
        return {
            id: v.id,
            name: v.name,
            imo: v.imo_number,
            vesselType: v.vessel_type,
            status: meta.status,
            complianceEUETS: v.eu_ets_status || 'Non-Compliant',
            complianceFuelEU: v.fueleu_status || 'Non-Compliant',
            ciiGrade: v.cii_rating || 'C',
            nextVoyage: meta.nextVoyage,
            nextDryDock: meta.nextDryDock,
            location: v.lat && v.lng ? { lat: v.lat, lng: v.lng } : undefined,
            previousLocation: v.prev_lat && v.prev_lng ? { lat: v.prev_lat, lng: v.prev_lng } : undefined,
        };
    };

    it('should map backend imo_number to frontend imo', () => {
        const result = mapVessel({ id: '1', name: 'Test', imo_number: '9919475', vessel_type: 'Tanker', eu_ets_status: 'Compliant', fueleu_status: 'Compliant', cii_rating: 'A', lat: 5, lng: 72, prev_lat: 4, prev_lng: 68 });
        expect(result.imo).toBe('9919475');
    });

    it('should map cii_rating to ciiGrade', () => {
        const result = mapVessel({ id: '1', name: 'Test', imo_number: '9919475', vessel_type: 'Tanker', cii_rating: 'B', eu_ets_status: 'Compliant', fueleu_status: 'Compliant', lat: 5, lng: 72, prev_lat: 4, prev_lng: 68 });
        expect(result.ciiGrade).toBe('B');
    });

    it('should default ciiGrade to C when missing', () => {
        const result = mapVessel({ id: '1', name: 'Test', imo_number: '0000000', vessel_type: 'Tanker', lat: 5, lng: 72, prev_lat: 4, prev_lng: 68 });
        expect(result.ciiGrade).toBe('C');
    });

    it('should use voyage metadata for known IMOs', () => {
        const result = mapVessel({ id: '1', name: 'Maersk Kotka', imo_number: '9919528', vessel_type: 'Container Ship', eu_ets_status: 'Compliant', fueleu_status: 'Compliant', cii_rating: 'A', lat: 53.55, lng: 9.99, prev_lat: 53.55, prev_lng: 9.99 });
        expect(result.status).toBe('In Port');
        expect(result.nextVoyage).toContain('Hamburg');
    });

    it('should fallback for unknown IMOs', () => {
        const result = mapVessel({ id: '1', name: 'Unknown', imo_number: '0000001', vessel_type: 'Tanker', eu_ets_status: 'Compliant', fueleu_status: 'Compliant', cii_rating: 'A', lat: 0, lng: 0, prev_lat: 0, prev_lng: 0 });
        expect(result.status).toBe('At Sea');
        expect(result.nextVoyage).toBe('En route');
    });

    it('should handle missing location gracefully', () => {
        const result = mapVessel({ id: '1', name: 'Test', imo_number: '9919475', vessel_type: 'Tanker', eu_ets_status: 'Compliant', fueleu_status: 'Compliant', cii_rating: 'A', lat: null, lng: null, prev_lat: null, prev_lng: null });
        expect(result.location).toBeUndefined();
        expect(result.previousLocation).toBeUndefined();
    });
});

// -------- Trade Route Building --------
describe('Dynamic Trade Route Building', () => {
    interface Port {
        name: string;
        location: { lat: number; lng: number };
    }

    const buildTradeRoutes = (ports: Port[]) => {
        if (ports.length < 2) return [];
        const findPort = (name: string) => ports.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
        const routeDefs = [
            { from: 'Singapore', to: 'Rotterdam', label: 'Main Trunk' },
            { from: 'Houston', to: 'Rotterdam', label: 'Atlantic' },
        ];
        return routeDefs
            .map(r => {
                const origin = findPort(r.from);
                const dest = findPort(r.to);
                if (!origin || !dest) return null;
                return {
                    positions: [[origin.location.lat, origin.location.lng], [dest.location.lat, dest.location.lng]],
                    label: `${origin.name} to ${dest.name} (${r.label})`,
                };
            })
            .filter(Boolean);
    };

    it('should build routes from matching ports', () => {
        const ports: Port[] = [
            { name: 'Singapore', location: { lat: 1.29, lng: 103.85 } },
            { name: 'Rotterdam', location: { lat: 51.92, lng: 4.48 } },
        ];
        const routes = buildTradeRoutes(ports);
        expect(routes).toHaveLength(1);
        expect(routes[0]!.label).toContain('Singapore to Rotterdam');
    });

    it('should skip routes when ports are missing', () => {
        const ports: Port[] = [
            { name: 'Singapore', location: { lat: 1.29, lng: 103.85 } },
        ];
        const routes = buildTradeRoutes(ports);
        expect(routes).toHaveLength(0);
    });

    it('should return empty for empty ports', () => {
        expect(buildTradeRoutes([])).toHaveLength(0);
    });

    it('should use port coordinates in route positions', () => {
        const ports: Port[] = [
            { name: 'Singapore', location: { lat: 1.29, lng: 103.85 } },
            { name: 'Rotterdam', location: { lat: 51.92, lng: 4.48 } },
        ];
        const routes = buildTradeRoutes(ports);
        expect(routes[0]!.positions[0]).toEqual([1.29, 103.85]);
        expect(routes[0]!.positions[1]).toEqual([51.92, 4.48]);
    });
});

// -------- Availability Windows --------
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

// -------- Green Fuels Contract --------
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

// -------- Forward Curve Derivation --------
describe('Forward Curve Derivation', () => {
    const deriveForwardCurves = (ports: { name: string; priceTrend: number; priceMethanol: number }[]) => {
        return ports.slice(0, 2).map(p => ({
            label: `Methanol (${p.name.substring(0, 3).toUpperCase()})`,
            change: p.priceTrend >= 0 ? `+${p.priceTrend.toFixed(1)}%` : `${p.priceTrend.toFixed(1)}%`,
            up: p.priceTrend >= 0,
            price: `$${p.priceMethanol}`,
            curve: p.priceTrend >= 0 ? 'Contango' : 'Backwardation',
        }));
    };

    it('should derive contango for positive trend', () => {
        const result = deriveForwardCurves([{ name: 'Rotterdam', priceTrend: 2.4, priceMethanol: 545 }]);
        expect(result[0].curve).toBe('Contango');
        expect(result[0].up).toBe(true);
        expect(result[0].change).toBe('+2.4%');
    });

    it('should derive backwardation for negative trend', () => {
        const result = deriveForwardCurves([{ name: 'Singapore', priceTrend: -0.8, priceMethanol: 780 }]);
        expect(result[0].curve).toBe('Backwardation');
        expect(result[0].up).toBe(false);
        expect(result[0].change).toBe('-0.8%');
    });

    it('should truncate port name to 3 chars and uppercase', () => {
        const result = deriveForwardCurves([{ name: 'Rotterdam', priceTrend: 0, priceMethanol: 500 }]);
        expect(result[0].label).toBe('Methanol (ROT)');
    });

    it('should limit to 2 ports maximum', () => {
        const ports = [
            { name: 'A', priceTrend: 1, priceMethanol: 100 },
            { name: 'B', priceTrend: 2, priceMethanol: 200 },
            { name: 'C', priceTrend: 3, priceMethanol: 300 },
        ];
        expect(deriveForwardCurves(ports)).toHaveLength(2);
    });
});

// -------- Fleet Alert Logic --------
describe('Fleet Alert Derivation', () => {
    interface Vessel {
        name: string;
        complianceFuelEU: string;
        complianceEUETS: string;
        ciiGrade: string;
    }

    const findAtRiskVessel = (vessels: Vessel[]) => {
        return vessels.find(v =>
            v.complianceFuelEU === 'Non-Compliant' || v.complianceFuelEU === 'Warning' ||
            v.complianceEUETS === 'Non-Compliant' || v.complianceEUETS === 'Warning'
        );
    };

    it('should find Non-Compliant FuelEU vessel', () => {
        const vessels: Vessel[] = [
            { name: 'Maersk Edmonton', complianceFuelEU: 'Compliant', complianceEUETS: 'Compliant', ciiGrade: 'A' },
            { name: 'Maersk Saltoro', complianceFuelEU: 'Non-Compliant', complianceEUETS: 'Warning', ciiGrade: 'D' },
        ];
        const result = findAtRiskVessel(vessels);
        expect(result).toBeDefined();
        expect(result!.name).toBe('Maersk Saltoro');
    });

    it('should return undefined when all compliant', () => {
        const vessels: Vessel[] = [
            { name: 'Maersk Edmonton', complianceFuelEU: 'Compliant', complianceEUETS: 'Compliant', ciiGrade: 'A' },
        ];
        expect(findAtRiskVessel(vessels)).toBeUndefined();
    });

    it('should detect Warning EU ETS status', () => {
        const vessels: Vessel[] = [
            { name: 'Maersk Hangzhou', complianceFuelEU: 'Compliant', complianceEUETS: 'Warning', ciiGrade: 'C' },
        ];
        const result = findAtRiskVessel(vessels);
        expect(result).toBeDefined();
        expect(result!.name).toBe('Maersk Hangzhou');
    });
});
