import React, { useId, useMemo, useState } from 'react';
import { ArrowRight, Calculator, ChevronDown, ShieldAlert } from 'lucide-react';

import { useNamespace } from '../../hooks/useNamespace';
import type { Port } from '../../types';
import { formatMarketProduct } from '../../utils/marketProduct';
import {
    DEFAULT_COMPLIANCE_ESTIMATOR_INPUT,
    GREEN_FUEL_ASSUMPTIONS,
    estimateCompliancePlanning,
} from '../../utils/complianceEstimator';
import { VerdaxisSelect } from '../ui/VerdaxisSelect';

interface ComplianceEstimatorCardProps {
    selectedPort?: Port;
    onOpenMarketplace: (port: Port) => void;
}

const STORAGE_KEYS = {
    port: 'verdaxis_marketplace_port',
    deliveryPointId: 'verdaxis_marketplace_delivery_point_id',
    product: 'verdaxis_marketplace_product',
    legacyFuel: 'verdaxis_marketplace_fuel',
    window: 'verdaxis_marketplace_window',
};

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const oneDecimalFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

const eur = (value: number) => `€${numberFormatter.format(value)}`;
const tonnes = (value: number) => `${oneDecimalFormatter.format(value)} MT`;
const pct = (value: number | null) => value == null ? '--' : `${Math.round(value * 100)}%`;

