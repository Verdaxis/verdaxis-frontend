import type { ForwardCurveSignalSourceKind, MarketDemoStatus, MarketSignalType, MarketSourceKind } from '../types';
import type { TFunction } from 'i18next';

export type MarketActivityInput = {
    source_kind?: MarketSourceKind | null;
    demo_status?: MarketDemoStatus | null;
    provenance_kind?: string | null;
    is_demo_trade?: boolean | null;
    is_demo_benchmark?: boolean | null;
};

export type MarketActivityTone = 'live' | 'demo' | 'mixed' | 'reference' | 'signal' | 'empty' | 'unknown';

export interface MarketActivityDescriptor {
    label: string;
    shortLabel: string;
    detail: string;
    tone: MarketActivityTone;
}

export type ForwardCurveSignalInput = {
    signal_type?: MarketSignalType | null;
    signal_source_kind?: ForwardCurveSignalSourceKind | MarketSourceKind | null;
    demo_status?: MarketDemoStatus | null;
};

export function isDemoMarketActivity(activity: MarketActivityInput | null | undefined): boolean {
    if (!activity) return false;
    return activity.demo_status === 'DEMO_ONLY'
        || activity.source_kind === 'DEMO_SEED'
        || activity.provenance_kind === 'DEMO_SEED'
        || activity.is_demo_trade === true
        || activity.is_demo_benchmark === true;
}

export function describeMarketActivity(activity: MarketActivityInput | null | undefined, t: TFunction): MarketActivityDescriptor {
    const sourceKind = activity?.source_kind ?? activity?.provenance_kind ?? null;
    const demoStatus = activity?.demo_status ?? null;

    if (demoStatus === 'DEMO_ONLY' || sourceKind === 'DEMO_SEED' || activity?.is_demo_trade || activity?.is_demo_benchmark) {
        return {
            label: t('marketActivity.demo.label'),
            shortLabel: t('marketActivity.demo.short'),
            detail: t('marketActivity.demo.detail'),
            tone: 'demo',
        };
    }

    if (demoStatus === 'MIXED' || sourceKind === 'MIXED_SOURCE') {
        return {
            label: t('marketActivity.mixed.label'),
            shortLabel: t('marketActivity.mixed.short'),
            detail: t('marketActivity.mixed.detail'),
            tone: 'mixed',
        };
    }

    if (sourceKind === 'BENCHMARK_REFERENCE') {
        return {
            label: t('marketActivity.reference.label'),
            shortLabel: t('marketActivity.reference.short'),
            detail: t('marketActivity.reference.detail'),
            tone: 'reference',
        };
    }

    if (sourceKind === 'CONFIRMED_TRADE') {
        return {
            label: t('marketActivity.trade.label'),
            shortLabel: t('marketActivity.trade.short'),
            detail: t('marketActivity.trade.detail'),
            tone: 'live',
        };
    }

    if (sourceKind === 'LIVE_ORDER' || demoStatus === 'REAL_ONLY') {
        return {
            label: t('marketActivity.live.label'),
            shortLabel: t('marketActivity.live.short'),
            detail: t('marketActivity.live.detail'),
            tone: 'live',
        };
    }

    if (sourceKind === 'NO_DATA' || demoStatus === 'NOT_APPLICABLE') {
        return {
            label: t('marketActivity.empty.label'),
            shortLabel: t('marketActivity.empty.short'),
            detail: t('marketActivity.empty.detail'),
            tone: 'empty',
        };
    }

    return {
        label: t('marketActivity.unknown.label'),
        shortLabel: t('marketActivity.unknown.short'),
        detail: t('marketActivity.unknown.detail'),
        tone: 'unknown',
    };
}

