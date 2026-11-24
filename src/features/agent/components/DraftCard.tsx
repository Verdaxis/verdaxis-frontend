import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';
import type { QueryScope } from '../../../lib/query/keys';
import { api } from '../../../services/api';
import { formatQuantity, formatUsd } from '../../../utils/numberFormat';
import { agentKeys } from '../api/agentKeys';
import type { AgentDraft } from '../api/agentTypes';
import { SourceTextDialog } from './SourceTextDialog';

const cardStyle = 'space-y-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-600 dark:bg-slate-900';

function DraftTerms({ draft }: { draft: AgentDraft }) {
    const { t, i18n } = useTranslation('agent');
    const fields = [
        [t('draft.side'), t(`draft.${draft.side}`)],
        [t('draft.product'), draft.marketProduct],
        [t('draft.port'), draft.deliveryPoint],
        [t('draft.window'), draft.availabilityWindow],
        [t('draft.quantity'), formatQuantity(draft.quantityMt, i18n.language)],
        [t('draft.price'), draft.limitPriceUsd === null ? t('draft.noLimit') : formatUsd(draft.limitPriceUsd)],
        [t('draft.expiry'), draft.expiresAt ?? t('draft.noExpiry')],
    ];
    return (
        <dl className="space-y-1 text-sm">
            {fields.map(([label, value]) => (
                <div key={label} className="flex flex-wrap justify-between gap-x-2">
                    <dt className="text-slate-600 dark:text-slate-300">{label}</dt>
                    <dd className="font-medium text-slate-900 dark:text-slate-100">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

export function DraftCard({ id, scope }: { id: string; scope: QueryScope }) {
    const { t } = useTranslation('agent');
    const client = useQueryClient();
    const queryKey = agentKeys.draft(scope, id);
    const query = useQuery({
        queryKey,
        queryFn: () => api.agent.draft(id),
        staleTime: Infinity,
        retry: false,
        retryOnMount: false,
    });
    const [dialog, setDialog] = useState<'source' | 'discard' | null>(null);
    const [discarding, setDiscarding] = useState(false);
    const [discardFailed, setDiscardFailed] = useState(false);
    async function discard() {
        if (discarding) return;
        setDiscarding(true);
        setDiscardFailed(false);
        try {
            const updated = await api.agent.discardDraft(id);
            // Update an existing private entry only; logout may have removed it during the request.
            client.setQueriesData({ queryKey, exact: true }, updated);
        } catch {
            setDiscardFailed(true);
        } finally {
            setDialog(null);
            setDiscarding(false);
        }
    }
    const draft = query.data;
    if (!draft) {
        return (
            <div className="space-y-1 rounded-lg border p-3" aria-busy={query.isFetching}>
                {query.isError ? <>
                    <p role="alert">{t('draft.loadError')}</p>
                    <button onClick={() => void query.refetch()} className="underline">{t('retry')}</button>
                </> : t('draft.loading')}
            </div>
        );
    }
    return (
        <article className={cardStyle}>
            <h3 className="font-semibold">{t('draft.title')}</h3>
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-slate-700">
                {t(`draft.status.${draft.status}`)}
            </span>
            <DraftTerms draft={draft} />
            <div className="flex flex-wrap gap-3">
                <button onClick={() => setDialog('source')} className="underline">{t('draft.source')}</button>
                {draft.status === 'draft' && (
                    <button onClick={() => setDialog('discard')} className="underline">{t('draft.discard')}</button>
                )}
            </div>
            {discardFailed && <p role="alert">{t('draft.discardError')}</p>}
            <p className="text-xs text-slate-600 dark:text-slate-400">{t('draft.later')}</p>
            {dialog === 'source' && <SourceTextDialog text={draft.sourceText} close={() => setDialog(null)} />}
            {dialog === 'discard' && (
                <ConfirmModal
                    isOpen
                    compact
                    variant="danger"
                    title={t('draft.discardTitle')}
                    message={t('draft.discardMessage')}
                    confirmText={t('draft.discard')}
                    cancelText={t('cancel')}
                    isLoading={discarding}
                    onClose={() => setDialog(null)}
                    onConfirm={() => void discard()}
                />
            )}
        </article>
    );
}
