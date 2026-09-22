import React from 'react';
import { useTranslation } from 'react-i18next';
import { ComplianceOverlayAssumptions, ListingComplianceOverlay } from '../../types';

interface CompliancePriceHintProps {
    overlay: ListingComplianceOverlay;
    assumptions: ComplianceOverlayAssumptions | null;
}

/** Declared lifecycle comparison. Regulatory financial benefits are unpriced. */
export const CompliancePriceHint: React.FC<CompliancePriceHintProps> = ({ overlay, assumptions }) => {
    const { t } = useTranslation('trading');
    const tco2e = Number(overlay.tco2e_avoided_per_mt);
    const ci = Number(overlay.ci_gco2_mj);
    const lcv = Number(overlay.lcv_mj_kg);
    // A category proxy is not evidence of the CI of this consignment. This
    // guard also protects clients while an older API version is still live.
    if (overlay.ci_basis !== 'LISTING'
        || overlay.ci_gco2_mj == null || overlay.ci_gco2_mj.trim() === ''
        || !Number.isFinite(ci) || !Number.isFinite(lcv) || lcv <= 0
        || !Number.isFinite(tco2e) || tco2e < 0) return null;

    const tooltipParts = [
        t('marketplace.fueleu.tooltip.headline'),
        `${t('marketplace.fueleu.tooltip.ciBasis')}: ${t('marketplace.fueleu.tooltip.basisListing')} (${ci} gCO2e/MJ)`,
        `${t('marketplace.fueleu.tooltip.lcvBasis')}: ${overlay.lcv_basis === 'LISTING'
            ? t('marketplace.fueleu.tooltip.basisListing')
            : t('marketplace.fueleu.tooltip.basisDefault')} (${lcv} MJ/kg)`,
    ];
    if (assumptions) {
        tooltipParts.push(t('marketplace.fueleu.tooltip.reference', {
            ci: Number(assumptions.vlsfo_baseline_gco2_mj),
        }));
    }
    tooltipParts.push(t('marketplace.fueleu.tooltip.estimate'));

    return (
        <div className="mt-0.5 font-mono text-[10px] leading-tight text-slate-500 dark:text-slate-400" title={tooltipParts.join('\n')}>
            <div className="truncate">{t('marketplace.fueleu.unpriced')}</div>
            <div className="truncate">
                {t('marketplace.fueleu.tco2eAvoided', { amount: tco2e.toFixed(2) })}
            </div>
        </div>
    );
};
