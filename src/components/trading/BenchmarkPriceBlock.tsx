import React from 'react';

interface BenchmarkPriceBlockProps {
  priceUsd: number;
  benchmarkUsd?: number | null;
  deltaUsd?: number | null;
  align?: 'left' | 'right';
}

function formatUsd(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const BenchmarkPriceBlock: React.FC<BenchmarkPriceBlockProps> = ({
  priceUsd,
  benchmarkUsd,
  deltaUsd,
  align = 'left',
}) => {
  const hasBenchmark = typeof benchmarkUsd === 'number' && Number.isFinite(benchmarkUsd);
  const hasDelta = typeof deltaUsd === 'number' && Number.isFinite(deltaUsd);
  const benchmarkLabel = hasBenchmark ? `Benchmark ref $${formatUsd(benchmarkUsd!)}` : 'No benchmark reference';
  const benchmarkTitle = hasBenchmark ? `vs benchmark reference $${formatUsd(benchmarkUsd!)}/MT` : benchmarkLabel;
  const deltaTone = !hasDelta || deltaUsd == null
    ? 'text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'
    : deltaUsd <= 0
      ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30'
      : 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30';

  return (
    <div className={`flex flex-col gap-1 ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <div className="font-bold text-emerald-600 dark:text-emerald-400">
        ${formatUsd(priceUsd)}
        <span className="ml-1 text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">/MT</span>
      </div>
      {hasBenchmark ? (
        <div
          className="max-w-[132px] truncate text-[10px] font-medium text-slate-500 dark:text-slate-400 xl:max-w-none"
          title={benchmarkTitle}
        >
          {benchmarkLabel}
        </div>
      ) : (
        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">{benchmarkLabel}</div>
      )}
      {hasDelta ? (
        <div className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${deltaTone}`}>
          {deltaUsd! < 0 ? '-' : '+'}${formatUsd(Math.abs(deltaUsd!))}
        </div>
      ) : null}
    </div>
  );
};
