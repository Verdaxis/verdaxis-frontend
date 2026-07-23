import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { MarketSupportEntry, MarketSupportStartInput, SupportOrganization } from '../../../types/marketSupport';

interface MarketSupportEntryDialogProps {
  open: boolean;
  organization: SupportOrganization;
  entry: MarketSupportEntry | null;
  loading?: boolean;
  error?: string | null;
  onStart: (input: MarketSupportStartInput) => void | Promise<void>;
  onClose: () => void;
}

export const MarketSupportEntryDialog: React.FC<MarketSupportEntryDialogProps> = ({
  open,
  organization,
  entry,
  loading = false,
  error = null,
  onStart,
  onClose,
}) => {
  const dialogRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [principalId, setPrincipalId] = useState('');
  const [supportReference, setSupportReference] = useState('');
  const [scopeConfirmed, setScopeConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const principals = entry?.eligiblePrincipals ?? [];
  const selectedPrincipalId = principalId || principals[0]?.id || '';
  const canSubmit = Boolean(entry?.eligible && selectedPrincipalId && supportReference.trim() && scopeConfirmed && !loading && !submitting);

  const reason = useMemo(() => {
    if (entry?.reason) return entry.reason;
    if (organization.type !== 'REAL') return 'Only approved REAL supplier organizations are supported.';
    if (!entry?.eligiblePrincipals.length) return 'No approved, email-verified, execution-eligible supplier is available.';
    return null;
  }, [entry, organization.type]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const selector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(selector) ?? []);
    focusable()[0]?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submittingRef.current) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) return;
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onStart({
        organizationId: organization.id,
        principalId: selectedPrincipalId,
        supportReference: supportReference.trim(),
        scope: ['ASK_CREATE', 'ASK_CANCEL'],
      });
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : 'Could not enter the supplier platform.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="market-support-entry-title">
      <form ref={dialogRef} onSubmit={submit} className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-verdaxis-border bg-verdaxis-bg p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-verdaxis">Market Support</p>
            <h2 id="market-support-entry-title" className="mt-1 text-xl font-bold text-verdaxis-text">Enter supplier platform</h2>
            <p className="mt-1 text-sm text-verdaxis-text-muted">Act for {organization.name} using the normal supplier routes.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-verdaxis-text-muted hover:bg-verdaxis-border/30"><X size={18} /></button>
        </div>

        {(error || submitError) && <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error || submitError}</p>}

        {loading ? (
          <p className="mt-6 text-sm text-verdaxis-text-muted">Checking organization eligibility…</p>
        ) : !entry?.eligible ? (
          <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{reason ?? 'This organization is not eligible for Market Support.'}</span>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-verdaxis-text">
              Accountable supplier
              <select value={selectedPrincipalId} onChange={(event) => setPrincipalId(event.target.value)} className="mt-1 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-sm">
                {principals.map((principal) => <option key={principal.id} value={principal.id}>{principal.name} · {principal.email}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-verdaxis-text">
              Support reference
              <input aria-label="Support reference" value={supportReference} onChange={(event) => setSupportReference(event.target.value)} placeholder="Case, ticket, or instruction reference" className="mt-1 w-full rounded-lg border border-verdaxis-border bg-verdaxis-bg px-3 py-2 text-sm" />
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-verdaxis-border bg-verdaxis-border/10 p-3 text-sm text-verdaxis-text">
              <input type="checkbox" aria-label="Scope confirmation" checked={scopeConfirmed} onChange={(event) => setScopeConfirmed(event.target.checked)} className="mt-0.5" />
              <span>I understand this context permits only supplier ASK creation and cancellation for this organization.</span>
            </label>
          </div>
        )}

        <div className="mt-7 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-verdaxis-border px-4 py-2 text-sm font-semibold text-verdaxis-text-muted hover:text-verdaxis-text">Cancel</button>
          <button type="submit" disabled={!canSubmit} className="rounded-lg bg-verdaxis px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Enter supplier platform</button>
        </div>
      </form>
    </div>
  );
};
