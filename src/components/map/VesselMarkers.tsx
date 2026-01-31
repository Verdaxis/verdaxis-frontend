import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import { Ship, Anchor, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Vessel } from '../../types';
import { calculateHeading } from '../../utils';

// Fix: Alias imports if strictly needed, but assuming standard react-leaflet approach for now
// If this file fails to compile with props errors, we might need similar casting as BuyerMap

const createVesselIcon = (vessel: Vessel) => {
    // Color code by compliance status (Green=Compliant, Amber=Warning, Red=Non)
    const statusColor = vessel.complianceEUETS === 'Compliant' && vessel.complianceFuelEU === 'Compliant'
        ? '#3b82f6' // Blue for vessels (brand alignment)
        : vessel.complianceEUETS === 'Non-Compliant' || vessel.complianceFuelEU === 'Non-Compliant'
            ? '#ef4444' 
            : '#f59e0b';
            
    const heading = calculateHeading(vessel.previousLocation, vessel.location);

    const iconMarkup = renderToStaticMarkup(
        <div className="relative group">
             {/* Directional Triangle / Ship Shape */}
             <div 
                className="w-0 h-0 transition-transform duration-500"
                style={{
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderBottom: `24px solid ${statusColor}`,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                    transform: `rotate(${heading}deg)`
                }}
            />
            
            {/* Hover Tooltip Label */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700 pointer-events-none">
                {vessel.name}
            </div>
        </div>
    );

    return divIcon({
        html: iconMarkup,
        className: 'bg-transparent',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    });
};

export const VesselMarkers: React.FC = () => {
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

    if (loading) return null;

    return (
        <>
            {vessels.map((vessel) => (
                vessel.location && (
                    <Marker 
                        key={vessel.id}
                        position={[vessel.location.lat, vessel.location.lng]}
                        icon={createVesselIcon(vessel)}
                    >
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
                                        <span className="text-slate-500">Voyage:</span>
                                        <span className="text-slate-300 font-medium text-right max-w-[120px] truncate">{vessel.nextVoyage}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">CII Grade:</span>
                                        <span className={`font-bold ${
                                            ['A','B'].includes(vessel.ciiGrade) ? 'text-emerald-400' :
                                            ['C'].includes(vessel.ciiGrade) ? 'text-amber-400' : 'text-red-400'
                                        }`}>{vessel.ciiGrade}</span>
                                    </div>
                                </div>
                                {(vessel.complianceEUETS !== 'Compliant' || vessel.complianceFuelEU !== 'Compliant') && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded p-1.5 flex items-start gap-1.5">
                                        <AlertCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                                        <div className="text-[10px] text-red-300 leading-tight">
                                            Compliance Warning: {vessel.complianceEUETS !== 'Compliant' ? 'EU ETS' : 'FuelEU'} Risk
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
