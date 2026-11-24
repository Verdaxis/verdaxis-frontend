import { mapAgentDraft, mapAgentDraftSummary } from '../../../api/mappers';
import { AgentError, type AgentConversation, type AgentHistory, type AgentMessageInput, type AgentStopReason, type AgentTurn, type WireAgentDraft, type WireAgentDraftSummary } from './agentTypes';

interface WireConversation {
    id: string;
    status: AgentConversation['status'];
    created_at: string;
    updated_at: string;
}
interface WireTurn<Reply, Draft> {
    reply: Reply;
    drafts: Draft[];
    question: { question: string; options?: string[] | null } | null;
    assistant_seq: number;
    stopped: AgentStopReason | null;
}
type HistoryReference = Pick<WireAgentDraft, 'id' | 'status'>;
type WireMessage = { seq: number; created_at: string } & (
    | { role: 'user'; content: { text: string | null } }
    | { role: 'assistant'; content: WireTurn<string | null, HistoryReference> }
);
interface WireHistory extends WireConversation {
    messages: WireMessage[];
    drafts: WireAgentDraftSummary[];
}

const mapConversation = (row: WireConversation): AgentConversation => ({
    id: row.id, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
});
function mapTurn<R extends string | null>(turn: WireTurn<R, { id: string }>) {
    return {
        reply: turn.reply, draftIds: turn.drafts.map(draft => draft.id),
        question: turn.question && { question: turn.question.question, options: turn.question.options ?? [] },
        assistantSeq: turn.assistant_seq, stopped: turn.stopped,
    };
}
function mapMessage(row: WireMessage): AgentHistory['messages'][number] {
    const meta = { seq: row.seq, createdAt: row.created_at };
    return row.role === 'user'
        ? { ...meta, role: row.role, content: row.content }
        : { ...meta, role: row.role, content: { ...mapTurn(row.content), drafts: row.content.drafts } };
}

// Rust validates Unicode scalar values, not UTF-16 code units. White_Space
// matches Rust's trim; surrogate code points cannot be encoded as Rust strings.
function validText(value: string, max: number): boolean {
    return /[^\p{White_Space}]/u.test(value) && !/[\0\uD800-\uDFFF]/u.test(value) && [...value].length <= max;
}
const conversations = '/agent/conversations';
const conversationPath = (id: string) => `${conversations}/${encodeURIComponent(id)}`;
const draftPath = (id: string) => `/agent/drafts/${encodeURIComponent(id)}`;
type Request = <T>(path: string, options?: RequestInit, timeoutMs?: number) => Promise<T>;
// The turn deadline is 90 s; allow time for backend cleanup and the response.
const turnTimeoutMs = 120_000;

export function createAgentApi(request: Request) {
    return {
        async createConversation(): Promise<AgentConversation> {
            return mapConversation(await request<WireConversation>(conversations, { method: 'POST', body: '{}' }));
        },
        async listConversations(): Promise<AgentConversation[]> {
            const result = await request<{ conversations: WireConversation[] }>(conversations);
            return result.conversations.map(mapConversation);
        },
        async history(id: string): Promise<AgentHistory> {
            const row = await request<WireHistory>(conversationPath(id));
            return { ...mapConversation(row), messages: row.messages.map(mapMessage), drafts: row.drafts.map(mapAgentDraftSummary) };
        },
        async sendMessage(id: string, { text, untrusted = [] }: AgentMessageInput): Promise<AgentTurn> {
            if (!validText(text, 4000) || untrusted.length > 3 || untrusted.some(block => !validText(block.label, 60) || !validText(block.text, 20000))) {
                throw new AgentError('invalid');
            }
            return mapTurn(await request<WireTurn<string, { id: string }>>(`${conversationPath(id)}/messages`, {
                method: 'POST', body: JSON.stringify({ text, untrusted }),
            }, turnTimeoutMs));
        },
        async draft(id: string) {
            return mapAgentDraft(await request<WireAgentDraft>(draftPath(id)));
        },
        async discardDraft(id: string) {
            return mapAgentDraft(await request<WireAgentDraft>(`${draftPath(id)}/discard`, { method: 'POST' }));
        },
    };
}
