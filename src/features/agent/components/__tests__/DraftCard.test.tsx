import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { loadNamespace } from '../../../../i18n';
import { api } from '../../../../services/api';
import type { AgentDraft } from '../../api/agentTypes';
import { AgentMessageList } from '../AgentMessageList';

const draft: AgentDraft = {
    id: 'first', conversationId: 'chat', marketProduct: 'B30', side: 'BID', deliveryPoint: 'Singapore',
    availabilityWindow: 'Spot', quantityMt: 2000, limitPriceUsd: 1234.5, expiresAt: '2020-01-01T00:00:00Z',
    status: 'draft', createdAt: '', updatedAt: '', termsDigest: '', sourceText: '<script>example</script>',
};
beforeEach(async () => {
    vi.restoreAllMocks();
    await loadNamespace('agent');
    vi.spyOn(api.agent, 'draft').mockResolvedValue(draft);
});
function show(ids = ['first']) {
    const client = new QueryClient();
    const content = () => (
        <QueryClientProvider client={client}>
            <AgentMessageList scope={[1, 'buyer', null, null]} pending={false} retry={vi.fn()} rows={[
                { role: 'assistant', turn: { assistantSeq: 2, reply: 'Saved', draftIds: ids, stopped: null, question: null } },
            ]} />
        </QueryClientProvider>
    );
    const view = render(content());
    return () => view.rerender(content());
}
it('shows every term, server status, and the source as literal text with focus return', async () => {
    show();
    await screen.findByText('Draft bid: not on the order book');
    for (const value of ['Bid', 'B30', 'Singapore', 'Spot', '2,000', '1,234.50', draft.expiresAt!, 'Draft']) {
        expect(screen.getByText(value)).toBeTruthy();
    }
    const opener = screen.getByRole('button', { name: 'View source text' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(draft.sourceText).classList.contains('whitespace-pre-wrap')).toBe(true);
    expect(dialog.querySelector('script')).toBeNull();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
});
it.each(['expired', 'confirmed', 'rejected'] as const)('reports %s and hides Discard', async status => {
    vi.mocked(api.agent.draft).mockResolvedValue({ ...draft, status, expiresAt: null, limitPriceUsd: null });
    show();
    await screen.findByText('No limit stated');
    expect(screen.getByText('No expiry')).toBeTruthy();
    expect(screen.getByText({ expired: 'Expired', confirmed: 'Confirmed', rejected: 'Discarded' }[status])).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
});
it('keeps equal terms in id order and fetches each id only once', async () => {
    vi.mocked(api.agent.draft).mockImplementation(async id => ({ ...draft, id, sourceText: id }));
    const rerender = show(['second', 'first']);
    const sourceButtons = () => screen.getAllByRole('button', { name: 'View source text' });
    await waitFor(() => expect(sourceButtons()).toHaveLength(2));
    rerender();
    expect(vi.mocked(api.agent.draft).mock.calls).toEqual([['second'], ['first']]);
    fireEvent.click(sourceButtons()[0]);
    expect(within(screen.getByRole('dialog')).getByText('second')).toBeTruthy();
});
it('recovers an unavailable draft without replacing the message', async () => {
    vi.mocked(api.agent.draft).mockRejectedValueOnce(new Error());
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await screen.findByText('Singapore');
    expect(screen.getByText('Saved')).toBeTruthy();
});
it('discards only after confirmation and uses the returned draft', async () => {
    const discard = vi.spyOn(api.agent, 'discardDraft').mockResolvedValue({ ...draft, status: 'rejected', quantityMt: 42 });
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    expect(discard).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard' }));
    await screen.findByText('Discarded');
    expect(screen.getByText('42')).toBeTruthy();
    expect(discard).toHaveBeenCalledWith('first');
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
});
