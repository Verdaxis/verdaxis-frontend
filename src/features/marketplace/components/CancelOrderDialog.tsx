import { OrderBookOrder } from '../../../types';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';


import type { TFunction } from 'i18next';

interface CancelOrderDialogProps {
    isHistorySelected: boolean;
    pendingCancellation: OrderBookOrder | null;
    closeCancellationModal: () => void;
    confirmCancelOrder: () => Promise<void>;
    t: TFunction;
    cancellationOutcomeUnknown: boolean;
    cancellationLoading: boolean;
    cancellationReason: string;
    setCancellationReason: (reason: string) => void;
}

export function CancelOrderDialog({ isHistorySelected, pendingCancellation, closeCancellationModal, confirmCancelOrder, t, cancellationOutcomeUnknown, cancellationLoading, cancellationReason, setCancellationReason }: CancelOrderDialogProps) {
    return <>
            <ConfirmModal
                isOpen={!isHistorySelected && Boolean(pendingCancellation)}
                onClose={closeCancellationModal}
                onConfirm={() => { void confirmCancelOrder(); }}
                title={t('marketplace.cancel.title')}
                message={t(cancellationOutcomeUnknown ? 'marketplace.cancel.outcomeUnknown' : 'marketplace.cancel.message')}
                confirmText={t(cancellationOutcomeUnknown ? 'marketplace.cancel.retrySafely' : 'marketplace.cancel.confirm')}
                variant="danger"
                isLoading={cancellationLoading}
                confirmDisabled={!cancellationOutcomeUnknown && cancellationReason.trim().length < 3}
            >
                <label className="mb-2 block text-xs font-bold uppercase text-slate-500">
                    {t('marketplace.cancel.reasonLabel')}
                    <textarea
                        aria-label={t('marketplace.cancel.reasonLabel')}
                        autoFocus
                        rows={3}
                        maxLength={500}
                        value={cancellationReason}
                        disabled={cancellationLoading || cancellationOutcomeUnknown}
                        onChange={(event) => setCancellationReason(event.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                </label>
            </ConfirmModal>

    </>;
}
