import React, { useState } from 'react';
import { ConfirmModal } from '../ui/ConfirmModal';

export interface MarketSupportConfirmation {
  external_instruction_reference: string;
  instruction_at: string;
  acknowledge_exact_terms: boolean;
  acknowledge_executable_standing_order: boolean;
}

export interface MarketSupportDraftSummary {
  side: 'BID' | 'ASK';
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
  supportReference: string;
  draft: MarketSupportDraftSummary;
  onBack: () => void;
  onConfirm: (confirmation: MarketSupportConfirmation) => void;
}

const formatExpiry = (value: string) => {
  if (!value) return 'Good till cancelled';
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
  const [exactTerms, setExactTerms] = useState(false);
  const [standingOrder, setStandingOrder] = useState(false);
  const valid = Boolean(externalReference.trim() && instructionTime && exactTerms && standingOrder);

  const submit = () => {
    if (!valid) return;
    onConfirm({
      external_instruction_reference: externalReference.trim(),
      instruction_at: new Date(instructionTime).toISOString(),
      acknowledge_exact_terms: exactTerms,
      acknowledge_executable_standing_order: standingOrder,
    });
  };

  const summaryRows = [
    ['Side', draft.side],
    ['Product', draft.product],
    ['Delivery point', draft.deliveryPoint],
    ['Availability window', draft.availabilityWindow],
    ['Quantity', `${draft.quantityMt.toLocaleString()} MT`],
    ['Price', `$${draft.pricePerMtUsd.toFixed(2)}/MT`],
    ['Expiry', formatExpiry(draft.expiresAt)],
    ...(draft.side === 'ASK' ? [
      ['Certification', draft.certificationScheme],
      ['Specification', draft.specificationStandard],
      ['MSDS', draft.msdsAvailable ? 'Available' : 'Not available'],
      ['Carbon intensity', `${draft.carbonIntensity} gCO₂e/MJ${draft.carbonIntensityMethod ? ` · ${draft.carbonIntensityMethod}` : ''}`],
      ['Feedstock', draft.feedstock],
      ['Origin', draft.origin],
    ] : []),
  ];

  return (
    <ConfirmModal
      isOpen
      onClose={onBack}
      onConfirm={submit}
      title="Confirm assisted order"
      message={`Review the exact ${draft.side} that will be created for ${organizationName}.`}
      confirmText={`Confirm and submit ${draft.side}`}
      cancelText="Back"
      variant="warning"
      confirmDisabled={!valid}
      maxWidth="lg"
      compact
    >
      <div className="mb-4 mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="text-sm font-bold">Frozen order terms</p>
        <dl className="mt-2.5 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
          {summaryRows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</dt>
              <dd className="mt-0.5 break-words text-[13px] font-semibold leading-4">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="space-y-3.5">
        <label className="block text-xs font-bold uppercase text-slate-500">
          External instruction reference
          <input autoFocus aria-label="External instruction reference" value={externalReference} onChange={(event) => setExternalReference(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm normal-case dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </label>
        <label className="block text-xs font-bold uppercase text-slate-500">
          Instruction time
          <input type="datetime-local" aria-label="Instruction time" max={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} value={instructionTime} onChange={(event) => setInstructionTime(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm normal-case dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
        </label>
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
          <label className="flex items-start gap-2 text-sm leading-5 text-slate-700 dark:text-slate-200"><input type="checkbox" aria-label="Exact terms acknowledgement" checked={exactTerms} onChange={(event) => setExactTerms(event.target.checked)} className="mt-0.5" /> I confirm the frozen terms above are exact.</label>
          <label className="flex items-start gap-2 text-sm leading-5 text-slate-700 dark:text-slate-200"><input type="checkbox" aria-label="Standing order acknowledgement" checked={standingOrder} onChange={(event) => setStandingOrder(event.target.checked)} className="mt-0.5" /> I understand this creates an executable post-only standing order.</label>
        </div>
      </div>
    </ConfirmModal>
  );
};
