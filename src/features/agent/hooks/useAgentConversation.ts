import { useEffect, useRef, useState } from 'react';
import { api } from '../../../services/api';
import { AgentError, type AgentHistory, type AgentMessageInput, type AgentTurn } from '../api/agentTypes';

export type AgentRow =
    | { role: 'user'; text: string }
    | { role: 'assistant'; turn: AgentTurn; input?: AgentMessageInput };

function historyRows(history: AgentHistory) {
    const rows: AgentRow[] = [];
    for (const row of [...history.messages].sort((a, b) => a.seq - b.seq)) {
        if (row.role === 'user') {
            if (row.content.text !== null) rows.push({ role: 'user', text: row.content.text });
        } else if (row.content.reply !== null) {
            // History omits untrusted blocks. Never reconstruct a resend from partial input.
            rows.push({ role: 'assistant', turn: { ...row.content, reply: row.content.reply } });
        }
    }
    return rows;
}
const asAgentError = (error: unknown) => error instanceof AgentError ? error : new AgentError('unavailable');

export function useAgentConversation() {
    const [rows, setRows] = useState<AgentRow[]>([]);
    const [ready, setReady] = useState(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<AgentError | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const active = useRef(false);
    const sending = useRef(false);
    const conversationId = useRef<string | null>(null);
    useEffect(() => {
        let current = true;
        active.current = true;
        async function resume() {
            // listConversations returns most recently updated first.
            const newest = (await api.agent.listConversations()).find(row => row.status === 'open');
            if (!current) return;
            if (newest) {
                const history = await api.agent.history(newest.id);
                if (!current) return;
                conversationId.current = newest.id;
                setRows(historyRows(history));
            }
            setReady(true);
        }
        void resume().catch(cause => {
            if (current) setError(asAgentError(cause));
        });
        return () => {
            current = false;
            active.current = false;
        };
    }, [loadAttempt]);

    function retryLoad() {
        setError(null);
        setLoadAttempt(previous => previous + 1);
    }

    async function send(input: AgentMessageInput) {
        if (!active.current || !ready || sending.current) return false;
        sending.current = true;
        const buyerRow: AgentRow = { role: 'user', text: input.text };
        setRows(previous => [...previous, buyerRow]);
        setPending(true);
        setError(null);
        try {
            if (!conversationId.current) {
                const conversation = await api.agent.createConversation();
                conversationId.current = conversation.id;
            }
            if (!active.current) return false;
            const turn = await api.agent.sendMessage(conversationId.current, input);
            if (!active.current) return false;
            const retryInput = turn.stopped ? input : undefined;
            setRows(previous => [...previous, { role: 'assistant', turn, input: retryInput }]);
            return true;
        } catch (cause) {
            if (active.current) {
                setRows(previous => previous.filter(row => row !== buyerRow));
                setError(asAgentError(cause));
            }
            return false;
        } finally {
            sending.current = false;
            if (active.current) setPending(false);
        }
    }
    return { rows, error, ready, pending, send, retryLoad };
}
