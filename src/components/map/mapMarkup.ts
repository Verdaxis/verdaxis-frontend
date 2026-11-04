/**
 * The HTML of the Intelligence Map's tooltips and pop-ups, and the marker
 * sizes and colours. Both map engines use them: Mapbox (the full map) and
 * Leaflet (the basic map for browsers without WebGL), so a port looks and
 * reads the same in both.
 */
import type { Port } from '../../types';
import type { PortMarketData } from '../../utils/buyerMapMarket';
import { getBiofuelSpecification } from '../../utils/biofuelSpecification';

export type Translate = (key: string, options?: Record<string, unknown>) => string;

// Port circle radius: proportional to volume, clamped 6-20px
export const getPortRadius = (volume: number, maxVolume: number): number => {
    if (maxVolume <= 0 || volume <= 0) return 6;
    const ratio = volume / maxVolume;
    return Math.round(6 + ratio * 14); // 6..20
};

// Border color by spread tightness
export const getSpreadColor = (spreadPct: number): string => {
    if (!Number.isFinite(spreadPct) || spreadPct === 999) return '#94A3B8';
    if (spreadPct < 5) return '#10B981';  // green
    if (spreadPct < 15) return '#F59E0B'; // amber
    return '#EF4444';                      // red
};

export const translationKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');

export const calculateHeading = (prev?: { lat: number; lng: number }, curr?: { lat: number; lng: number }): number => {
    if (!prev || !curr) return 0;

    const lat1 = prev.lat * Math.PI / 180;
    const lat2 = curr.lat * Math.PI / 180;
    const longitudeDelta = (curr.lng - prev.lng) * Math.PI / 180;
    const y = Math.sin(longitudeDelta) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2)
        - Math.sin(lat1) * Math.cos(lat2) * Math.cos(longitudeDelta);

    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
};

export const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
}[character]!));

/** The fields a port's hover tooltip shows. */
export interface PortTooltipFields {
    name: string;
    referencePrice: number;
    referenceProduct: string;
    totalVolume: number;
}

export const portTooltipHtml = (props: PortTooltipFields, translate: Translate): string => {
    const pricePart = props.referencePrice
        ? ' <span style="color:#94A3B8">' + escapeHtml(props.referenceProduct) + '</span> <span style="color:#10B981;font-family:\'IBM Plex Mono\',monospace">$' + Number(props.referencePrice).toFixed(0) + '</span>'
        : '';
    const volumePart = props.totalVolume > 0
        ? '<div style="font-size:10px;color:#94A3B8;margin-top:2px">' + escapeHtml(translate('buyerMap.openVolume', { volume: Math.round(props.totalVolume).toLocaleString() })) + '</div>'
        : '';
    const tooltipHtml = '<div style="background:#1E293B;color:#F8FAFC;border-radius:6px;padding:6px 10px;font-family:\'DM Sans\',\'Inter\',sans-serif;font-size:12px;white-space:nowrap">'
        + '<span style="font-weight:700">' + escapeHtml(props.name) + '</span>'
        + pricePart
        + volumePart
        + '</div>';
    return tooltipHtml;
};

export interface PortPopupInput {
    port: Port;
    market: PortMarketData;
    isDark: boolean;
    selectedProduct: string | undefined;
    translate: Translate;
}

/** The port pop-up: open orders by fuel, the spot indication, references,
 * congestion, and the Trade-at button (handled by `window.__verdaxisTradeAt`). */
