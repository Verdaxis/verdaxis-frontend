import React, { useEffect, useId, useMemo, useState } from 'react';
import { ArrowRight, Calculator, Plus, ShieldAlert, Trash2 } from 'lucide-react';

import { useNamespace } from '../../hooks/useNamespace';
import type { Port } from '../../types';
import { formatMarketProduct } from '../../utils/marketProduct';
import {
    DEFAULT_COMPLIANCE_ESTIMATOR_INPUT,
    GREEN_FUEL_ASSUMPTIONS,
    estimateCompliancePlanning,
} from '../../utils/complianceEstimator';
import { VerdaxisSelect } from '../ui/VerdaxisSelect';
import { analytics } from '../../services/analytics';

interface ComplianceEstimatorCardProps {
    selectedPort?: Port;
    portOptions?: Port[];
    onSelectPort?: (port: Port) => void;
    onOpenMarketplace: (port: Port) => void;
}

type VoyageSegmentMode = 'INTRA_EU' | 'EU_ENTRY_EXIT';

interface VoyageSegment {
    id: string;
    days: number;
    mode: VoyageSegmentMode;
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
const usd = (value: number) => `$${numberFormatter.format(value)}`;
const tonnes = (value: number) => `${oneDecimalFormatter.format(value)} MT`;
const pct = (value: number | null) => value == null ? '--' : `${Math.round(value * 100)}%`;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VOYAGE_SEGMENT_MODES: Array<{ value: VoyageSegmentMode; coverage: number; labelKey: string }> = [
    { value: 'INTRA_EU', coverage: 1, labelKey: 'intraEu' },
    { value: 'EU_ENTRY_EXIT', coverage: 0.5, labelKey: 'euEntryExit' },
];
const getCanonicalDeliveryPointId = (port: Port) => {
    if (port.catalogDeliveryPointId && UUID_PATTERN.test(port.catalogDeliveryPointId)) return port.catalogDeliveryPointId;
    return UUID_PATTERN.test(port.id) ? port.id : null;
};
const setNumericState = (setter: React.Dispatch<React.SetStateAction<number>>) => (
    event: React.ChangeEvent<HTMLInputElement>,
) => {
    const nextValue = Number(event.target.value);
    setter(Number.isFinite(nextValue) ? nextValue : 0);
};
const segmentCoverage = (mode: VoyageSegmentMode) => (
    VOYAGE_SEGMENT_MODES.find(option => option.value === mode)?.coverage ?? 0.5
);

export const ComplianceEstimatorCard: React.FC<ComplianceEstimatorCardProps> = ({
    selectedPort,
    portOptions = [],
    onSelectPort,
    onOpenMarketplace,
}) => {
    const { t, ready } = useNamespace('dashboard');
    const fuelLabelId = useId();
    const [voyageSegments, setVoyageSegments] = useState<VoyageSegment[]>([
        { id: 'segment-1', days: DEFAULT_COMPLIANCE_ESTIMATOR_INPUT.voyageDays, mode: 'EU_ENTRY_EXIT' },
    ]);
    const [dailyConsumption, setDailyConsumption] = useState(DEFAULT_COMPLIANCE_ESTIMATOR_INPUT.conventionalDailyConsumptionMt);
    const [conventionalPrice, setConventionalPrice] = useState(DEFAULT_COMPLIANCE_ESTIMATOR_INPUT.conventionalPriceUsdPerMt);
    const [euaPrice, setEuaPrice] = useState(DEFAULT_COMPLIANCE_ESTIMATOR_INPUT.euaPriceEurPerTco2);
    const [planningTarget, setPlanningTarget] = useState(DEFAULT_COMPLIANCE_ESTIMATOR_INPUT.planningTargetGco2ePerMj);
    const [selectedFuelProduct, setSelectedFuelProduct] = useState(GREEN_FUEL_ASSUMPTIONS[0].marketProduct);

    useEffect(() => { analytics.track('estimator_opened'); }, []);

    const selectedFuel = GREEN_FUEL_ASSUMPTIONS.find(fuel => fuel.marketProduct === selectedFuelProduct) ?? GREEN_FUEL_ASSUMPTIONS[0];
    const fuelOptions = useMemo(() => GREEN_FUEL_ASSUMPTIONS.map(fuel => ({
        value: fuel.marketProduct,
        label: fuel.label,
        description: `${fuel.carbonIntensityGco2ePerMj} gCO2e/MJ · $${fuel.referencePriceUsdPerMt}/MT`,
    })), []);
    const marketplacePortOptions = useMemo(() => portOptions.map(port => ({
        value: port.id,
        label: port.name,
        description: t('intelligencePanel.estimator.portBunkerDescription', {
            product: selectedFuel.label,
            availability: t(`intelligencePanel.availabilityLevels.${port.methanolSupply.toLowerCase()}`),
        }),
    })), [portOptions, selectedFuel.label, t]);
    const voyageDays = useMemo(() => (
        voyageSegments.reduce((sum, segment) => sum + Math.max(0, segment.days), 0)
    ), [voyageSegments]);
    const etsCoveragePct = useMemo(() => {
        if (voyageDays <= 0) return 0;
        const weightedCoverage = voyageSegments.reduce(
            (sum, segment) => sum + (Math.max(0, segment.days) * segmentCoverage(segment.mode)),
            0,
        );
        return Math.round((weightedCoverage / voyageDays) * 100);
    }, [voyageDays, voyageSegments]);

    const result = useMemo(() => estimateCompliancePlanning({
        ...DEFAULT_COMPLIANCE_ESTIMATOR_INPUT,
        voyageDays,
        conventionalDailyConsumptionMt: dailyConsumption,
        conventionalPriceUsdPerMt: conventionalPrice,
        euaPriceEurPerTco2: euaPrice,
        etsCoverage: etsCoveragePct / 100,
        planningTargetGco2ePerMj: planningTarget,
        greenFuel: selectedFuel,
        greenPriceUsdPerMt: selectedFuel.referencePriceUsdPerMt,
    }), [conventionalPrice, dailyConsumption, etsCoveragePct, euaPrice, planningTarget, selectedFuel, voyageDays]);

    const addSegment = () => {
        setVoyageSegments(current => [
            ...current,
            {
                id: `segment-${Date.now()}`,
                days: 1,
                mode: 'EU_ENTRY_EXIT',
            },
        ]);
    };

    const updateSegmentDays = (segmentId: string, value: number) => {
        setVoyageSegments(current => current.map(segment => (
            segment.id === segmentId ? { ...segment, days: Number.isFinite(value) ? value : 0 } : segment
        )));
    };

    const updateSegmentMode = (segmentId: string, value: VoyageSegmentMode) => {
        setVoyageSegments(current => current.map(segment => (
            segment.id === segmentId ? { ...segment, mode: value } : segment
        )));
    };

    const removeSegment = (segmentId: string) => {
        setVoyageSegments(current => current.length > 1 ? current.filter(segment => segment.id !== segmentId) : current);
    };

    const selectMarketplacePort = (portId: string) => {
        const port = portOptions.find(option => option.id === portId);
        if (!port) return;
        onSelectPort?.(port);
    };

    const openMarketplace = () => {
        if (!selectedPort) return;
        analytics.track('estimator_completed', { port: selectedPort.id, fuel: selectedFuel.marketProduct });
        localStorage.setItem(STORAGE_KEYS.product, selectedFuel.marketProduct);
        localStorage.removeItem(STORAGE_KEYS.legacyFuel);
        localStorage.setItem(STORAGE_KEYS.port, selectedPort.name);
        const deliveryPointId = getCanonicalDeliveryPointId(selectedPort);
        if (deliveryPointId) {
            localStorage.setItem(STORAGE_KEYS.deliveryPointId, deliveryPointId);
        } else {
            localStorage.removeItem(STORAGE_KEYS.deliveryPointId);
        }
        localStorage.setItem(STORAGE_KEYS.window, 'SPOT');
        onOpenMarketplace(selectedPort);
    };

    if (!ready) return null;

    const resultSummary = t('intelligencePanel.estimator.resultsSummary', {
        fuelCost: eur(result.conventionalFuelCostEur),
        total: eur(result.totalConventionalEstimateEur),
        ets: eur(result.indicativeEtsExposureEur),
        shortfall: eur(result.fuelEuStyleShortfallEur),
        blend: pct(result.blend.ratio),
        volume: result.blend.feasible ? tonnes(result.blend.greenFuelMt) : '--',
    });

    return (
        <section data-testid="compliance-estimator-card" className="rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="flex w-full items-center justify-between gap-3 rounded-t-lg px-3 py-3 text-left">
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
            </div>

            <div className="space-y-4 border-t border-slate-200 px-3 py-3 dark:border-slate-700">
                    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                        <div className="flex items-start gap-2">
                            <ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{t('intelligencePanel.estimator.disclaimer')}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        {t('intelligencePanel.estimator.voyageSegments')}
                                    </div>
                                    <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                        {t('intelligencePanel.estimator.segmentSummary', {
                                            days: voyageDays,
                                            coverage: etsCoveragePct,
                                        })}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={addSegment}
                                    className="flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 transition hover:bg-emerald-500/15 dark:text-emerald-300"
                                >
                                    <Plus size={11} aria-hidden="true" />
                                    {t('intelligencePanel.estimator.addSegment')}
                                </button>
                            </div>
                            <div className="space-y-2">
                                {voyageSegments.map((segment, index) => (
                                    <div key={segment.id} className="grid grid-cols-[1fr_70px_24px] items-end gap-2 rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                                        <label className="min-w-0 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            {t('intelligencePanel.estimator.segmentType', { index: index + 1 })}
                                            <select
                                                value={segment.mode}
                                                onChange={event => updateSegmentMode(segment.id, event.target.value as VoyageSegmentMode)}
                                                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            >
                                                {VOYAGE_SEGMENT_MODES.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {t(`intelligencePanel.estimator.${option.labelKey}`)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            {t('intelligencePanel.estimator.segmentDays')}
                                            <input
                                                type="number"
                                                min={1}
                                                max={120}
                                                value={segment.days}
                                                onChange={event => updateSegmentDays(segment.id, Number(event.target.value))}
                                                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => removeSegment(segment.id)}
                                            disabled={voyageSegments.length === 1}
                                            className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-35 dark:hover:bg-slate-800"
                                            aria-label={t('intelligencePanel.estimator.removeSegment', { index: index + 1 })}
                                        >
                                            <Trash2 size={13} aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

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

                        <div>
                            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {t('intelligencePanel.estimator.marketplacePort')}
                            </div>
                            <VerdaxisSelect
                                value={selectedPort?.id ?? ''}
                                onChange={selectMarketplacePort}
                                options={marketplacePortOptions}
                                placeholder={t('intelligencePanel.estimator.selectMarketplacePort')}
                                ariaLabel={t('intelligencePanel.estimator.marketplacePort')}
                                triggerClassName="rounded-md px-2 py-2 text-xs font-semibold shadow-none"
                                menuClassName="rounded-lg"
                            />
                            <div className="mt-1 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                                {selectedPort
                                    ? t('intelligencePanel.estimator.selectedPortSync', { port: selectedPort.name })
                                    : t('intelligencePanel.estimator.portSelectionHelp')}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {t('intelligencePanel.estimator.dailyBurn')}
                                <input
                                    type="number"
                                    min={1}
                                    max={200}
                                    value={dailyConsumption}
                                    onChange={setNumericState(setDailyConsumption)}
                                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </label>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {t('intelligencePanel.estimator.etsCoverage')}
                                <div className="mt-1 rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                                    {etsCoveragePct}%
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {t('intelligencePanel.estimator.conventionalPrice')}
                                <input
                                    type="number"
                                    min={1}
                                    max={2000}
                                    value={conventionalPrice}
                                    onChange={setNumericState(setConventionalPrice)}
                                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                                />
                            </label>
                            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                {t('intelligencePanel.estimator.euaPrice')}
                                <input
                                    type="number"
                                    min={1}
                                    max={300}
                                    value={euaPrice}
                                    onChange={setNumericState(setEuaPrice)}
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
                                onChange={setNumericState(setPlanningTarget)}
                                className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                        </label>

                    </div>

                    <div role="status" aria-live="polite" aria-atomic="true" className="grid grid-cols-2 gap-2">
                        <span className="sr-only">{resultSummary}</span>
                        <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                            <div className="text-[11px] font-bold uppercase leading-snug text-slate-500">{t('intelligencePanel.estimator.fuelCost')}</div>
                            <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{eur(result.conventionalFuelCostEur)}</div>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
                            <div className="text-[11px] font-bold uppercase leading-snug text-slate-500">{t('intelligencePanel.estimator.totalEstimate')}</div>
                            <div className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{eur(result.totalConventionalEstimateEur)}</div>
                        </div>
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
                            {result.blend.noFeasibleReason
                                ? t(`intelligencePanel.estimator.messages.${result.blend.noFeasibleReason}`)
                                : null}
                        </div>
                    )}

                    <div className="rounded-md bg-white px-3 py-2 text-[10px] leading-relaxed text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        {t('intelligencePanel.estimator.assumptions', {
                            product: formatMarketProduct(selectedFuel.marketProduct),
                            fuelCi: selectedFuel.carbonIntensityGco2ePerMj,
                            fuelPrice: selectedFuel.referencePriceUsdPerMt,
                            conventionalPrice: usd(conventionalPrice),
                            euaPrice: eur(euaPrice),
                            etsCoverage: `${etsCoveragePct}%`,
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
        </section>
    );
};
