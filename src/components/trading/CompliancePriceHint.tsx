import React from 'react';
import { useTranslation } from 'react-i18next';
import { ComplianceOverlayAssumptions, ListingComplianceOverlay } from '../../types';

interface CompliancePriceHintProps {
    overlay: ListingComplianceOverlay;
    assumptions: ComplianceOverlayAssumptions | null;
}

/**
 * FuelEU value of a green ASK for the viewing org: penalty avoided per MT
 * (USD) and tCO2e avoided per MT. Rendered under BenchmarkPriceBlock in the
 * marketplace price cell, which is capped at 160px below xl — hence two
 * stacked truncating lines with the full story in the title tooltip.
 */
export const CompliancePriceHint: React.FC<CompliancePriceHintProps> = ({ overlay, assumptions }) => {
    const { t } = useTranslation('trading');
    const excludedFactor = (factor: string) => {
        const key = `marketplace.fueleu.tooltip.factor.${factor}`;
        const translated = t(key);
        return translated === key ? t('marketplace.fueleu.tooltip.factor.other') : translated;
    };

    const penaltyUsd = Number(overlay.penalty_avoided_usd_per_mt);
    const tco2e = Number(overlay.tco2e_avoided_per_mt);
    if (!Number.isFinite(penaltyUsd) || !Number.isFinite(tco2e)) return null;

    const positive = penaltyUsd > 0;
    const tone = positive
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-400 dark:text-slate-500';

    const tooltipParts = [
        t('marketplace.fueleu.tooltip.headline'),
        `${t('marketplace.fueleu.tooltip.ciBasis')}: ${overlay.ci_basis === 'LISTING'
            ? t('marketplace.fueleu.tooltip.basisListing')
            : t('marketplace.fueleu.tooltip.basisDefault')} (${Number(overlay.ci_gco2_mj)} gCO2e/MJ)`,
    ];
    if (assumptions) {
        tooltipParts.push(
            `${t('marketplace.fueleu.tooltip.fleetBasis')}: ${assumptions.fleet_intensity_basis === 'ORG_FLEET'
                ? t('marketplace.fueleu.tooltip.fleetOrg')
                : t('marketplace.fueleu.tooltip.fleetDefault')}`,
            `EUR/USD ${Number(assumptions.eur_usd_rate)} (${t('marketplace.fueleu.tooltip.assumed')})`,
            `${t('marketplace.fueleu.tooltip.excludes')}: ${assumptions.excluded_factors.map(excludedFactor).join(', ')}`,
        );
    }
    tooltipParts.push(t('marketplace.fueleu.tooltip.estimate'));

    return (
        <div className={`mt-0.5 font-mono text-[10px] leading-tight ${tone}`} title={tooltipParts.join('\n')}>
            <div className="truncate">
                {t('marketplace.fueleu.penaltyAvoided', {
                    amount: penaltyUsd.toLocaleString('en-US', { maximumFractionDigits: 0 }),
                })}
            </div>
            <div className="truncate text-slate-500 dark:text-slate-400">
                {t('marketplace.fueleu.tco2eAvoided', { amount: tco2e.toFixed(2) })}
            </div>
        </div>
    );
};
