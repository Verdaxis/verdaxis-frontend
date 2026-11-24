import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AgentError } from '../api/agentTypes';
import { useAgentConversation } from '../hooks/useAgentConversation';
import { AgentComposer } from './AgentComposer';
import { AgentMessageList } from './AgentMessageList';

function ErrorLine({ error, retryLoad }: { error: AgentError; retryLoad?: () => void }) {
    const { t } = useTranslation('agent');
    const message = error.kind === 'rate_limited' && error.retryAfterSeconds !== undefined
        ? t('wait', { seconds: error.retryAfterSeconds })
        : t(`error.${error.kind}`);
    return (
        <p role="alert" className="px-4 py-2 text-amber-800 dark:text-amber-200">
            {message}
            {retryLoad && (
                <button onClick={retryLoad} className="ml-2 underline focus-visible:ring-2">
                    {t('retry')}
                </button>
            )}
        </p>
    );
}

function Conversation() {
    const { rows, pending, error, ready, send, retryLoad } = useAgentConversation();
    return (
        <>
            <AgentMessageList rows={rows} pending={pending} retry={send} />
            {error && <ErrorLine error={error} retryLoad={ready ? undefined : retryLoad} />}
            <AgentComposer send={send} pending={pending} disabled={!ready || pending || error?.kind === 'paused'} />
        </>
    );
}

const panelStyle = [
    'absolute inset-y-0 right-0 z-30 flex w-[400px] max-w-full flex-col border-l',
    'border-slate-200 bg-white text-sm text-slate-900 shadow-xl',
    'dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
].join(' ');

export function AgentPanel({ paused, onClose }: { paused: boolean; onClose: () => void }) {
    const { t } = useTranslation('agent');
    useEffect(() => {
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            onClose();
        }
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [onClose]);
    return (
        <aside id="agent-panel" role="dialog" aria-labelledby="agent-title" className={panelStyle}>
            <div className="border-b border-slate-200 p-4 dark:border-slate-700">
                <div className="flex items-center justify-between">
                    <h2 id="agent-title" className="text-lg font-semibold">{t('title')}</h2>
                    <button
                        autoFocus={paused}
                        onClick={onClose}
                        aria-label={t('close')}
                        className="rounded-md p-2 hover:bg-slate-100 focus-visible:ring-2 dark:hover:bg-slate-800"
                    >
                        <X size={18} />
                    </button>
                </div>
                <p className="mt-1 text-slate-600 dark:text-slate-300">{t('notice')}</p>
            </div>
            {paused ? <p role="status" className="p-4">{t('error.paused')}</p> : <Conversation />}
        </aside>
    );
}
