import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker, Popup, Tooltip as LTooltip } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Ship, Anchor, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Vessel } from '../../types';
import { calculateHeading } from '../../utils';
import { useNamespace } from '../../hooks/useNamespace';

const MapTooltip = LTooltip as any;

// Derive fuel capability from vesselType string
const getVesselFuelCapability = (vesselType: string): 'dual-fuel' | 'lng' | 'conventional' => {
    const vt = (vesselType || '').toLowerCase();
    if (vt.includes('methanol') || vt.includes('dual') || vt.includes('ammonia') || vt.includes('green')) {
        return 'dual-fuel';
    }
    if (vt.includes('lng')) {
        return 'lng';
    }
    return 'conventional';
};

const FUEL_CAPABILITY_COLORS: Record<string, string> = {
    'dual-fuel': '#10B981', // Green
    'lng': '#3B82F6',       // Blue
    'conventional': '#94A3B8', // Gray
};

const FUEL_CAPABILITY_LABELS: Record<string, string> = {
    'dual-fuel': 'Dual-Fuel / Green',
    'lng': 'LNG',
    'conventional': 'Conventional',
};

const createVesselIcon = (vessel: Vessel) => {
    const fuelCap = getVesselFuelCapability(vessel.vesselType);
    const color = FUEL_CAPABILITY_COLORS[fuelCap] || '#94A3B8';
    const heading = calculateHeading(vessel.previousLocation, vessel.location);

    // Chevron arrow pointing up — rotated by heading
    const svgMarkup = `<svg viewBox="0 0 16 16" width="14" height="14" style="transform:rotate(${heading}deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6))"><polygon points="8,1 14,13 8,10 2,13" fill="${color}" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/></svg>`;

    return divIcon({
        html: svgMarkup,
        className: 'bg-transparent border-0',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
};

export const VesselMarkers: React.FC = () => {
    const { t, ready } = useNamespace('dashboard');
    const [vessels, setVessels] = React.useState<Vessel[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchVessels = async () => {
            try {
                const data = await api.vessels.list();
                setVessels(data);
            } catch (e) {
                console.error("VesselMarkers: Error fetching vessels", e);
            } finally {
                setLoading(false);
            }
        };
        fetchVessels();
    }, []);

    if (loading || !ready) return null;

    return (
        <>
            {vessels.map((vessel) => (
                vessel.location && (
                    <Marker 
                        key={vessel.id}
                        position={[vessel.location.lat, vessel.location.lng]}
                        icon={createVesselIcon(vessel)}
                    >
                        <MapTooltip direction="top" offset={[0, -8]} opacity={1}>
                            <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {vessel.name}
                                <div className="text-[10px] text-slate-500 font-normal">
                                    {FUEL_CAPABILITY_LABELS[getVesselFuelCapability(vessel.vesselType)] || vessel.vesselType}
                                    {vessel.ciiGrade && (
                                        <span className={`ml-1.5 font-bold ${
                                            ['A','B'].includes(vessel.ciiGrade) ? 'text-emerald-500' :
                                            ['C'].includes(vessel.ciiGrade) ? 'text-amber-500' : 'text-red-500'
                                        }`}>CII {vessel.ciiGrade}</span>
                                    )}
                                </div>
                            </div>
                        </MapTooltip>
                        <Popup className="verdaxis-popup-vessel" closeButton={false}>
                            <div className="p-1 min-w-[200px]">
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                                    <Ship size={16} className="text-blue-400" />
                                    <div>
                                        <h3 className="font-bold text-sm text-slate-200 leading-tight">{vessel.name}</h3>
                                        <span className="text-[10px] text-slate-400">{vessel.vesselType}</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5 mb-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">{t('vesselPopup.voyage')}</span>
                                        <span className="text-slate-300 font-medium text-right max-w-[120px] truncate">{vessel.nextVoyage}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">{t('vesselPopup.ciiGrade')}</span>
                                        <span className={`font-bold ${
                                            ['A','B'].includes(vessel.ciiGrade) ? 'text-emerald-400' :
                                            ['C'].includes(vessel.ciiGrade) ? 'text-amber-400' : 'text-red-400'
                                        }`}>{vessel.ciiGrade}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Fuel</span>
                                        <span className="font-medium" style={{ color: FUEL_CAPABILITY_COLORS[getVesselFuelCapability(vessel.vesselType)] }}>
                                            {FUEL_CAPABILITY_LABELS[getVesselFuelCapability(vessel.vesselType)]}
                                        </span>
                                    </div>
                                </div>
                                {(vessel.complianceEUETS !== 'Compliant' || vessel.complianceFuelEU !== 'Compliant') && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded p-1.5 flex items-start gap-1.5">
                                        <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                                        <div className="text-[10px] text-red-300 leading-tight">
                                            {t('vesselPopup.complianceWarning', { regime: vessel.complianceEUETS !== 'Compliant' ? 'EU ETS' : 'FuelEU' })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )
            ))}
        </>
    );
};
