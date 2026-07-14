import React, { useEffect, useRef, useState } from 'react';
import { Activity, AlertCircle, Clock3, MousePointerClick, UserPlus, Users } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useNamespace } from '../../hooks/useNamespace';
import { api, type ProductUsagePeriod, type ProductUsageResponse } from '../../services/api';

const PERIODS: ProductUsagePeriod[] = [7, 30, 90];
const duration = (seconds: number | null) => seconds === null ? '--' : seconds >= 60 ? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s` : `${Math.round(seconds)}s`;
const percent = (value: number | null) => value === null ? '--' : `${(value * 100).toFixed(1)}%`;

const UsageList: React.FC<{ title: string; items: Array<{ label: string; count: number }>; empty: string }> = ({ title, items, empty }) => (
  <div className="v-card p-5">
    <h3 className="v-heading text-sm">{title}</h3>
    {items.length === 0 ? <p className="mt-4 text-sm text-verdaxis-text-muted">{empty}</p> : (
      <div className="mt-3 divide-y divide-verdaxis-border/50">
        {items.slice(0, 8).map(item => (
          <div key={item.label} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate text-verdaxis-text-muted" title={item.label}>{item.label}</span>
            <span className="font-mono font-semibold text-verdaxis-text">{item.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

export const ProductUsageSection: React.FC = () => {
  const { t } = useNamespace('admin');
  const [period, setPeriod] = useState<ProductUsagePeriod>(30);
  const [data, setData] = useState<ProductUsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestFailed, setRequestFailed] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setRequestFailed(false);
    api.admin.productUsage(period)
      .then(response => { if (requestId.current === id) setData(response); })
      .catch(() => { if (requestId.current === id) { setData(null); setRequestFailed(true); } })
      .finally(() => { if (requestId.current === id) setLoading(false); });
  }, [period]);

  const unavailable = requestFailed || data?.behavioralStatus === 'unavailable';
  const empty = data?.behavioralStatus === 'empty';
  const metrics = data?.metrics;
  const cards = [
    { label: t('productUsage.kpi.visitors'), value: unavailable ? '--' : String(metrics?.visitors ?? 0), icon: Users },
    { label: t('productUsage.kpi.visits'), value: unavailable ? '--' : String(metrics?.visits ?? 0), icon: Activity },
    { label: t('productUsage.kpi.duration'), value: unavailable ? '--' : duration(metrics?.averageSessionDurationSeconds ?? null), icon: Clock3 },
    { label: t('productUsage.kpi.signupStarts'), value: unavailable ? '--' : String(metrics?.signupStarts ?? 0), icon: MousePointerClick },
    { label: t('productUsage.kpi.registrations'), value: String(metrics?.completedRegistrations ?? 0), icon: UserPlus },
    { label: t('productUsage.kpi.conversion'), value: unavailable ? '--' : percent(metrics?.registrationConversionRate ?? null), icon: UserPlus },
  ];

  return (
    <section className="space-y-4" aria-labelledby="product-usage-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="product-usage-title" className="v-heading text-lg">{t('productUsage.title')}</h2>
          <p className="mt-1 text-xs text-verdaxis-text-muted">{t('productUsage.subtitle')}</p>
        </div>
        <div className="inline-flex rounded-md border border-verdaxis-border p-0.5" aria-label={t('productUsage.periodLabel')}>
          {PERIODS.map(days => (
            <button key={days} type="button" aria-label={t('productUsage.days', { count: days })} aria-pressed={period === days}
              onClick={() => setPeriod(days)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${period === days ? 'bg-verdaxis text-white' : 'text-verdaxis-text-muted hover:text-verdaxis-text'}`}>
              {days}D
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="v-card flex min-h-32 items-center justify-center text-sm text-verdaxis-text-muted" role="status">{t('productUsage.loading')}</div>
      ) : (
        <>
          {unavailable && <div className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300" role="status"><AlertCircle size={16} />{t('productUsage.unavailable')}</div>}
          {empty && <div className="v-card px-4 py-8 text-center text-sm text-verdaxis-text-muted">{t('productUsage.empty')}</div>}
          {!empty && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                {cards.map(({ label, value, icon: Icon }) => <div key={label} className="v-card p-4">
                  <div className="flex items-center justify-between gap-2 text-xs font-bold uppercase text-verdaxis-text-muted"><span>{label}</span><Icon size={15} className="shrink-0 text-verdaxis" /></div>
                  <div className="mt-2 font-['Montserrat'] text-xl font-bold text-verdaxis-text">{value}</div>
                </div>)}
              </div>
              {data && <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="v-card p-5">
                  <h3 className="v-heading text-sm">{t('productUsage.funnel.title')}</h3>
                  <div className="mt-4 space-y-3">{data.funnel.map(stage => <div key={stage.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm">
                    <div><div className="flex justify-between gap-2 text-verdaxis-text"><span>{t(`productUsage.funnel.${stage.key}`)}</span><span className="font-mono font-semibold">{stage.count.toLocaleString()}</span></div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-verdaxis-border/50"><div className="h-full bg-verdaxis" style={{ width: `${Math.max(0, Math.min(100, stage.conversionRate * 100))}%` }} /></div></div>
                    <span className="w-14 text-right text-xs text-verdaxis-text-muted">{percent(stage.conversionRate)}</span>
                  </div>)}</div>
                </div>
                <div className="v-card p-5"><h3 className="v-heading text-sm">{t('productUsage.trend.title')}</h3><div className="mt-4 h-60">
                  <ResponsiveContainer width="100%" height="100%"><LineChart data={data.daily}><CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" /><XAxis dataKey="date" fontSize={10} /><YAxis allowDecimals={false} fontSize={10} /><Tooltip /><Legend /><Line type="monotone" dataKey="visitors" name={t('productUsage.kpi.visitors')} stroke="#3B82F6" dot={false} /><Line type="monotone" dataKey="completedRegistrations" name={t('productUsage.kpi.registrations')} stroke="#10B981" dot={false} /></LineChart></ResponsiveContainer>
                </div></div>
                <UsageList title={t('productUsage.features.title')} items={data.featureUsage.map(item => ({ label: t(`productUsage.events.${item.event}`), count: item.count }))} empty={t('productUsage.listEmpty')} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2"><UsageList title={t('productUsage.entries.title')} items={data.topEntryPages.map(item => ({ label: item.value, count: item.count }))} empty={t('productUsage.listEmpty')} /><UsageList title={t('productUsage.referrers.title')} items={data.topReferrers.map(item => ({ label: item.value, count: item.count }))} empty={t('productUsage.listEmpty')} /></div>
              </div>}
            </>
          )}
        </>
      )}
    </section>
  );
};
