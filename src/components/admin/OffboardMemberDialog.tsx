import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Loader2, RefreshCw, UserMinus } from 'lucide-react';
import {
  ApiError,
  ApiOutcomeUnknownError,
  EVIDENCE_CASE_REF_PATTERN,
  OFFBOARD_REASON_CODES,
  api,
} from '../../services/api';
import type { AdminOffboardPreview, AdminOffboardResult, OffboardReasonCode } from '../../services/api';
import { ConfirmModal } from '../ui/ConfirmModal';
import { offboardingError } from './adminErrors';
import { useOffboardingAdmin } from './offboardingAccess';

export interface OffboardTarget {
  id: string;
  email: string;
  name: string;
}

/** The part of a user row the dialog reads back after an uncertain result. */
export interface OffboardUserRecord {
  id: string;
  status: string;
  org_name: string | null;
}

interface OffboardMemberDialogProps {
  target: OffboardTarget;
  onClose: () => void;
  /** Reloads the user list and returns the fresh rows, or null when the reload failed. */
  onReload: () => Promise<OffboardUserRecord[] | null>;
  onOpenTrades: (target: OffboardTarget) => void;
}

type Stage = 'form' | 'submitting' | 'done' | 'already' | 'unknown';
type PreviewState = 'loading' | 'ready' | 'error';
type RereadState =
  | { state: 'loading' }
  | { state: 'found'; record: OffboardUserRecord }
  | { state: 'absent' }
  | { state: 'failed' };

const ALREADY_COMPLETED_CODE = 'OFFBOARD_ALREADY_COMPLETED';

const COUNT_ROWS = [
  ['openOrders', 'open_order_count'],
  ['pendingTrades', 'pending_trade_count'],
  ['confirmedTrades', 'confirmed_trade_count'],
  ['deliveredTrades', 'delivered_trade_count'],
] as const;

const fieldClass = 'mt-1.5 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-verdaxis-text';

