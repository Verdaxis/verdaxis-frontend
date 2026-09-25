import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TFunction } from 'i18next';
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Clock3, Eye, Loader2, LogIn, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { api, isAbortError } from '../../services/api';
import type {
  ActivityKind,
  ActivityPeriod,
  ActivitySource,
  UserActivityItem,
  UserActivityResponse,
} from '../../types/activity';
import { formatAvailabilityWindow } from '../../utils/availabilityWindow';
import { formatMarketProduct } from '../../utils/marketProduct';

const PAGE_SIZE = 50;
const PERIODS: ActivityPeriod[] = [7, 30, 90];
const KINDS: ActivityKind[] = ['all', 'browsing', 'business', 'login'];

export interface ActivityUser {
  id: string;
  name: string;
  email: string;
}

interface UserActivityDrawerProps {
  user: ActivityUser;
  onClose: () => void;
}

const humanize = (value: string) => value
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, letter => letter.toUpperCase());

const formatTimestamp = (value: string, locale: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(date);
};

const formatDetail = (key: string, value: unknown, locale: string): string => {
  if (key === 'market_product' && typeof value === 'string') return formatMarketProduct(value);
  if (key === 'availability_window' && typeof value === 'string') {
    return formatAvailabilityWindow(value, locale);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value === null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const sourceIcon = (source: ActivitySource) => {
  if (source === 'browsing') return <Eye size={14} aria-hidden="true" />;
  if (source === 'business') return <BriefcaseBusiness size={14} aria-hidden="true" />;
  return <LogIn size={14} aria-hidden="true" />;
};

const sourceClass = (source: ActivitySource) => {
  if (source === 'browsing') return 'bg-sky-500/15 text-sky-700 dark:text-sky-300';
  if (source === 'business') return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  return 'bg-violet-500/15 text-violet-700 dark:text-violet-300';
};

const ActivityRow: React.FC<{ item: UserActivityItem; locale: string; t: TFunction }> = ({ item, locale, t }) => {
  const details = Object.entries(item.details ?? {}).filter(([, value]) => value !== null && value !== '');
  return (
    <li className="relative pl-8">
      <span className="absolute left-[7px] top-7 h-[calc(100%+0.75rem)] w-px bg-verdaxis-border last:hidden" aria-hidden="true" />
      <span className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-verdaxis bg-verdaxis-card" aria-hidden="true" />
      <article className="rounded-xl border border-verdaxis-border bg-verdaxis-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1.5">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold ${sourceClass(item.source)}`}>
              {sourceIcon(item.source)}
              {t(`activity.source.${item.source}`, { defaultValue: humanize(item.source) })}
            </span>
            <h3 className="text-sm font-semibold text-verdaxis-text">
              {t(`activity.actions.${item.action}`, {
                defaultValue: item.action === 'login_day' ? 'Daily sign-ins' : humanize(item.action),
              })}
            </h3>
          </div>
          <time className="whitespace-nowrap text-xs text-verdaxis-text-muted" dateTime={item.occurred_at}>
            {formatTimestamp(item.occurred_at, locale)}
          </time>
        </div>
        {details.length > 0 && (
          <dl className="mt-3 grid gap-2 sm:grid-cols-2">
            {details.map(([key, value]) => (
              <div key={key} className="min-w-0 rounded-lg bg-verdaxis-border/20 px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-verdaxis-text-muted">
                  {t(`activity.details.${key}`, { defaultValue: humanize(key) })}
                </dt>
                <dd className="mt-0.5 break-words text-xs text-verdaxis-text">
                  {formatDetail(key, value, locale)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </article>
    </li>
  );
};

export const UserActivityDrawer: React.FC<UserActivityDrawerProps> = ({ user, onClose }) => {
  const { t, i18n } = useTranslation('admin');
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const [days, setDays] = useState<ActivityPeriod>(30);
  const [kind, setKind] = useState<ActivityKind>('all');
  const [offset, setOffset] = useState(0);
  const [response, setResponse] = useState<UserActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setLoading(true);
    setError(false);
    setResponse(null);
    api.admin.userActivity(user.id, { days, kind, limit: PAGE_SIZE, offset }, controller.signal)
      .then(data => {
        if (!cancelled) setResponse(data);
      })
      .catch(loadError => {
        if (!cancelled && !isAbortError(loadError)) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [days, kind, offset, retry, user.id]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    focusable()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, []);

  const chooseDays = (value: ActivityPeriod) => {
    setDays(value);
    setOffset(0);
  };
  const chooseKind = (value: ActivityKind) => {
    setKind(value);
    setOffset(0);
  };
  const titleName = user.name === '—' ? user.email : user.name;
  const items = response?.items ?? [];

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex justify-end bg-slate-950/70"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-activity-title"
        tabIndex={-1}
        className="flex h-full w-full max-w-2xl flex-col border-l border-verdaxis-border bg-verdaxis-bg shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-verdaxis-border p-5 sm:p-6">
          <div className="min-w-0">
            <h2 id="user-activity-title" className="v-heading truncate text-xl">
              {t('activity.title', { name: titleName, defaultValue: `Activity for ${titleName}` })}
            </h2>
            <p className="mt-1 truncate text-sm text-verdaxis-text-muted">{user.email}</p>
            <p className="mt-2 text-sm text-verdaxis-text-muted">
              {t('activity.subtitle', { defaultValue: 'Recorded user actions and browsing.' })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('activity.close', { defaultValue: 'Close activity' })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-verdaxis-text-muted transition-colors hover:bg-verdaxis-border/40 hover:text-verdaxis-text focus:outline-none focus:ring-2 focus:ring-verdaxis"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className="border-b border-verdaxis-border p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-verdaxis-text-muted">
                {t('activity.periodLabel', { defaultValue: 'Activity period' })}
              </legend>
              <div className="flex flex-wrap gap-2">
                {PERIODS.map(value => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={days === value}
                    onClick={() => chooseDays(value)}
                    className={`min-h-11 rounded-full px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-verdaxis ${days === value ? 'bg-verdaxis text-slate-950' : 'bg-verdaxis-border/30 text-verdaxis-text-muted hover:text-verdaxis-text'}`}
                  >
                    {t(`activity.period.${value}`, { defaultValue: `${value} days` })}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-verdaxis-text-muted">
                {t('activity.kindLabel', { defaultValue: 'Activity type' })}
              </legend>
              <div className="flex flex-wrap gap-2">
                {KINDS.map(value => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={kind === value}
                    onClick={() => chooseKind(value)}
                    className={`min-h-11 rounded-full px-3 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-verdaxis ${kind === value ? 'bg-verdaxis text-slate-950' : 'bg-verdaxis-border/30 text-verdaxis-text-muted hover:text-verdaxis-text'}`}
                  >
                    {t(`activity.kind.${value}`, { defaultValue: humanize(value) })}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-verdaxis-border bg-verdaxis-card px-3 py-2 text-xs text-verdaxis-text-muted">
            <Clock3 size={15} className="shrink-0 text-verdaxis" aria-hidden="true" />
            <span className="font-semibold text-verdaxis-text">
              {t('activity.lastRecorded', { defaultValue: 'Latest matching activity' })}:
            </span>
            {loading
              ? t('activity.loading', { defaultValue: 'Loading activity…' })
              : error
                ? '—'
                : response?.last_activity_at
                  ? formatTimestamp(response.last_activity_at, locale)
                  : t('activity.neverRecorded', { defaultValue: 'No recorded activity' })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div role="status" aria-live="polite" className="flex min-h-48 items-center justify-center gap-3 text-sm text-verdaxis-text-muted">
              <Loader2 className="animate-spin text-verdaxis" size={22} aria-hidden="true" />
              {t('activity.loading', { defaultValue: 'Loading activity…' })}
            </div>
          ) : error ? (
            <div role="alert" className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {t('activity.error', { defaultValue: 'Activity could not be loaded.' })}
              </p>
              <button
                type="button"
                onClick={() => setRetry(value => value + 1)}
                className="min-h-11 rounded-lg border border-verdaxis px-4 text-sm font-semibold text-verdaxis hover:bg-verdaxis/10 focus:outline-none focus:ring-2 focus:ring-verdaxis"
              >
                {t('activity.retry', { defaultValue: 'Retry' })}
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="flex min-h-48 items-center justify-center text-center text-sm text-verdaxis-text-muted">
              {t('activity.empty', { defaultValue: 'No activity was recorded for these filters.' })}
            </p>
          ) : (
            <ol className="space-y-3">
              {items.map(item => <ActivityRow key={item.id} item={item} locale={locale} t={t} />)}
            </ol>
          )}
        </div>

        <footer className="border-t border-verdaxis-border bg-verdaxis-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setOffset(value => Math.max(0, value - PAGE_SIZE))}
              disabled={loading || offset === 0}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-verdaxis-border px-3 text-sm font-semibold text-verdaxis-text transition-colors hover:bg-verdaxis-border/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              {t('activity.previous', { defaultValue: 'Previous page' })}
            </button>
            <span className="text-xs tabular-nums text-verdaxis-text-muted">
              {items.length > 0
                ? t('activity.range', { from: offset + 1, to: offset + items.length, defaultValue: `Showing ${offset + 1}–${offset + items.length}` })
                : ''}
            </span>
            <button
              type="button"
              onClick={() => setOffset(value => value + PAGE_SIZE)}
              disabled={loading || !response?.has_more}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-verdaxis-border px-3 text-sm font-semibold text-verdaxis-text transition-colors hover:bg-verdaxis-border/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('activity.next', { defaultValue: 'Next page' })}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-verdaxis-text-muted">
            {t('activity.privacy', { defaultValue: 'Browsing activity is available for 90 days. Earlier anonymous analytics are not linked or reconstructed.' })}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-verdaxis-text-muted">
            {t('activity.sourceNote', { defaultValue: 'Login entries are daily aggregates. Browsing is client-reported and does not prove a completed transaction.' })}
          </p>
        </footer>
      </aside>
    </div>,
    document.body,
  );
};
