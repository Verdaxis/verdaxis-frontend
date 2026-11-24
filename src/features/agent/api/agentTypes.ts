export type AgentStopReason = 'tool_limit' | 'contract_errors' | 'timeout' | 'model_failure';
export interface AgentQuestion { question: string; options: string[] }
export interface AgentDraftSummary {
    id: string;
    side: 'BID' | 'ASK';
    marketProduct: string;
    deliveryPoint: string;
    availabilityWindow: string;
    quantityMt: number;
    limitPriceUsd: number | null;
    expiresAt: string | null;
    status: 'draft' | 'confirmed' | 'rejected' | 'expired';
    createdAt: string;
    updatedAt: string;
}
export interface AgentDraft extends AgentDraftSummary {
    conversationId: string;
    termsDigest: string;
    sourceText: string;
}
export interface AgentTurn {
    reply: string;
    draftIds: string[];
    question: AgentQuestion | null;
    assistantSeq: number;
    stopped: AgentStopReason | null;
}
export interface AgentMessageInput {
    text: string;
    untrusted?: { label: string; text: string }[];
}
export interface AgentConversation {
    id: string;
    status: 'open' | 'closed';
    createdAt: string;
    updatedAt: string;
}
type DraftReference = Pick<AgentDraft, 'id' | 'status'>;
type Message<Reply, Text> = { seq: number; createdAt: string } & (
    | { role: 'user'; content: { text: Text } }
    | { role: 'assistant'; content: Reply }
);
export interface AgentHistory extends AgentConversation {
    messages: Message<Omit<AgentTurn, 'reply'> & { reply: string | null; drafts: DraftReference[] }, string | null>[];
    drafts: AgentDraftSummary[];
}
export class AgentError extends Error {
    constructor(readonly kind: 'paused' | 'rate_limited' | 'daily_budget' | 'busy' | 'unavailable' | 'invalid', readonly retryAfterSeconds?: number) {
        super(kind);
        this.name = 'AgentError';
    }
}

// Hand-written wire types: the backend does not publish these routes in OpenAPI.
export interface WireAgentDraftSummary {
    id: string;
    side: AgentDraft['side'];
    market_product: string;
    delivery_point: string;
    availability_window: string;
    quantity_mt: string;
    limit_price_usd: string | null;
    expires_at: string | null;
    status: AgentDraft['status'];
    created_at: string;
    updated_at: string;
}
export interface WireAgentDraft extends WireAgentDraftSummary {
    conversation_id: string;
    terms_digest: string;
    source_text: string;
}