export const portPopupHtml = ({ port, market, isDark, selectedProduct, translate }: PortPopupInput): string => {
    const fuelRowsHtml = market.fuelRows.length > 0
        ? '<table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px">'
            + '<thead><tr style="border-bottom:1px solid rgba(148,163,184,0.3)">'
            + '<th style="text-align:left;padding:3px 0;color:#94A3B8;font-weight:600;font-size:10px;text-transform:uppercase">' + escapeHtml(translate('buyerMap.popup.fuel')) + '</th>'
            + '<th style="text-align:right;padding:3px 4px;color:#94A3B8;font-weight:600;font-size:10px">' + escapeHtml(translate('buyerMap.popup.bid')) + '</th>'
            + '<th style="text-align:right;padding:3px 4px;color:#94A3B8;font-weight:600;font-size:10px">' + escapeHtml(translate('buyerMap.popup.ask')) + '</th>'
            + '<th style="text-align:right;padding:3px 0;color:#94A3B8;font-weight:600;font-size:10px">#</th>'
            + '</tr></thead><tbody>'
            + market.fuelRows.map((row, i) =>'<tr style="border-bottom:' + (i < market.fuelRows.length - 1 ? '1px solid rgba(148,163,184,0.1)' : 'none') + '">'
                + '<td style="padding:4px 0;font-weight:600;color:#E2E8F0">' + escapeHtml(row.label) + '</td>'
                + '<td style="text-align:right;padding:4px 4px;font-family:\'IBM Plex Mono\',monospace;color:#10B981;font-weight:600">' + (row.bestBid !== null ? '$' + row.bestBid.toFixed(0) : '--') + '</td>'
                + '<td style="text-align:right;padding:4px 4px;font-family:\'IBM Plex Mono\',monospace;color:#EF4444;font-weight:600">' + (row.bestAsk !== null ? '$' + row.bestAsk.toFixed(0) : '--') + '</td>'
                + '<td style="text-align:right;padding:4px 0;color:#94A3B8">' + row.orderCount + '</td>'
                + '</tr>').join('')
            + '</tbody></table>'
        : '<div style="font-size:11px;color:#64748B;margin-bottom:10px;padding:8px 0;text-align:center">' + escapeHtml(translate('buyerMap.popup.noOpenOrders')) + '</div>';

    // Market intelligence section
    const spotPrice = market.reference ? '$' + market.reference.price.toFixed(0) : '--';
    const referenceLabel = market.reference
        ? translate('buyerMap.spotIndication', { product: market.reference.productLabel })
        : translate('buyerMap.spotIndicationUnavailable');
    const referenceSource = !market.reference
        ? '--'
        : market.reference.source === 'DEMO'
            ? translate('buyerMap.demoMarketplace')
            : market.reference.source === 'MIXED'
                ? translate('buyerMap.mixedMarketplace')
                : translate('buyerMap.marketplace');
    const hideMethanolIntelligence = Boolean(selectedProduct || getBiofuelSpecification(market.reference?.productLabel));
    const plattsPrice = !hideMethanolIntelligence && port.details?.plattsPrice ? '$' + port.details.plattsPrice.toFixed(2) : '--';
    const swapPrice = !hideMethanolIntelligence && port.details?.swapPrice ? '$' + port.details.swapPrice.toFixed(2) : '--';
    const congestion = port.details?.congestionLevel && port.details.congestionLevel !== 'Unknown' ? port.details.congestionLevel : '--';
    const congestionLabel = congestion === '--'
        ? congestion
        : translate(`intelligencePanel.congestionLevels.${translationKey(congestion)}`, { defaultValue: translate('intelligencePanel.congestionLevels.unknown') });
    const congColor = congestion === 'Low' ? '#10B981' : congestion === 'Moderate' ? '#F59E0B' : congestion === 'High' ? '#EF4444' : '#94A3B8';
    const externalReferencesHtml = plattsPrice !== '--' || swapPrice !== '--'
        ? '<div style="background:rgba(148,163,184,0.08);padding:6px 8px;border-radius:6px;margin-bottom:6px">'
            + '<div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">'
            + '<span style="color:#E8373E;font-weight:600">' + escapeHtml(translate('buyerMap.benchmarkReference')) + '</span>'
            + '<span style="font-weight:700;color:#E2E8F0;font-family:\'IBM Plex Mono\',monospace">' + plattsPrice + '</span>'
            + '</div>'
            + '<div style="display:flex;justify-content:space-between;font-size:11px">'
            + '<span style="color:#94A3B8;font-weight:600">' + escapeHtml(translate('buyerMap.swapReference')) + '</span>'
            + '<span style="font-weight:700;color:#E2E8F0;font-family:\'IBM Plex Mono\',monospace">' + swapPrice + '</span>'
            + '</div>'
            + '</div>'
        : '';
    const marketIntelHtml = '<div style="margin-top:10px;padding-top:8px;border-top:1px solid rgba(148,163,184,0.15)">'
        // Product-specific SPOT indication
        + '<div style="margin-bottom:6px">'
        + '<div style="font-size:10px;color:#94A3B8;text-transform:uppercase;font-weight:600;margin-bottom:2px">' + escapeHtml(referenceLabel) + '</div>'
        + '<div style="font-size:16px;font-weight:700;color:#F8FAFC;font-family:\'IBM Plex Mono\',monospace">' + spotPrice + '</div>'
        + '</div>'
        + externalReferencesHtml
        // Congestion row
        + '<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:8px">'
        + '<div><span style="color:#94A3B8;font-weight:600">' + escapeHtml(translate('intelligencePanel.congestion')) + '</span> <span style="color:' + congColor + ';font-weight:700;margin-left:3px">' + escapeHtml(congestionLabel) + '</span></div>'
        + '<div><span style="color:#94A3B8;font-weight:600">' + escapeHtml(translate('buyerMap.source')) + '</span> <span style="color:#E2E8F0;font-weight:600;margin-left:3px">' + escapeHtml(referenceSource) + '</span></div>'
        + '</div>'
        + '</div>';

    const html = '<div class="verdaxis-port-popup-body" style="width:260px;background:' + (isDark ? '#0F172A' : '#1E293B') + ';color:#F8FAFC;border-radius:8px;padding:12px;font-family:\'DM Sans\',\'Inter\',sans-serif">'
        + '<h3 style="font-family:\'Montserrat\',sans-serif;font-weight:700;font-size:15px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(148,163,184,0.2)">'
        + escapeHtml(port.name || translate('buyerMap.popup.unknownPort'))
        + '<span style="display:block;font-size:10px;font-weight:500;color:#94A3B8;margin-top:2px">' + escapeHtml(port.country
            ? translate(`countries.${translationKey(port.country)}`, { defaultValue: port.country })
            : translate('buyerMap.popup.global')) + '</span>'
        + '</h3>'
        + fuelRowsHtml
        + marketIntelHtml
        + (market.fuelRows.some(row => row.label === 'UCOME B100') || selectedProduct === 'UCOME_B100'
            ? '<p style="font-size:11px;line-height:1.5;color:#FDE68A;margin-bottom:10px">' + escapeHtml(translate('buyerMap.specificationScope')) + '</p>'
            : '')
        + '<button onclick="window.__verdaxisTradeAt && window.__verdaxisTradeAt(' + escapeHtml(JSON.stringify(port.id)) + ')" style="width:100%;background:#10B981;color:#FFF;font-size:12px;font-weight:700;padding:8px 0;border-radius:6px;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px">' + escapeHtml(translate('buyerMap.popup.tradeAt', { port: port.name })) + ' \u2192</button>'
        + '</div>';
    return html;
};

