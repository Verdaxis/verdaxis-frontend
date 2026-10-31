import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  ApiError,
  ApiOutcomeUnknownError,
  EVIDENCE_CASE_REF_PATTERN,
  REASSIGN_MANUAL_RESOLUTION_CODE,
  api,
} from '../../services/api';
import type { OffboardingTradeItem } from '../../services/api';
import { ConfirmModal } from '../ui/ConfirmModal';
import { offboardingError } from './adminErrors';
import type { OffboardTarget } from './OffboardMemberDialog';
import { useOffboardingAdmin } from './offboardingAccess';

interface OffboardingTradesProps {
  target: OffboardTarget;
  onClose: () => void;
}

interface Candidate {
  id: string;
  email: string;
  label: string;
}

type Notice = 'done' | 'conflict' | 'unknown' | null;

const TRADE_FROZEN_CODE = 'TRADE_FROZEN';

const fieldClass = 'mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text';

// A replacement must trade on the same side as the person they replace.
const roleForSide = (side: string): 'BUYER' | 'SUPPLIER' | null => {
  const normalized = side.toLowerCase();
  if (normalized.startsWith('buy')) return 'BUYER';
  if (normalized.startsWith('sell') || normalized.startsWith('supp')) return 'SUPPLIER';
  return null;
};

const candidateLabel = (user: any): string => {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ');
  return name ? `${name} — ${user.email}` : String(user.email);
};

/**
 * Admin-only list of the confirmed and delivered trades a person still
 * carries, with the audited change of the responsible person. Only the
 * responsible person changes; the backend refuses frozen, stale and assisted
 * cases, and this view never repeats a request on its own.
 */
