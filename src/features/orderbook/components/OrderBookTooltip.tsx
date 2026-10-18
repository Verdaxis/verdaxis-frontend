import React from 'react';
import { createPortal } from 'react-dom';
import type { TFunction } from 'i18next';
import { OrderBookOrder } from '../../../types';
import { formatMarketProduct } from '../../../utils/marketProduct';
import { formatAvailabilityWindow } from '../../../utils/availabilityWindow';
import { isDemoMarketActivity } from '../../../utils/marketActivity';
import { lngAskSummary } from '../../../components/lng/LngOrderTermsDetails';

export interface OrderBookHoverTooltip {
    order: OrderBookOrder;
    x: number;
    y: number;
}

interface OrderBookTooltipProps {
    hoverTooltip: OrderBookHoverTooltip;
    tooltipId: string;
    marketProduct?: string;
    locale: string;
    t: TFunction<'trading'>;
}

export const OrderBookTooltip = ({ hoverTooltip, tooltipId, marketProduct, locale, t }: OrderBookTooltipProps) => (
    createPortal(
        <div
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-[140] w-[320px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-900/18 dark:border-slate-700 dark:bg-slate-950"
            style={{ left: hoverTooltip.x, top: hoverTooltip.y }}
        >
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {formatMarketProduct(hoverTooltip.order.market_product || marketProduct || 'BIO_METHANOL')}
                </span>
                <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600 dark:border-slate-700 dark:text-slate-300">
                    {hoverTooltip.order.side}
                </span>
            </div>
            {isDemoMarketActivity(hoverTooltip.order) && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-900/25 dark:text-amber-200">
                    {t('marketplace.demo.tooltip')}
                </div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('marketplace.modal.certification')}</span>
                    <span>{hoverTooltip.order.certification_scheme || hoverTooltip.order.certifications?.[0] || t('orderPlaceModal.option.anyCertifiedScheme')}</span>
                </div>
                <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('orderPlaceModal.label.origin')}</span>
                    <span>{hoverTooltip.order.origin || t('common.notSpecified')}</span>
                </div>
                <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('orderPlaceModal.label.feedstock')}</span>
                    <span>{hoverTooltip.order.feedstock || t('common.notSpecified')}</span>
                </div>
                <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('orderBook.ci')}</span>
                    <span>{hoverTooltip.order.carbon_intensity_gco2_mj != null ? Math.round(hoverTooltip.order.carbon_intensity_gco2_mj).toString() : t('common.notAvailable')}</span>
                </div>
            </div>
            <div className="mt-3 border-t border-slate-200 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {hoverTooltip.order.delivery_point_name || hoverTooltip.order.region} · {formatAvailabilityWindow(hoverTooltip.order.availability_window, locale)}
            </div>
            {hoverTooltip.order.lng_terms && lngAskSummary(hoverTooltip.order.lng_terms, t) && (
                <div className="mt-2 border-t border-slate-200 pt-2 text-[11px] leading-4 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {lngAskSummary(hoverTooltip.order.lng_terms, t)}
                </div>
            )}
        </div>,
        document.body,
    )
);
