import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { AgentPanel } from '../AgentPanel';
import { api } from '../../../../services/api';
import { AgentError, type AgentTurn } from '../../api/agentTypes';
import { loadNamespace } from '../../../../i18n';
import { getAgentAccess } from '../../hooks/useAgentConversation';

const conversation = { id: 'c', status: 'open' as const, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const turn: AgentTurn = { reply: '<b>12.00</b>', assistantSeq: 2, stopped: null, question: null, draftIds: [] };
beforeEach(async () => {
    vi.restoreAllMocks();
    await loadNamespace('agent');
    vi.spyOn(api.agent, 'listConversations').mockResolvedValue([]);
    vi.spyOn(api.agent, 'createConversation').mockResolvedValue(conversation);
    vi.spyOn(api.agent, 'sendMessage').mockResolvedValue(turn);
});
const show = (paused = false, close = vi.fn()) => render(<AgentPanel paused={paused} onClose={close} />);
const message = () => screen.getByRole('textbox', { name: 'Message' });
const send = () => screen.getByRole<HTMLButtonElement>('button', { name: 'Send' });
async function typeMessage() {
    fireEvent.change(message(), { target: { value: 'Check this' } });
    await waitFor(() => expect(send().disabled).toBe(false));
}
it('allows only a ready grant or a paused denial', () => {
    const ability = { allowed: true, reasonCode: null, reason: null };
    expect(getAgentAccess('unknown', ability)).toBeNull();
    expect(getAgentAccess('ready', undefined)).toBeNull();
    expect(getAgentAccess('ready', { ...ability, allowed: false, reasonCode: 'BUYER_REQUIRED' })).toBeNull();
    expect(getAgentAccess('ready', { ...ability, allowed: false, reasonCode: 'AGENT_PAUSED' })).toBe('paused');
    expect(getAgentAccess('ready', ability)).toBe('allowed');
});
it('shows only the paused notice, without loading private history', () => {
    show(true);
    expect(screen.getByText('The assistant is paused.')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(api.agent.listConversations).not.toHaveBeenCalled();
});
it('focuses the composer, keeps pasted content separate, and locks a pending send', async () => {
    let finish!: (value: AgentTurn) => void;
    vi.mocked(api.agent.sendMessage).mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const close = vi.fn(); show(false, close);
    expect(document.activeElement).toBe(message());
    expect(api.agent.createConversation).not.toHaveBeenCalled();
    await typeMessage();
    fireEvent.paste(message(), { clipboardData: { getData: () => 'forwarded text' } });
    expect((message() as HTMLTextAreaElement).value).toBe('Check this');
    fireEvent.keyDown(message(), { key: 'Enter', shiftKey: true });
    expect(api.agent.sendMessage).not.toHaveBeenCalled();
    fireEvent.keyDown(message(), { key: 'Enter' });
    await waitFor(() => expect(api.agent.sendMessage).toHaveBeenCalledWith('c', { text: 'Check this', untrusted: [{ label: 'Forwarded requirement', text: 'forwarded text' }] }));
    expect(send().disabled).toBe(true); expect(screen.getByText('Waiting for the assistant…')).toBeTruthy();
    await act(async () => finish(turn));
    expect(screen.getByText('<b>12.00</b>')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
});
it.each(['tool_limit','contract_errors','timeout','model_failure'] as const)('explains %s and warns before repeating the same input with saved drafts', async stopped => {
    vi.mocked(api.agent.sendMessage).mockResolvedValue({ ...turn, stopped, draftIds: ['d'], question: { question: 'Where?', options: ['Singapore'] } });
    show(); await typeMessage(); fireEvent.click(send());
    expect(await screen.findByText('1 draft saved in this turn.')).toBeTruthy();
    const reasons = { tool_limit: 'The assistant needed too many steps; ask for one thing at a time.', contract_errors: 'The assistant could not give a valid answer; try again or rephrase your request.', timeout: 'The assistant took too long; try again.', model_failure: 'The assistant service did not answer; try again in a moment.' };
    expect(screen.getByText(reasons[stopped])).toBeTruthy(); expect(screen.getByText('Where?')).toBeTruthy(); expect(screen.getByText('Singapore')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); expect(api.agent.sendMessage).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Resend message' }));
    await waitFor(() => expect(api.agent.sendMessage).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.agent.sendMessage).mock.calls[1]).toEqual(vi.mocked(api.agent.sendMessage).mock.calls[0]);
});
it('resumes the newest open conversation, orders rows and skips null text', async () => {
    vi.mocked(api.agent.listConversations).mockResolvedValue([{ ...conversation, id: 'closed', status: 'closed' }, conversation, { ...conversation, id: 'older', updatedAt: '2025-01-01' }]);
    vi.spyOn(api.agent, 'history').mockResolvedValue({ ...conversation, drafts: [], messages: [
        { role: 'assistant', seq: 2, createdAt: '', content: { ...turn, drafts: [] } },
        { role: 'user', seq: 1, createdAt: '', content: { text: 'First' } },
        { role: 'assistant', seq: 3, createdAt: '', content: { ...turn, reply: null, question: { question: 'Hidden', options: [] }, drafts: [] } },
    ] });
    show(); await screen.findByText('First'); expect(api.agent.history).toHaveBeenCalledWith('c');
    expect(screen.getByRole('log').textContent).toMatch(/First.*<b>12.00<\/b>/); expect(screen.queryByText('Hidden')).toBeNull();
});
it.each([
    ['paused', 'The assistant is paused.'], ['rate_limited', 'Too many messages. Try again in 42 seconds.'],
    ['busy', 'The assistant is busy. Try again shortly.'], ['daily_budget', 'The daily assistant limit has been reached.'],
    ['unavailable', 'The assistant is unavailable. Try again later.'], ['invalid', 'Check the length and content of your message and forwarded text.'],
] as const)('shows the %s refusal', async (kind, text) => {
    vi.mocked(api.agent.sendMessage).mockRejectedValue(new AgentError(kind, 42));
    show(); await typeMessage(); fireEvent.click(send()); expect((await screen.findByRole('alert')).textContent).toBe(text);
});