export const OffboardingTrades: React.FC<OffboardingTradesProps> = ({ target, onClose }) => {
  const { allowed } = useOffboardingAdmin();
  const { t } = useTranslation('admin');
  const translate = useRef({ t });
  translate.current = { t };

  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState<OffboardingTradeItem[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [users, setUsers] = useState<unknown[] | null>(null);
  const [selected, setSelected] = useState<OffboardingTradeItem | null>(null);
  const [replacementId, setReplacementId] = useState('');
  const [caseRef, setCaseRef] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualTradeIds, setManualTradeIds] = useState<ReadonlySet<string>>(new Set());
  const submitInFlight = useRef(false);
  const loadRequest = useRef(0);

  const loadTrades = useCallback(async () => {
    const request = ++loadRequest.current;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.admin.offboardingTrades(target.id);
      if (request !== loadRequest.current) return;
      setTrades(response.items);
      setTruncated(response.truncated);
    } catch (cause) {
      if (request !== loadRequest.current) return;
      setLoadError(offboardingError(cause, translate.current.t, 'handover.error.load'));
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  }, [target.id]);

  const loadCandidates = useCallback(async () => {
    try {
      const params = new URLSearchParams({ status: 'APPROVED', limit: '100' });
      const response = await api.admin.users(params.toString());
      setUsers(response?.items ?? []);
    } catch (cause) {
      console.error('[admin] handover.error.candidates', cause);
      setUsers(null);
    }
  }, []);

  useEffect(() => {
    void loadTrades();
    void loadCandidates();
    return () => { loadRequest.current += 1; };
  }, [loadTrades, loadCandidates]);

  if (!allowed) return null;

  const candidatesFor = (trade: OffboardingTradeItem): Candidate[] => {
    const role = roleForSide(trade.side);
    if (!role || !trade.organization_id || !users) return [];
    return (users as any[])
      .filter(user => (
        user.status === 'APPROVED'
        && user.role === role
        && user.organization_id === trade.organization_id
        && user.id !== trade.responsible_user_id
        && user.id !== target.id
      ))
      .map(user => ({ id: String(user.id), email: String(user.email), label: candidateLabel(user) }));
  };

  const isBlocked = (trade: OffboardingTradeItem) =>
    trade.frozen || trade.manual_resolution_required || manualTradeIds.has(trade.trade_id);

  const startReassign = (trade: OffboardingTradeItem) => {
    // Each attempt starts from nothing: no earlier confirmation carries over.
    setSelected(trade);
    setReplacementId('');
    setCaseRef('');
    setConfirmed(false);
    setError(null);
    setNotice(null);
    if (users === null) void loadCandidates();
  };

  const backToList = () => {
    setSelected(null);
    setConfirmed(false);
    setError(null);
  };

  const caseRefValue = caseRef.trim();
  const candidates = selected ? candidatesFor(selected) : [];
  const canSubmit = Boolean(selected)
    && !isBlocked(selected as OffboardingTradeItem)
    && candidates.some(candidate => candidate.id === replacementId)
    && EVIDENCE_CASE_REF_PATTERN.test(caseRefValue)
    && confirmed
    && !submitting;

  const submit = async () => {
    if (submitInFlight.current || !selected || !canSubmit) return;
    submitInFlight.current = true;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      await api.admin.reassignResponsible(selected.trade_id, {
        side: selected.side,
        replacement_user_id: replacementId,
        evidence_case_ref: caseRefValue,
        expected_current_user_id: selected.responsible_user_id,
      });
      setSelected(null);
      setNotice('done');
      await loadTrades();
    } catch (cause) {
      const tradeId = selected.trade_id;
      setSelected(null);
      setConfirmed(false);
      if (cause instanceof ApiOutcomeUnknownError) {
        // The change may or may not have committed: read the list, never resend.
        setNotice('unknown');
      } else if (cause instanceof ApiError && cause.code === REASSIGN_MANUAL_RESOLUTION_CODE) {
        setManualTradeIds(previous => new Set(previous).add(tradeId));
        setError(offboardingError(cause, translate.current.t, 'handover.error.reassign'));
      } else if (cause instanceof ApiError && cause.code === TRADE_FROZEN_CODE) {
        setError(offboardingError(cause, translate.current.t, 'handover.error.reassign'));
      } else if (cause instanceof ApiError && cause.status === 409) {
        setNotice('conflict');
      } else {
        // Nothing changed: keep the form so the admin can correct it.
        setSelected(selected);
        setError(offboardingError(cause, translate.current.t, 'handover.error.reassign'));
        return;
      }
      await loadTrades();
    } finally {
      submitInFlight.current = false;
      setSubmitting(false);
    }
  };

  const sideLabel = (side: string) =>
    t(`handover.side.${side.toUpperCase()}`, { defaultValue: t('handover.side.unknown') });
  const statusLabel = (status: string) =>
    t(`handover.status.${status.toUpperCase()}`, { defaultValue: t('handover.status.unknown') });

  const anyFrozen = trades.some(trade => trade.frozen);
  const anyManual = trades.some(trade => trade.manual_resolution_required || manualTradeIds.has(trade.trade_id));

  const alerts = (
    <>
      {notice === 'done' && (
        <p role="status" className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {t('handover.reassign.done')}
        </p>
      )}
      {notice === 'conflict' && (
        <p role="status" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          {t('handover.conflict')}
        </p>
      )}
      {notice === 'unknown' && (
        <p role="status" className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
          {t('handover.unknown')}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </>
  );

  if (selected) {
    return (
      <ConfirmModal
        key="reassign"
        isOpen
        onClose={backToList}
        onConfirm={() => { void submit(); }}
        title={t('handover.reassign.title')}
        message={t('handover.reassign.message')}
        confirmText={t('handover.reassign.confirm')}
        cancelText={t('handover.reassign.back')}
        variant="warning"
        isLoading={submitting}
        confirmDisabled={!canSubmit}
        maxWidth="lg"
        compact
      >
        <div className="mt-5 space-y-3">
          <div className="divide-y divide-verdaxis-border rounded-lg border border-verdaxis-border text-sm">
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <span className="text-verdaxis-text-muted">{t('handover.columns.trade')}</span>
              <span className="font-mono text-xs text-verdaxis-text">{selected.trade_id}</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-3 py-2">
              <span className="text-verdaxis-text-muted">{t('handover.reassign.current')}</span>
              <span className="font-semibold text-verdaxis-text">
                {selected.responsible_user_email ?? selected.responsible_user_id}
              </span>
            </div>
          </div>

          <div className="text-sm text-verdaxis-text-muted">
            <label htmlFor="handover-replacement">{t('handover.reassign.replacement')}</label>
            <select
              id="handover-replacement"
              value={replacementId}
              onChange={(event) => setReplacementId(event.target.value)}
              disabled={submitting || candidates.length === 0}
              className={`${fieldClass} disabled:opacity-50`}
            >
              <option value="">{t('handover.reassign.selectReplacement')}</option>
              {candidates.map(candidate => (
                <option key={candidate.id} value={candidate.id}>{candidate.label}</option>
              ))}
            </select>
          </div>
          {users === null && (
            <p className="text-sm text-amber-400">{t('handover.error.candidates')}</p>
          )}
          {users !== null && candidates.length === 0 && (
            <p className="text-sm text-amber-400">{t('handover.reassign.noCandidates')}</p>
          )}

          <div className="text-sm text-verdaxis-text-muted">
            <label htmlFor="handover-case-ref">{t('handover.reassign.caseRef')}</label>
            <input
              id="handover-case-ref"
              value={caseRef}
              onChange={(event) => setCaseRef(event.target.value)}
              disabled={submitting}
              autoComplete="off"
              maxLength={80}
              aria-invalid={caseRefValue !== '' && !EVIDENCE_CASE_REF_PATTERN.test(caseRefValue)}
              className={`${fieldClass} font-mono`}
            />
            <p className="mt-1 text-xs">{t('offboard.caseRefHint')}</p>
            {caseRefValue !== '' && !EVIDENCE_CASE_REF_PATTERN.test(caseRefValue) && (
              <p className="mt-1 text-xs text-red-400">{t('offboard.caseRefInvalid')}</p>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm font-semibold text-verdaxis-text">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={submitting}
              className="mt-0.5"
            />
            <span>{t('handover.reassign.confirmCheck')}</span>
          </label>
          {alerts}
        </div>
      </ConfirmModal>
    );
  }

  return (
    <ConfirmModal
      key="list"
      isOpen
      onClose={onClose}
      onConfirm={onClose}
      title={t('handover.title')}
      message={t('handover.message')}
      confirmText={t('handover.close')}
      cancelText=""
      variant="info"
      maxWidth="lg"
      compact
    >
      <div className="mt-5">
        <p className="mb-3 text-sm text-verdaxis-text-muted">
          <span className="font-semibold text-verdaxis-text">{target.name}</span>
          <span className="mx-2">·</span>
          <span className="font-mono text-xs">{target.email}</span>
        </p>
        {loading && (
          <p className="flex items-center gap-2 text-sm text-verdaxis-text-muted" role="status">
            <Loader2 size={14} className="animate-spin" />
            {t('handover.loading')}
          </p>
        )}
        {loadError && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <p>{loadError}</p>
            <button
              type="button"
              onClick={() => { void loadTrades(); }}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2"
            >
              <RefreshCw size={12} />
              {t('handover.reload')}
            </button>
          </div>
        )}
        {!loading && !loadError && trades.length === 0 && (
          <p className="text-sm text-verdaxis-text-muted">{t('handover.empty')}</p>
        )}
        {!loadError && trades.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-verdaxis-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-verdaxis-border text-xs uppercase text-verdaxis-text-muted">
                  <th className="px-3 py-2 text-left">{t('handover.columns.trade')}</th>
                  <th className="px-3 py-2 text-left">{t('handover.columns.side')}</th>
                  <th className="px-3 py-2 text-left">{t('handover.columns.status')}</th>
                  <th className="px-3 py-2 text-left">{t('handover.columns.company')}</th>
                  <th className="px-3 py-2 text-left">{t('handover.columns.responsible')}</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {trades.map(trade => {
                  const manual = trade.manual_resolution_required || manualTradeIds.has(trade.trade_id);
                  return (
                    <tr key={trade.trade_id} className="border-b border-verdaxis-border/50 last:border-0">
                      <td className="px-3 py-2 font-mono text-xs text-verdaxis-text">{trade.trade_id}</td>
                      <td className="px-3 py-2 text-verdaxis-text-muted">{sideLabel(trade.side)}</td>
                      <td className="px-3 py-2 text-verdaxis-text-muted">
                        {statusLabel(trade.status)}
                        {trade.frozen && (
                          <span className="ml-2 rounded border border-sky-500/30 bg-sky-500/15 px-1.5 py-0.5 text-xs font-medium text-sky-400">
                            {t('handover.frozen')}
                          </span>
                        )}
                        {manual && (
                          <span className="ml-2 rounded border border-amber-500/30 bg-amber-500/15 px-1.5 py-0.5 text-xs font-medium text-amber-400">
                            {t('handover.manual')}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-verdaxis-text-muted">{trade.organization_name ?? '—'}</td>
                      <td className="px-3 py-2 text-verdaxis-text-muted">
                        {trade.responsible_user_email ?? trade.responsible_user_id}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => startReassign(trade)}
                          disabled={isBlocked(trade)}
                          aria-label={t('handover.reassignAria', { trade: trade.trade_id })}
                          className="rounded px-2.5 py-1 text-xs font-semibold bg-emerald-500/15 text-emerald-400 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t('handover.reassign')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {anyFrozen && <p className="mt-2 text-xs text-verdaxis-text-muted">{t('handover.frozenNote')}</p>}
        {anyManual && <p className="mt-2 text-xs text-verdaxis-text-muted">{t('handover.manualNote')}</p>}
        {truncated && <p className="mt-2 text-xs text-amber-400">{t('handover.truncated')}</p>}
        {alerts}
      </div>
    </ConfirmModal>
  );
};
