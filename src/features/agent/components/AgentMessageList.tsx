import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentRow } from '../hooks/useAgentConversation';
import type { AgentMessageInput, AgentQuestion, AgentTurn } from '../api/agentTypes';

type Retry = (input: AgentMessageInput) => Promise<boolean>;

function Question({ question }: { question: AgentQuestion }) {
    return (
        <>
            <p className="whitespace-pre-wrap">{question.question}</p>
            <ul className="list-disc pl-5">
                {question.options.map((option, index) => <li key={index}>{option}</li>)}
            </ul>
        </>
    );
}

interface RetryProps {
    hasDrafts: boolean;
    pending: boolean;
    resend: () => void;
}

function RetryAction({ hasDrafts, pending, resend }: RetryProps) {
    const { t } = useTranslation('agent');
    const [confirm, setConfirm] = useState(false);
    if (!confirm) {
        return (
            <button disabled={pending} onClick={() => hasDrafts ? setConfirm(true) : resend()} className="underline">
                {t('retry')}
            </button>
        );
    }
    return (
        <div className="space-y-2">
            <p>{t('retryWarning')}</p>
            <button
                disabled={pending}
                onClick={() => {
                    setConfirm(false);
                    resend();
                }}
                className="mr-4 underline"
            >
                {t('resend')}
            </button>
            <button onClick={() => setConfirm(false)} className="underline">
                {t('cancel')}
            </button>
        </div>
    );
}

interface ListProps {
    rows: AgentRow[];
    pending: boolean;
    retry: Retry;
}
interface ReplyProps extends Pick<ListProps, 'pending' | 'retry'> {
    turn: AgentTurn;
    input?: AgentMessageInput;
}

function Reply({ turn, input, retry, pending }: ReplyProps) {
    const { t } = useTranslation('agent');
    const draftCount = turn.draftIds.length;
    return (
        <div className="mr-8 space-y-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
            <span className="sr-only">{t('assistantRow')}</span>
            {turn.reply !== turn.question?.question && <p className="whitespace-pre-wrap">{turn.reply}</p>}
            {turn.question && <Question question={turn.question} />}
            {turn.stopped && <p>{t(`stop.${turn.stopped}`)}</p>}
            {draftCount > 0 && <p>{t('saved', { count: draftCount })}</p>}
            {turn.stopped && input && (
                <RetryAction hasDrafts={draftCount > 0} pending={pending} resend={() => void retry(input)} />
            )}
        </div>
    );
}

export function AgentMessageList({ rows, pending, retry }: ListProps) {
    const { t } = useTranslation('agent');
    const log = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (log.current) log.current.scrollTop = log.current.scrollHeight;
    }, [rows, pending]);
    return (
        <div
            role="log"
            aria-label={t('title')}
            ref={log}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto break-words p-4"
        >
            {rows.map((row, index) => row.role === 'user' ? (
                <div key={index} className="ml-8 rounded-lg bg-verdaxis/10 p-3 dark:bg-verdaxis/20">
                    <span className="sr-only">{t('buyerRow')}</span>
                    <p className="whitespace-pre-wrap">{row.text}</p>
                </div>
            ) : (
                <Reply key={index} turn={row.turn} input={row.input} retry={retry} pending={pending} />
            ))}
            {pending && <p aria-live="polite">{t('pending')}</p>}
        </div>
    );
}
