import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentRow } from '../hooks/useAgentConversation';
import type { AgentMessageInput, AgentTurn } from '../api/agentTypes';

type Retry = (input: AgentMessageInput) => Promise<boolean>;
function Reply({ turn, input, retry, pending }: { turn: AgentTurn; input?: AgentMessageInput; retry: Retry; pending: boolean }) {
    const { t } = useTranslation('agent');
    const [confirm, setConfirm] = useState(false);
    function resend() { setConfirm(false); if (input) void retry(input); }
    return <div className="space-y-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
        <p className="whitespace-pre-wrap">{turn.reply}</p>
        {turn.question && <><p>{turn.question.question}</p><ul className="list-disc pl-5">{turn.question.options.map((option, index) => <li key={index}>{option}</li>)}</ul></>}
        {turn.stopped && <p>{t(`stop.${turn.stopped}`)}</p>}
        {turn.draftIds.length > 0 && <p>{t('saved', { count: turn.draftIds.length })}</p>}
        {turn.stopped && input && (confirm ? <div className="space-y-2"><p>{t('retryWarning')}</p>
            <button disabled={pending} onClick={resend} className="mr-4 underline">{t('resend')}</button>
            <button onClick={() => setConfirm(false)} className="underline">{t('cancel')}</button></div> :
            <button disabled={pending} onClick={() => turn.draftIds.length ? setConfirm(true) : resend()} className="underline">{t('retry')}</button>)}
    </div>;
}
export function AgentMessageList({ rows, pending, retry }: { rows: AgentRow[]; pending: boolean; retry: Retry }) {
    const { t } = useTranslation('agent');
    const log = useRef<HTMLDivElement>(null);
    useEffect(() => { if (log.current) log.current.scrollTop = log.current.scrollHeight; }, [rows, pending]);
    return <div role="log" aria-label={t('title')} ref={log} className="min-h-0 flex-1 space-y-3 overflow-y-auto break-words p-4">
        {rows.map((row, index) => row.role === 'user' ? <p key={index} className="ml-8 whitespace-pre-wrap rounded-lg border border-slate-300 p-3 dark:border-slate-600">{row.text}</p> :
            <Reply key={index} turn={row.turn} input={row.input} retry={retry} pending={pending} />)}
        {pending && <p>{t('pending')}</p>}
    </div>;
}
