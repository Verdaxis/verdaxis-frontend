import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { setAccessToken } from '../services/authToken';
import { agentKeys } from '../features/agent/api/agentKeys';

const conversation = { id: 'c', status: 'open', created_at: 'start', updated_at: 'end' };
const summary = { id: 'd', side: 'BID', market_product: 'B30', delivery_point: 'Singapore', availability_window: 'spot', quantity_mt: '12.50', limit_price_usd: null, expires_at: null, status: 'expired', created_at: 'start', updated_at: 'end' };
const turn = { assistant_seq: 2, reply: '', citations: [], drafts: [{ id: 'd', content: {} }], question: { question: 'Which port?', options: null }, stopped: 'tool_limit' };
const mockResponse = (data: unknown, status = 200, headers?: HeadersInit) => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockImplementation(async () => new Response(JSON.stringify(data), { status, headers }));
    vi.stubGlobal('fetch', fetch);
    return fetch;
};
afterEach(() => { setAccessToken(null); vi.unstubAllGlobals(); });

it('creates and lists private conversations without reusing reads', async () => {
    const identity = crypto.randomUUID();
    setAccessToken(identity);
    const create = mockResponse(conversation, 201);
    const expected = { id: 'c', status: 'open', createdAt: 'start', updatedAt: 'end' };
    expect(await api.agent.createConversation()).toEqual(expected);
    expect(create.mock.calls[0][1]).toMatchObject({ method: 'POST', body: '{}' });
    const list = mockResponse({ conversations: [conversation] });
    expect(await api.agent.listConversations()).toEqual([expected]);
    await api.agent.listConversations();
    expect(list).toHaveBeenCalledTimes(2);
    expect(list.mock.calls[0][0]).toMatch(/\/agent\/conversations$/);
    expect(new Headers(list.mock.calls[0][1]?.headers).get('Authorization') === `Bearer ${identity}`).toBe(true);
});

it('maps both draft routes without deriving status or rounding decimals', async () => {
    const draft = { ...summary, conversation_id: 'c', terms_digest: 'digest', source_text: 'source' };
    mockResponse(draft);
    expect(await api.agent.draft('d')).toMatchObject({ id: 'd', conversationId: 'c', termsDigest: 'digest', sourceText: 'source', quantityMt: 12.5, limitPriceUsd: null, status: 'expired' });
    const discard = mockResponse({ ...draft, status: 'rejected', limit_price_usd: '12.04' });
    expect(await api.agent.discardDraft('d')).toMatchObject({ status: 'rejected', limitPriceUsd: 12.04 });
    expect(discard.mock.calls[0]).toEqual([expect.stringMatching(/\/drafts\/d\/discard$/), expect.objectContaining({ method: 'POST' })]);
});

it('keeps untrusted text separate and retains drafts from a stopped turn', async () => {
    const fetch = mockResponse(turn);
    const message = { text: '🚢'.repeat(4000), untrusted: Array.from({ length: 3 }, () => ({ label: '🚢'.repeat(60), text: '🚢'.repeat(20000) })) };
    expect(await api.agent.sendMessage('c', message)).toMatchObject({ assistantSeq: 2, draftIds: ['d'], stopped: 'tool_limit', question: { question: 'Which port?', options: [] } });
    expect(fetch.mock.calls[0][0]).toMatch(/\/conversations\/c\/messages$/);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toEqual(message);
});

it('maps history rows and the separate list of draft summaries', async () => {
    const references = [{ id: 'd', status: 'expired' }];
    mockResponse({ ...conversation, messages: [
        { role: 'user', seq: 1, created_at: 'start', content: { text: 'input' } },
        { role: 'assistant', seq: 2, created_at: 'end', content: { ...turn, drafts: references, question: { question: 'Where?', options: [] } } },
    ], drafts: [summary] });
    expect(await api.agent.history('c')).toMatchObject({ messages: [
        { seq: 1, role: 'user', createdAt: 'start', content: { text: 'input' } },
        { seq: 2, role: 'assistant', content: { assistantSeq: 2, draftIds: ['d'], drafts: references, stopped: 'tool_limit', question: { question: 'Where?', options: [] } } },
    ], drafts: [{ quantityMt: 12.5, limitPriceUsd: null, status: 'expired' }] });
});

it.each([
    { text: '' }, { text: '  ' }, { text: 'a\0b' }, { text: 'a'.repeat(4001) },
    { text: 'a', untrusted: Array(4).fill({ label: 'x', text: 'x' }) },
    ...[{ label: '', text: 'x' }, { label: 'x'.repeat(61), text: 'x' }, { label: 'x', text: '' }, { label: 'x', text: 'x'.repeat(20001) }].map(block => ({ text: 'a', untrusted: [block] })),
])('refuses invalid input before fetch (%#)', async input => {
    const fetch = mockResponse(null);
    await expect(api.agent.sendMessage('c', input)).rejects.toMatchObject({ kind: 'invalid' });
    expect(fetch).not.toHaveBeenCalled();
});

it.each([
    [423, { detail: 'paused', reason: 'maintenance' }, 'paused'],
    [429, { detail: { code: 'AGENT_RATE_LIMITED' } }, 'rate_limited'],
    [429, { detail: 'Daily assistant limit reached.' }, 'daily_budget'],
    [503, { detail: { code: 'AGENT_BUSY' } }, 'busy'],
    [503, { detail: 'The assistant is unavailable.' }, 'unavailable'],
    [422, { detail: { code: 'INVALID_AGENT_REQUEST' } }, 'invalid'],
] as const)('maps HTTP %i to a typed refusal (%#)', async (status, body, kind) => {
    mockResponse(body, status, kind === 'rate_limited' ? { 'Retry-After': '42' } : {});
    await expect(api.agent.sendMessage('c', { text: 'hello' })).rejects.toMatchObject(kind === 'rate_limited' ? { kind, retryAfterSeconds: 42 } : { kind });
});

it('includes the private identity scope in each agent query key', () => {
    const scope = [1, 'buyer', 'org', null] as const;
    expect(agentKeys.conversations(scope)).toEqual(['private', scope, 'agent', 'conversations']);
    expect(agentKeys.history(scope, 'c')).toEqual(['private', scope, 'agent', 'history', 'c']);
    expect(agentKeys.draft(scope, 'd')).toEqual(['private', scope, 'agent', 'draft', 'd']);
});