/** A vessel's marker colour by fuel type. */
export const vesselColor = (vesselType: string | null | undefined): string => {
    const vt = (vesselType || '').toLowerCase();
    return vt.includes('methanol') || vt.includes('dual') || vt.includes('green') || vt.includes('ammonia')
        ? '#10B981' : vt.includes('lng') ? '#3B82F6' : '#94A3B8';
};

export interface VesselTooltipFields {
    name: string;
    vesselType?: string | null;
    ciiGrade?: string | null;
}

export const vesselTooltipHtml = (p: VesselTooltipFields, translate: Translate): string => {
    const ciiColor = ['A', 'B'].includes(p.ciiGrade ?? '') ? '#10B981' : p.ciiGrade === 'C' ? '#F59E0B' : '#EF4444';
    const vesselType = translate(`buyerMap.vesselTypes.${translationKey(p.vesselType || '')}`, { defaultValue: translate('buyerMap.vesselTypes.other') });
    const html = '<div style="font-family:\'DM Sans\',sans-serif"><strong>' + escapeHtml(p.name) + '</strong>'
        + '<div style="font-size:10px;color:#94A3B8;margin-top:2px">' + escapeHtml(vesselType)
        + (p.ciiGrade ? ' <span style="color:' + ciiColor + ';font-weight:700">CII ' + escapeHtml(p.ciiGrade) + '</span>' : '')
        + '</div></div>';
    return html;
};
