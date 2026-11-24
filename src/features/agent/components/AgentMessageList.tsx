import type { QueryScope } from '../../../lib/query/keys';
import { DraftCard } from './DraftCard';
import { QuestionCard } from './QuestionCard';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentRow } from '../hooks/useAgentConversation';
import type { AgentMessageInput, AgentTurn } from '../api/agentTypes';

type Retry = (input: AgentMessageInput) => Promise<boolean>;

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
    scope: QueryScope;
    rows: AgentRow[];
    pending: boolean;
    retry: Retry;
}
interface ReplyProps extends Pick<ListProps, 'pending' | 'retry' | 'scope'> {
    newest: boolean;
    turn: AgentTurn;
    input?: AgentMessageInput;
}

function Reply({ turn, input, retry, pending, scope, newest }: ReplyProps) {
    const { t } = useTranslation('agent');
    const draftCount = turn.draftIds.length;
    return (
        <div className="mr-8 space-y-2 rounded-lg bg-slate-100 p-3 dark:bg-slate-800">
            <span className="sr-only">{t('assistantRow')}</span>
            {turn.reply !== turn.question?.question && <p className="whitespace-pre-wrap">{turn.reply}</p>}
            {turn.question && (
                <QuestionCard
                    question={turn.question}
                    active={newest && !pending}
                    answer={text => void retry({ text, untrusted: [] })}
                />
            )}
            {turn.stopped && <p>{t(`stop.${turn.stopped}`)}</p>}
            {turn.stopped && draftCount > 0 && <p>{t('saved', { count: draftCount })}</p>}
            {turn.draftIds.map(id => <DraftCard key={id} id={id} scope={scope} />)}
            {turn.stopped && input && (
                <RetryAction hasDrafts={draftCount > 0} pending={pending} resend={() => void retry(input)} />
            )}
        </div>
    );
}

export function AgentMessageList({ rows, pending, retry, scope }: ListProps) {
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
                <Reply
                    key={index}
                    turn={row.turn}
                    input={row.input}
                    retry={retry}
                    pending={pending}
                    scope={scope}
                    newest={index === rows.length - 1 && !row.hasLaterMessage}
                />
            ))}
            {pending && <p aria-live="polite">{t('pending')}</p>}
        </div>
    );
}