export const OffboardMemberDialog: React.FC<OffboardMemberDialogProps> = ({
  target,
  onClose,
  onReload,
  onOpenTrades,
}) => {
  const { allowed } = useOffboardingAdmin();
  const { t } = useTranslation('admin');
  const translate = useRef({ t });
  translate.current = { t };

  const [stage, setStage] = useState<Stage>('form');
  const [previewState, setPreviewState] = useState<PreviewState>('loading');
  const [preview, setPreview] = useState<AdminOffboardPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState<'' | OffboardReasonCode>('');
  const [caseRef, setCaseRef] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AdminOffboardResult | null>(null);
  const [reread, setReread] = useState<RereadState | null>(null);
  const submitting = useRef(false);
  const previewRequest = useRef(0);

  const failureMessage = (cause: unknown, fallbackKey: string) =>
    offboardingError(cause, translate.current.t, fallbackKey);

  // Every read of the details voids any earlier confirmation.
  const loadPreview = useCallback(async () => {
    const request = ++previewRequest.current;
    setPreviewState('loading');
    setPreviewError(null);
    setPreview(null);
    setConfirmed(false);
    try {
      const next = await api.admin.offboardingPreview(target.id);
      if (next.user_id !== target.id) {
        throw new ApiError('The preview belongs to a different account.', 502, 'OFFBOARD_RESPONSE_MALFORMED');
      }
      if (request !== previewRequest.current) return;
      setPreview(next);
      setPreviewState('ready');
    } catch (cause) {
      if (request !== previewRequest.current) return;
      setPreviewError(failureMessage(cause, 'offboard.error.preview'));
      setPreviewState('error');
    }
  // failureMessage only reads the translation ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  useEffect(() => {
    void loadPreview();
    return () => { previewRequest.current += 1; };
  }, [loadPreview]);

  if (!allowed) return null;

  const caseRefValue = caseRef.trim();
  const caseRefValid = EVIDENCE_CASE_REF_PATTERN.test(caseRefValue);
  const canSubmit = stage === 'form'
    && previewState === 'ready'
    && preview !== null
    && reasonCode !== ''
    && caseRefValid
    && confirmed;

  const rereadUser = async () => {
    setReread({ state: 'loading' });
    const rows = await onReload();
    if (rows === null) {
      setReread({ state: 'failed' });
      return;
    }
    const record = rows.find(row => row.id === target.id);
    setReread(record ? { state: 'found', record } : { state: 'absent' });
  };

  const startOver = () => {
    setStage('form');
    setReread(null);
    setError(null);
    setConflict(false);
    void loadPreview();
  };

  const handleFailure = async (cause: unknown) => {
    if (cause instanceof ApiOutcomeUnknownError) {
      // The command may or may not have committed: read the user, never resend.
      setStage('unknown');
      await rereadUser();
      return;
    }
    if (cause instanceof ApiError && cause.status === 409) {
      if (cause.code === ALREADY_COMPLETED_CODE) {
        setStage('already');
        await onReload();
        return;
      }
      // The account changed under the admin: read both again, ask again.
      setStage('form');
      setConflict(true);
      setConfirmed(false);
      await Promise.all([onReload(), loadPreview()]);
      return;
    }
    setStage('form');
    setError(failureMessage(cause, 'offboard.error.submit'));
  };

  const submit = async () => {
    if (submitting.current || !canSubmit || !preview) return;
    submitting.current = true;
    setStage('submitting');
    setError(null);
    setConflict(false);
    try {
      const outcome = await api.admin.offboardUser(target.id, {
        reason_code: reasonCode,
        evidence_case_ref: caseRefValue,
        urgent,
        expected_organization_id: preview.organization_id,
      });
      setResult(outcome);
      setStage('done');
      // The change is committed; a failed reload must not hide that.
      void onReload();
    } catch (cause) {
      await handleFailure(cause);
    } finally {
      submitting.current = false;
    }
  };

  const companyLabel = preview
    ? preview.organization_name
      ?? (preview.organization_id ? t('offboard.companyUnnamed') : t('offboard.noCompany'))
    : '—';

  const rereadStatus = reread?.state === 'found' ? reread.record : null;

  let message = t('offboard.message');
  let confirmText = t('offboard.confirm');
  let cancelText = t('offboard.cancel');
  let variant: 'danger' | 'warning' | 'info' | 'success' = 'danger';
  let onConfirm: () => void = () => { void submit(); };
  let confirmDisabled = !canSubmit;
  let title = t('offboard.title');

  if (stage === 'done') {
    title = t('offboard.done.title');
    message = t('offboard.done.message');
    confirmText = t('offboard.done.trades');
    cancelText = t('offboard.close');
    variant = 'success';
    confirmDisabled = false;
    onConfirm = () => onOpenTrades(target);
  } else if (stage === 'already') {
    message = t('offboard.alreadyDone');
    confirmText = t('offboard.done.trades');
    cancelText = t('offboard.close');
    variant = 'info';
    confirmDisabled = false;
    onConfirm = () => onOpenTrades(target);
  } else if (stage === 'unknown') {
    message = t('offboard.unknown');
    confirmText = t('offboard.reread.check');
    cancelText = t('offboard.close');
    variant = 'warning';
    confirmDisabled = reread?.state === 'loading';
    onConfirm = () => { void rereadUser(); };
  }

  const showForm = stage === 'form' || stage === 'submitting';

  return (
    <ConfirmModal
      isOpen
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      variant={variant}
      isLoading={stage === 'submitting'}
      confirmDisabled={confirmDisabled}
      maxWidth="lg"
      compact
    >
      <div className="mt-5 space-y-4" data-testid="offboard-dialog-body">
        <div className="divide-y divide-verdaxis-border rounded-lg border border-verdaxis-border text-sm">
          {[
            [t('offboard.target'), target.name],
            [t('offboard.email'), target.email],
            [t('offboard.company'), previewState === 'ready' ? companyLabel : '—'],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-3 py-2">
              <span className="text-verdaxis-text-muted">{label}</span>
              <span className="font-semibold text-verdaxis-text">{value}</span>
            </div>
          ))}
        </div>

        {showForm && previewState === 'loading' && (
          <p className="flex items-center gap-2 text-sm text-verdaxis-text-muted" role="status">
            <Loader2 size={14} className="animate-spin" />
            {t('offboard.previewLoading')}
          </p>
        )}

        {showForm && previewState === 'error' && (
          <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <p>{previewError}</p>
            <button
              type="button"
              onClick={() => { void loadPreview(); }}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2"
            >
              <RefreshCw size={12} />
              {t('offboard.previewRetry')}
            </button>
          </div>
        )}

        {showForm && previewState === 'ready' && preview && (
          <>
            <section aria-labelledby="offboard-counts-title" className="rounded-lg border border-verdaxis-border p-3">
              <h4 id="offboard-counts-title" className="text-xs font-semibold uppercase text-verdaxis-text-muted">
                {t('offboard.counts.title')}
              </h4>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {COUNT_ROWS.map(([key, field]) => (
                  <React.Fragment key={key}>
                    <dt className="text-verdaxis-text-muted">{t(`offboard.counts.${key}`)}</dt>
                    <dd className="text-right font-semibold text-verdaxis-text" data-testid={`offboard-count-${key}`}>
                      {preview[field]}
                    </dd>
                  </React.Fragment>
                ))}
              </dl>
              <p className="mt-2 text-xs text-verdaxis-text-muted">{t('offboard.counts.note')}</p>
            </section>

            <section aria-labelledby="offboard-warning-title" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <h4 id="offboard-warning-title" className="text-xs font-semibold uppercase text-amber-500">
                {t('offboard.warning.title')}
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-verdaxis-text">
                <li>{t('offboard.warning.access')}</li>
                <li>{t('offboard.warning.pending')}</li>
                <li>{t('offboard.warning.orders')}</li>
                <li>{t('offboard.warning.confirmed')}</li>
              </ul>
            </section>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="text-sm text-verdaxis-text-muted">
                <label htmlFor="offboard-reason">{t('offboard.reason')}</label>
                <select
                  id="offboard-reason"
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value as '' | OffboardReasonCode)}
                  disabled={stage === 'submitting'}
                  className={fieldClass}
                >
                  <option value="">{t('offboard.selectReason')}</option>
                  {OFFBOARD_REASON_CODES.map(code => (
                    <option key={code} value={code}>{t(`offboard.reasonCode.${code}`)}</option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-verdaxis-text-muted">
                <label htmlFor="offboard-case-ref">{t('offboard.caseRef')}</label>
                <input
                  id="offboard-case-ref"
                  value={caseRef}
                  onChange={(event) => setCaseRef(event.target.value)}
                  disabled={stage === 'submitting'}
                  autoComplete="off"
                  maxLength={80}
                  aria-describedby="offboard-case-ref-hint"
                  aria-invalid={caseRefValue !== '' && !caseRefValid}
                  className={`${fieldClass} font-mono`}
                />
              </div>
              <p id="offboard-case-ref-hint" className="text-xs text-verdaxis-text-muted sm:col-span-2">
                {t('offboard.caseRefHint')}
                {caseRefValue !== '' && !caseRefValid && (
                  <span className="mt-1 block text-red-400">{t('offboard.caseRefInvalid')}</span>
                )}
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-verdaxis-text">
              <input
                type="checkbox"
                checked={urgent}
                onChange={(event) => setUrgent(event.target.checked)}
                disabled={stage === 'submitting'}
                className="mt-0.5"
              />
              <span>{t('offboard.urgent')}</span>
            </label>

            <label className="flex items-start gap-2 text-sm font-semibold text-verdaxis-text">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={stage === 'submitting'}
                className="mt-0.5"
              />
              <span>{t('offboard.confirmCheck')}</span>
            </label>
          </>
        )}

        {stage === 'done' && result?.operation_id && (
          <p className="text-sm text-verdaxis-text-muted">
            {t('offboard.done.operation')}
            {': '}
            <span className="font-mono text-verdaxis-text">{result.operation_id}</span>
          </p>
        )}

        {stage === 'unknown' && (
          <section aria-labelledby="offboard-reread-title" className="rounded-lg border border-verdaxis-border p-3 text-sm" data-testid="offboard-reread">
            <h4 id="offboard-reread-title" className="text-xs font-semibold uppercase text-verdaxis-text-muted">
              {t('offboard.reread.title')}
            </h4>
            {(!reread || reread.state === 'loading') && (
              <p className="mt-2 flex items-center gap-2 text-verdaxis-text-muted" role="status">
                <Loader2 size={14} className="animate-spin" />
                {t('offboard.reread.loading')}
              </p>
            )}
            {reread?.state === 'failed' && <p className="mt-2 text-amber-400">{t('offboard.reread.failed')}</p>}
            {reread?.state === 'absent' && <p className="mt-2 text-amber-400">{t('offboard.reread.notListed')}</p>}
            {rereadStatus && (
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="text-verdaxis-text-muted">{t('offboard.reread.status')}</span>
                <span className="font-semibold text-verdaxis-text">
                  {t(`users.status.${rereadStatus.status}`, { defaultValue: t('users.status.unknown') })}
                </span>
                <span className="font-semibold text-verdaxis-text">{rereadStatus.org_name ?? t('offboard.noCompany')}</span>
              </div>
            )}
            <button
              type="button"
              onClick={startOver}
              disabled={reread?.state === 'loading'}
              className="mt-3 text-xs font-semibold text-verdaxis underline underline-offset-2 disabled:opacity-50"
            >
              {t('offboard.reread.restart')}
            </button>
          </section>
        )}

        {conflict && stage === 'form' && (
          <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            {t('offboard.conflict')}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </ConfirmModal>
  );
};

interface OffboardRowActionsProps {
  user: { id: string; email: string; role: string; status: string; offboarded_at?: string | null };
  onOffboard: () => void;
  onTrades: () => void;
}

/**
 * Per-row actions of the Users table. Nothing renders unless the release
 * switch is on and the signed-in account is an ADMIN; never for another admin,
 * for the signed-in admin, or for a pending applicant (Reject covers those).
 */
export const OffboardRowActions: React.FC<OffboardRowActionsProps> = ({ user, onOffboard, onTrades }) => {
  const { allowed, actorId } = useOffboardingAdmin();
  const { t } = useTranslation('admin');
  if (!allowed || user.role === 'ADMIN' || user.id === actorId || user.status === 'PENDING') return null;

  const offboarded = Boolean(user.offboarded_at);
  const showTrades = offboarded || user.status === 'REJECTED';
  return (
    <div className="mt-1.5 flex flex-wrap justify-end gap-2 first:mt-0">
      {!offboarded && (
        <button
          type="button"
          onClick={onOffboard}
          aria-label={t('users.offboardAria', { email: user.email })}
          className="flex items-center gap-1 rounded border border-red-500/40 px-2.5 py-1 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
        >
          <UserMinus size={12} />
          {t('users.offboard')}
        </button>
      )}
      {showTrades && (
        <button
          type="button"
          onClick={onTrades}
          aria-label={t('users.handoverAria', { email: user.email })}
          className="flex items-center gap-1 rounded border border-verdaxis-border px-2.5 py-1 text-xs font-semibold text-verdaxis-text-muted transition-colors hover:text-verdaxis"
        >
          <ArrowRightLeft size={12} />
          {t('users.handover')}
        </button>
      )}
    </div>
  );
};
