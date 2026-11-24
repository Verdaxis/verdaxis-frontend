import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAgentConversation } from '../hooks/useAgentConversation';
import { AgentComposer } from './AgentComposer';
import { AgentMessageList } from './AgentMessageList';

function Conversation() {
    const { t } = useTranslation('agent');
    const { rows, pending, error, ready, send } = useAgentConversation();
    return <>
        <AgentMessageList rows={rows} pending={pending} retry={send} />
        {error && <p role="alert" className="px-4 py-2 text-amber-800 dark:text-amber-200">{error.kind === 'rate_limited' && error.retryAfterSeconds !== undefined
            ? t('wait', { seconds: error.retryAfterSeconds }) : t(`error.${error.kind}`)}</p>}
        <AgentComposer send={send} pending={pending} disabled={!ready || pending || error?.kind === 'paused'} />
    </>;
}
export function AgentPanel({ paused, onClose }: { paused: boolean; onClose: () => void }) {
    const { t } = useTranslation('agent');
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); } };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onClose]);
    return <aside id="agent-panel" role="dialog" aria-labelledby="agent-title" className="absolute inset-y-0 right-0 z-30 flex w-[400px] max-w-full flex-col border-l border-slate-200 bg-white text-sm text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
        <div className="border-b border-slate-200 p-4 dark:border-slate-700"><div className="flex items-center justify-between">
            <h2 id="agent-title" className="text-lg font-semibold">{t('title')}</h2>
            <button autoFocus={paused} onClick={onClose} aria-label={t('close')} className="rounded-md p-2 hover:bg-slate-100 focus-visible:ring-2 dark:hover:bg-slate-800"><X size={18} /></button>
        </div><p className="mt-1 text-slate-600 dark:text-slate-300">{t('notice')}</p></div>
        {paused ? <p role="status" className="p-4">{t('error.paused')}</p> : <Conversation />}
    </aside>;
}