export function describeForwardCurveSignal(signal: ForwardCurveSignalInput | null | undefined, t: TFunction): MarketActivityDescriptor {
    const sourceKind = signal?.signal_source_kind ?? null;
    const demoStatus = signal?.demo_status ?? null;

    if (demoStatus === 'DEMO_ONLY' || sourceKind === 'DEMO_SEED') {
        return {
            label: t('marketActivity.demo.label'),
            shortLabel: t('marketActivity.demo.short'),
            detail: t('marketActivity.demo.detail'),
            tone: 'demo',
        };
    }

    if (demoStatus === 'MIXED' || sourceKind === 'MIXED_SOURCE') {
        return {
            label: t('forwardCurve.activity.mixed.label'),
            shortLabel: t('marketActivity.mixed.short'),
            detail: t('forwardCurve.activity.mixed.detail'),
            tone: 'mixed',
        };
    }

    if (sourceKind === 'MARKET_INDICATION') {
        return {
            label: t('forwardCurve.activity.indication.label'),
            shortLabel: t('forwardCurve.activity.indication.short'),
            detail: t('forwardCurve.activity.indication.detail'),
            tone: 'signal',
        };
    }

    if (sourceKind === 'CONFIRMED_TRADE') {
        return {
            label: t('marketActivity.trade.label'),
            shortLabel: t('marketActivity.trade.short'),
            detail: t('marketActivity.trade.detail'),
            tone: 'live',
        };
    }

    if (sourceKind === 'LIVE_ORDER') {
        return {
            label: t('marketActivity.live.label'),
            shortLabel: t('marketActivity.live.short'),
            detail: t('marketActivity.live.detail'),
            tone: 'live',
        };
    }

    if (sourceKind === 'BENCHMARK_REFERENCE') {
        return {
            label: t('marketActivity.reference.short'),
            shortLabel: t('marketActivity.reference.short'),
            detail: t('marketActivity.reference.detail'),
            tone: 'reference',
        };
    }

    if (sourceKind === 'PHYSICAL_STEM') {
        return {
            label: t('forwardCurve.activity.stem.label'),
            shortLabel: t('forwardCurve.activity.stem.short'),
            detail: t('forwardCurve.activity.stem.detail'),
            tone: 'signal',
        };
    }

    if (sourceKind === 'FAIR_PRICE_MODEL') {
        return {
            label: t('forwardCurve.activity.model.label'),
            shortLabel: t('forwardCurve.activity.model.short'),
            detail: t('forwardCurve.activity.model.detail'),
            tone: 'reference',
        };
    }

    if (sourceKind === 'NO_DATA' || demoStatus === 'NOT_APPLICABLE') {
        return {
            label: t('forwardCurve.activity.empty.label'),
            shortLabel: t('forwardCurve.activity.empty.short'),
            detail: t('forwardCurve.activity.empty.detail'),
            tone: 'empty',
        };
    }

    return {
        label: t('forwardCurve.activity.unknown.label'),
        shortLabel: t('marketActivity.unknown.short'),
        detail: t('forwardCurve.activity.unknown.detail'),
        tone: 'unknown',
    };
}

export function marketActivityTextClass(tone: MarketActivityTone): string {
    if (tone === 'live') return 'text-emerald-600 dark:text-emerald-300';
    if (tone === 'demo') return 'text-amber-700 dark:text-amber-300';
    if (tone === 'mixed') return 'text-orange-700 dark:text-orange-300';
    if (tone === 'reference') return 'text-blue-700 dark:text-blue-300';
    if (tone === 'signal') return 'text-cyan-600 dark:text-cyan-300';
    if (tone === 'empty') return 'text-slate-500 dark:text-slate-400';
    return 'text-slate-500 dark:text-slate-400';
}

export function marketActivityBadgeClass(tone: MarketActivityTone): string {
    if (tone === 'live') return 'border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300';
    if (tone === 'demo') return 'border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300';
    if (tone === 'mixed') return 'border-orange-300/60 bg-orange-50 text-orange-700 dark:border-orange-400/40 dark:bg-orange-400/10 dark:text-orange-300';
    if (tone === 'reference') return 'border-blue-300/60 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-400/10 dark:text-blue-300';
    if (tone === 'signal') return 'border-cyan-300/60 bg-cyan-50 text-cyan-700 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300';
    return 'border-slate-300/70 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400';
}
