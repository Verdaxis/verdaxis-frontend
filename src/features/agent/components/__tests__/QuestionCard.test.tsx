import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, expect, it, vi } from 'vitest';
import { loadNamespace } from '../../../../i18n';
import type { AgentRow } from '../../hooks/useAgentConversation';
import { AgentMessageList } from '../AgentMessageList';

beforeAll(() => loadNamespace('agent'));
const scope = [1, 'buyer', null, null] as const;
function question(option: string): AgentRow {
    return { role: 'assistant', turn: {
        assistantSeq: 1, reply: 'Where?', question: { question: 'Where?', options: [option] },
        draftIds: [], stopped: null,
    } };
}
it('sends only the exact newest option and disables older or pending options', () => {
    const rows = [question('Old'), question('  Rotterdam  ')];
    const send = vi.fn();
    const list = (messages: AgentRow[], pending = false) => (
        <AgentMessageList rows={messages} scope={scope} pending={pending} retry={send} />
    );
    const view = render(list(rows));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Old' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Rotterdam' }));
    expect(send.mock.calls).toEqual([[{ text: '  Rotterdam  ', untrusted: [] }]]);
    view.rerender(list(rows, true));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Rotterdam' }).disabled).toBe(true);
    view.rerender(list([...rows, { role: 'user', text: 'Free answer' }]));
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Rotterdam' }).disabled).toBe(true);
});