export const ComplianceEstimatorCard: React.FC<ComplianceEstimatorCardProps> = ({ selectedPort, onOpenMarketplace }) => {
    const { t, ready } = useNamespace('dashboard');
    const fuelLabelId = useId();
    const [open, setOpen] = useState(false);
    const [voyageDays, setVoyageDays] = useState(DEFAULT_COMPLIANCE_ESTIMATOR_INPUT.voyageDays);
    const [dailyConsumption, setDailyConsumption] = useState(DEFAULT_COMPLIANCE_ESTIMATOR_INPUT.conventionalDailyConsumptionMt);
    const [planningTarget, setPlanningTarget] = useState(DEFAULT_COMPLIANCE_ESTIMATOR_INPUT.planningTargetGco2ePerMj);
    const [selectedFuelProduct, setSelectedFuelProduct] = useState(GREEN_FUEL_ASSUMPTIONS[0].marketProduct);

    const selectedFuel = GREEN_FUEL_ASSUMPTIONS.find(fuel => fuel.marketProduct === selectedFuelProduct) ?? GREEN_FUEL_ASSUMPTIONS[0];
    const fuelOptions = useMemo(() => GREEN_FUEL_ASSUMPTIONS.map(fuel => ({
        value: fuel.marketProduct,
        label: fuel.label,
        description: `${fuel.carbonIntensityGco2ePerMj} gCO2e/MJ · $${fuel.referencePriceUsdPerMt}/MT`,
    })), []);

    const result = useMemo(() => estimateCompliancePlanning({
        ...DEFAULT_COMPLIANCE_ESTIMATOR_INPUT,
        voyageDays,
        conventionalDailyConsumptionMt: dailyConsumption,
        planningTargetGco2ePerMj: planningTarget,
        greenFuel: selectedFuel,
        greenPriceUsdPerMt: selectedFuel.referencePriceUsdPerMt,
    }), [dailyConsumption, planningTarget, selectedFuel, voyageDays]);

    const openMarketplace = () => {
        if (!selectedPort) return;
        localStorage.setItem(STORAGE_KEYS.product, selectedFuel.marketProduct);
        localStorage.removeItem(STORAGE_KEYS.legacyFuel);
        localStorage.setItem(STORAGE_KEYS.port, selectedPort.name);
        localStorage.setItem(STORAGE_KEYS.deliveryPointId, selectedPort.id);
        localStorage.setItem(STORAGE_KEYS.window, 'SPOT');
        onOpenMarketplace(selectedPort);
    };

    if (!ready) return null;

    const resultSummary = t('intelligencePanel.estimator.resultsSummary', {
        ets: eur(result.indicativeEtsExposureEur),
        shortfall: eur(result.fuelEuStyleShortfallEur),
        blend: pct(result.blend.ratio),
        volume: result.blend.feasible ? tonnes(result.blend.greenFuelMt) : '--',
    });

    return (
        <section data-testid="compliance-estimator-card" className="rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
            <button
                type="button"
                onClick={() => setOpen(current => !current)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 dark:hover:bg-slate-800"
                aria-expanded={open}
            >
                <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                        <Calculator size={16} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                        <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">
                            {t('intelligencePanel.estimator.title')}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                            {t('intelligencePanel.estimator.subtitle')}
                        </span>
                    </span>
                </span>
                <ChevronDown
                    size={16}
                    aria-hidden="true"
                    className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div className="space-y-4 border-t border-slate-200 px-3 py-3 dark:border-slate-700">
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                        <div className="flex items-start gap-2">
                            <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{t('intelligencePanel.estimator.disclaimer')}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <div id={fuelLabelId} className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('intelligencePanel.estimator.fuelPathway')}
                            </div>
                            <VerdaxisSelect
                                value={selectedFuelProduct}
                                onChange={value => setSelectedFuelProduct(value as typeof selectedFuelProduct)}
                                options={fuelOptions}
                                ariaLabel={t('intelligencePanel.estimator.fuelPathway')}
                                triggerClassName="rounded-md px-2 py-2 text-xs font-semibold shadow-none"
                                menuClassName="rounded-lg"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {t('intelligencePanel.estimator.voyageDays')}
                                <input
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={voyageDays}
                                    onChange={event => setVoyageDays(Number(event.target.value))}
                                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </label>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {t('intelligencePanel.estimator.dailyBurn')}
                                <input
                                    type="number"
                                    min={1}
                                    max={200}
                                    value={dailyConsumption}
                                    onChange={event => setDailyConsumption(Number(event.target.value))}
                                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </label>
                        </div>

                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {t('intelligencePanel.estimator.target')}
                            <input
                                type="number"
                                min={1}
                                max={120}
                                step={0.1}
                                value={planningTarget}
                                onChange={event => setPlanningTarget(Number(event.target.value))}
                                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </label>
                    </div>

                    <div role="status" aria-live="polite" aria-atomic="true" className="grid grid-cols-2 gap-2">
                        <span className="sr-only">{resultSummary}</span>
                        <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                            <div className="text-[11px] font-bold uppercase leading-snug text-slate-500">{t('intelligencePanel.estimator.etsExposure')}</div>
                            <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{eur(result.indicativeEtsExposureEur)}</div>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                            <div className="text-[11px] font-bold uppercase leading-snug text-slate-500">{t('intelligencePanel.estimator.shortfall')}</div>
                            <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{eur(result.fuelEuStyleShortfallEur)}</div>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                            <div className="text-[11px] font-bold uppercase leading-snug text-slate-500">{t('intelligencePanel.estimator.blend')}</div>
                            <div className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">{pct(result.blend.ratio)}</div>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                            <div className="text-[11px] font-bold uppercase leading-snug text-slate-500">{t('intelligencePanel.estimator.greenVolume')}</div>
                            <div className="mt-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                                {result.blend.feasible ? tonnes(result.blend.greenFuelMt) : '--'}
                            </div>
                        </div>
                    </div>

                    {!result.blend.feasible && (
                        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                            {result.blend.noFeasibleReason}
                        </div>
                    )}

                    <div className="rounded-md bg-white px-3 py-2 text-[10px] leading-relaxed text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        {t('intelligencePanel.estimator.assumptions', {
                            product: formatMarketProduct(selectedFuel.marketProduct),
                            fuelCi: selectedFuel.carbonIntensityGco2ePerMj,
                            fuelPrice: selectedFuel.referencePriceUsdPerMt,
                            target: planningTarget,
                            emissionFactor: DEFAULT_COMPLIANCE_ESTIMATOR_INPUT.conventionalEmissionFactorTco2PerMt,
                        })}
                    </div>

                    <button
                        type="button"
                        onClick={openMarketplace}
                        disabled={!selectedPort}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
                    >
                        {selectedPort
                            ? t('intelligencePanel.estimator.openMarketplace', { port: selectedPort.name })
                            : t('intelligencePanel.estimator.selectPort')}
                        <ArrowRight size={14} aria-hidden="true" />
                    </button>
                </div>
            )}
        </section>
    );
};
