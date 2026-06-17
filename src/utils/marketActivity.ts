import type { ForwardCurveSignalSourceKind, MarketDemoStatus, MarketSignalType, MarketSourceKind } from '../types';

export type MarketActivityInput = {
    source_kind?: MarketSourceKind | null;
    demo_status?: MarketDemoStatus | null;
    provenance_kind?: string | null;
    is_demo_trade?: boolean | null;
    is_demo_benchmark?: boolean | null;
};

export type MarketActivityTone = 'live' | 'demo' | 'mixed' | 'reference' | 'empty' | 'unknown';

export interface MarketActivityDescriptor {
    label: string;
    shortLabel: string;
    detail: string;
    tone: MarketActivityTone;
}

export type ForwardCurveSignalInput = {
    signal_type?: MarketSignalType | null;
    signal_source_kind?: ForwardCurveSignalSourceKind | null;
    demo_status?: MarketDemoStatus | null;
};

export const DEMO_ACTIVITY_DETAIL = 'Demo activity seeded for platform preview. Not user-posted liquidity.';

export function isDemoMarketActivity(activity: MarketActivityInput | null | undefined): boolean {
    if (!activity) return false;
    return activity.demo_status === 'DEMO_ONLY'
        || activity.source_kind === 'DEMO_SEED'
        || activity.provenance_kind === 'DEMO_SEED'
        || activity.is_demo_trade === true
        || activity.is_demo_benchmark === true;
}

export function describeMarketActivity(activity: MarketActivityInput | null | undefined): MarketActivityDescriptor {
    const sourceKind = activity?.source_kind ?? activity?.provenance_kind ?? null;
    const demoStatus = activity?.demo_status ?? null;

    if (demoStatus === 'DEMO_ONLY' || sourceKind === 'DEMO_SEED' || activity?.is_demo_trade || activity?.is_demo_benchmark) {
        return {
            label: 'Demo data',
            shortLabel: 'Demo',
            detail: DEMO_ACTIVITY_DETAIL,
            tone: 'demo',
        };
    }

    if (demoStatus === 'MIXED' || sourceKind === 'MIXED_SOURCE') {
        return {
            label: 'Mixed live/demo',
            shortLabel: 'Mixed',
            detail: 'Contains both live user activity and demo-seeded market context.',
            tone: 'mixed',
        };
    }

    if (sourceKind === 'BENCHMARK_REFERENCE') {
        return {
            label: 'Benchmark reference',
            shortLabel: 'Reference',
            detail: 'Reference benchmark context, not an executable order or confirmed trade.',
            tone: 'reference',
        };
    }

    if (sourceKind === 'CONFIRMED_TRADE') {
        return {
            label: 'Confirmed trade',
            shortLabel: 'Trade',
            detail: 'Confirmed user trade activity.',
            tone: 'live',
        };
    }

    if (sourceKind === 'LIVE_ORDER' || demoStatus === 'REAL_ONLY') {
        return {
            label: 'Live order',
            shortLabel: 'Live',
            detail: 'Live user-posted market activity.',
            tone: 'live',
        };
    }

    if (sourceKind === 'NO_DATA' || demoStatus === 'NOT_APPLICABLE') {
        return {
            label: 'No data',
            shortLabel: 'No data',
            detail: 'No market activity is available for this slice yet.',
            tone: 'empty',
        };
    }

    return {
        label: 'Unverified source',
        shortLabel: 'Unknown',
        detail: 'Source provenance is unavailable for this market signal.',
        tone: 'unknown',
    };
}

export function describeForwardCurveSignal(signal: ForwardCurveSignalInput | null | undefined): MarketActivityDescriptor {
    const sourceKind = signal?.signal_source_kind ?? null;
    const demoStatus = signal?.demo_status ?? null;

    if (demoStatus === 'DEMO_ONLY' || sourceKind === 'DEMO_SEED') {
        return {
            label: 'Demo data',
            shortLabel: 'Demo',
            detail: DEMO_ACTIVITY_DETAIL,
            tone: 'demo',
        };
    }

    if (demoStatus === 'MIXED' || sourceKind === 'MIXED_SOURCE') {
        return {
            label: 'Mixed monitoring signals',
            shortLabel: 'Mixed',
            detail: 'Contains both trusted market signals and demo-seeded monitoring context.',
            tone: 'mixed',
        };
    }

    if (sourceKind === 'MARKET_INDICATION') {
        return {
            label: 'Market indication',
            shortLabel: 'Indication',
            detail: 'Sanitized market indication feed for monitoring. Not executable liquidity.',
            tone: 'live',
        };
    }

    if (sourceKind === 'PHYSICAL_STEM') {
        return {
            label: 'Physical stem feed',
            shortLabel: 'Stem',
            detail: 'Sanitized physical availability signal for monitoring. Not a trade order.',
            tone: 'live',
        };
    }

    if (sourceKind === 'FAIR_PRICE_MODEL') {
        return {
            label: 'Fair-price model',
            shortLabel: 'Model',
            detail: 'Indicative Verdaxis model output for monitoring. Not a confirmed trade.',
            tone: 'reference',
        };
    }

    if (sourceKind === 'NO_DATA' || demoStatus === 'NOT_APPLICABLE') {
        return {
            label: 'No feed',
            shortLabel: 'No feed',
            detail: 'No monitoring signal is available for this slice yet.',
            tone: 'empty',
        };
    }

    return {
        label: 'Unverified signal',
        shortLabel: 'Unknown',
        detail: 'Signal provenance is unavailable for this market slice.',
        tone: 'unknown',
    };
}

export function marketActivityTextClass(tone: MarketActivityTone): string {
    if (tone === 'live') return 'text-emerald-600 dark:text-emerald-300';
    if (tone === 'demo') return 'text-amber-700 dark:text-amber-300';
    if (tone === 'mixed') return 'text-orange-700 dark:text-orange-300';
    if (tone === 'reference') return 'text-blue-700 dark:text-blue-300';
    if (tone === 'empty') return 'text-slate-500 dark:text-slate-400';
    return 'text-slate-500 dark:text-slate-400';
}

export function marketActivityBadgeClass(tone: MarketActivityTone): string {
    if (tone === 'live') return 'border-emerald-300/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300';
    if (tone === 'demo') return 'border-amber-300/60 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300';
    if (tone === 'mixed') return 'border-orange-300/60 bg-orange-50 text-orange-700 dark:border-orange-400/40 dark:bg-orange-400/10 dark:text-orange-300';
    if (tone === 'reference') return 'border-blue-300/60 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-400/10 dark:text-blue-300';
    return 'border-slate-300/70 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400';
}
