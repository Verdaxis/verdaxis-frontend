import React, { useEffect, useRef, useState } from 'react';
import { ConfirmModal } from '../ui/ConfirmModal';

export interface MarketSupportConfirmation {
  external_instruction_reference: string;
  instruction_at: string;
  evidence_excerpt: string;
  acknowledge_exact_terms: boolean;
  acknowledge_executable_standing_order: boolean;
}

export interface MarketSupportDraftSummary {
  product: string;
  deliveryPoint: string;
  availabilityWindow: string;
  quantityMt: number;
  pricePerMtUsd: number;
  expiresAt: string;
  certificationScheme: string;
  specificationStandard: string;
  msdsAvailable: boolean;
  carbonIntensity: number;
  carbonIntensityMethod?: string | null;
  feedstock: string;
  origin: string;
}

interface MarketSupportFinalConfirmationProps {
  organizationName: string;
  supplierName: string;
  supportReference: string;
  draft: MarketSupportDraftSummary;
  onBack: () => void;
  onConfirm: (confirmation: MarketSupportConfirmation) => void;
}

const formatExpiry = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'UTC',
      }) + ' UTC';
};

export const MarketSupportFinalConfirmation: React.FC<MarketSupportFinalConfirmationProps> = ({
  organizationName,
  supplierName,
  supportReference,
  draft,
  onBack,
  onConfirm,
}) => {
  const [externalReference, setExternalReference] = useState(supportReference);
  const [instructionTime, setInstructionTime] = useState(() => {
    const date = new Date();
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  });
  const [evidence, setEvidence] = useState('');
  const [exactTerms, setExactTerms] = useState(false);
  const [standingAsk, setStandingAsk] = useState(false);
  const evidenceRef = useRef<HTMLTextAreaElement>(null);
  const valid = Boolean(externalReference.trim() && instructionTime && evidence.trim() && exactTerms && standingAsk);

  useEffect(() => {
    evidenceRef.current?.focus();
  }, []);

  const submit = () => {
    if (!valid) return;
    onConfirm({
      external_instruction_reference: externalReference.trim(),
      instruction_at: new Date(instructionTime).toISOString(),
      evidence_excerpt: evidence.trim(),
      acknowledge_exact_terms: exactTerms,
      acknowledge_executable_standing_order: standingAsk,
    });
  };

  const summaryRows = [
    ['Product', draft.product],
    ['Delivery point', draft.deliveryPoint],
    ['Availability window', draft.availabilityWindow],
    ['Quantity', `${draft.quantityMt.toLocaleString()} MT`],
    ['Price', `$${draft.pricePerMtUsd.toFixed(2)}/MT`],
    ['Expiry', formatExpiry(draft.expiresAt)],
    ['Certification', draft.certificationScheme],
    ['Specification', draft.specificationStandard],
    ['MSDS', draft.msdsAvailable ? 'Available' : 'Not available'],
    ['Carbon intensity', `${draft.carbonIntensity} gCO₂e/MJ${draft.carbonIntensityMethod ? ` · ${draft.carbonIntensityMethod}` : ''}`],
    ['Feedstock', draft.feedstock],
    ['Origin', draft.origin],
  ];

  return (
    <ConfirmModal
      isOpen
      onClose={onBack}
      onConfirm={submit}
      title="Final support confirmation"
      message={`Confirm the exact ASK that will be created for ${organizationName} as ${supplierName}.`}
      confirmText="Confirm and submit ASK"
      cancelText="Back"
      variant="warning"
      confirmDisabled={!valid}
    >
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-bold">Frozen draft terms</p>
        <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
          {summaryRows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="inline text-[10px] font-bold uppercase tracking-wide opacity-70">{label}: </dt>
              <dd className="inline break-words font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase text-slate-500">
          External instruction reference
          <input aria-label="External instruction reference" value={externalReference} onChange={(event) => setExternalReference(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </label>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Instruction time
          <input type="datetime-local" aria-label="Instruction time" max={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} value={instructionTime} onChange={(event) => setInstructionTime(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </label>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Evidence excerpt (transient; it is not stored in the browser)
          <textarea ref={evidenceRef} aria-label="Evidence excerpt" value={evidence} onChange={(event) => setEvidence(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" aria-label="Exact terms acknowledgement" checked={exactTerms} onChange={(event) => setExactTerms(event.target.checked)} className="mt-0.5" /> I confirm the frozen terms above are exact.</label>
        <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" aria-label="Standing ASK acknowledgement" checked={standingAsk} onChange={(event) => setStandingAsk(event.target.checked)} className="mt-0.5" /> I understand this creates an executable standing ASK.</label>
      </div>
    </ConfirmModal>
  );
};
