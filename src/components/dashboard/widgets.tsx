import React, { Suspense } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';

import { useNamespace } from '../../hooks/useNamespace';
import type { Page } from '../../types';
import type { MarketSlice } from '../../utils/sliceUrl';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { readMarketplaceSlice } from '../../utils/marketplaceSelection';

/**
 * Widgets that wrap an existing view. Each is loaded on first use, so a home
 * without them downloads none of their code. The home sections (actions,
 * counts, action queue, radar, supplier demand) are rendered by `CommandCenter`
 * itself because they share its trade data.
 */
const ForwardCurveWorkspace = lazyWithRetry(() => import('../ForwardCurveWorkspace')
  .then((module) => ({ default: module.ForwardCurveWorkspace })));
const OrderBook = lazyWithRetry(() => import('../OrderBook').then((module) => ({ default: module.OrderBook })));
const TradeTape = lazyWithRetry(() => import('../TradeTape').then((module) => ({ default: module.TradeTape })));
const MyTrades = lazyWithRetry(() => import('../MyTrades').then((module) => ({ default: module.MyTrades })));

const WidgetLoading: React.FC = () => {
  const { t } = useNamespace('dashboard');
  return (
    <div className="flex h-full min-h-24 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {t('commandCenter.customize.widgetLoading')}
    </div>
  );
};

const Lazy: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<WidgetLoading />}>{children}</Suspense>
);

interface NavigationProps {
  onNavigate: (page: Page) => void;
}

export const ForwardCurveWidget: React.FC<NavigationProps & { onOpenSlice?: (slice: MarketSlice) => void }> = ({
  onNavigate,
  onOpenSlice,
}) => (
  <Lazy><ForwardCurveWorkspace onNavigate={onNavigate} onOpenSlice={onOpenSlice} /></Lazy>
);

export const MyTradesWidget: React.FC = () => {
  const { t } = useNamespace('dashboard');
  return (
    <section
      aria-labelledby="dashboard-my-trades-title"
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <h2 id="dashboard-my-trades-title" className="mb-3 text-lg font-bold text-slate-800 dark:text-white">
        {t('commandCenter.customize.widgets.my_trades.title')}
      </h2>
      <Lazy><MyTrades embedded /></Lazy>
    </section>
  );
};

/** Shown when Marketplace has not stored a slice yet. */
const NoSlice: React.FC<NavigationProps> = ({ onNavigate }) => {
  const { t } = useNamespace('dashboard');
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{t('commandCenter.customize.noSlice')}</p>
      <button
        type="button"
        onClick={() => onNavigate('MARKETPLACE')}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-emerald-200 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-700 dark:text-slate-200"
      >
        {t('commandCenter.customize.openMarketplace')}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
};

/** Order book of the slice last opened in Marketplace (read only). */
export const OrderBookWidget: React.FC<NavigationProps> = ({ onNavigate }) => {
  const slice = readMarketplaceSlice();
  if (!slice) return <NoSlice onNavigate={onNavigate} />;
  return (
    <Lazy>
      <OrderBook
        marketProduct={slice.marketProduct}
        region={slice.portName ?? undefined}
        deliveryPointId={slice.deliveryPointId ?? undefined}
        availability={slice.availabilityWindow ?? undefined}
      />
    </Lazy>
  );
};

/** Trade tape of the slice last opened in Marketplace. */
export const TradeTapeWidget: React.FC<NavigationProps> = ({ onNavigate }) => {
  const slice = readMarketplaceSlice();
  if (!slice) return <NoSlice onNavigate={onNavigate} />;
  return (
    <Lazy>
      <TradeTape
        marketProduct={slice.marketProduct}
        availability={slice.availabilityWindow ?? undefined}
        deliveryPointId={slice.deliveryPointId ?? undefined}
        region={slice.deliveryPointId ? undefined : slice.portName ?? undefined}
      />
    </Lazy>
  );
};
