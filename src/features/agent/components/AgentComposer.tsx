import { useState, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentMessageInput } from '../api/agentTypes';

// Long or multiline pasted text comes from another source. Send it as untrusted content.
const MAX_INLINE_PASTE_CHARACTERS = 200;
const fieldStyle = [
    'mt-1 w-full resize-y rounded-md border border-slate-300 bg-white p-2',
    'focus-visible:ring-2 focus-visible:ring-verdaxis dark:border-slate-600 dark:bg-slate-900',
].join(' ');
const primaryButtonStyle = [
    'rounded-lg bg-verdaxis px-5 py-2 text-sm font-bold text-white shadow-sm',
    'transition-colors hover:bg-verdaxis/90 focus-visible:ring-2 disabled:opacity-50',
].join(' ');

interface ComposerProps {
    disabled: boolean;
    pending: boolean;
    send: (input: AgentMessageInput) => Promise<boolean>;
}

export function AgentComposer({ disabled, pending, send }: ComposerProps) {
    const { t } = useTranslation('agent');
    const [text, setText] = useState('');
    const [forwarded, setForwarded] = useState('');
    const [expanded, setExpanded] = useState(false);

    function handleTransfer(event: SyntheticEvent, value: string) {
        const multiline = /[\r\n\u2028\u2029]/u.test(value);
        if (!multiline && [...value].length <= MAX_INLINE_PASTE_CHARACTERS) return;
        event.preventDefault();
        if (pending) return;
        setExpanded(true);
        setForwarded(previous => previous ? `${previous}\n${value}` : value);
    }

    async function submit() {
        if (disabled || !text.trim()) return;
        const untrusted = forwarded ? [{ label: 'Forwarded requirement', text: forwarded }] : [];
        if (await send({ text, untrusted })) {
            setText('');
            setForwarded('');
            setExpanded(false);
        }
    }

    return (
        <form
            className="shrink-0 space-y-2 border-t border-slate-200 p-4 dark:border-slate-700"
            onSubmit={event => {
                event.preventDefault();
                void submit();
            }}
        >
            <label className="block">
                {t('message')}
                <textarea
                    autoFocus
                    rows={2}
                    className={fieldStyle}
                    readOnly={pending}
                    value={text}
                    onChange={event => setText(event.target.value)}
                    onPaste={event => handleTransfer(event, event.clipboardData.getData('text/plain'))}
                    onDrop={event => handleTransfer(event, event.dataTransfer.getData('text/plain'))}
                    onKeyDown={event => {
                        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
                        event.preventDefault();
                        void submit();
                    }}
                />
            </label>
            <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
                className="block underline focus-visible:ring-2"
            >
                {t('paste')}
            </button>
            {expanded && (
                <label className="block">
                    {t('forwarded')}
                    <textarea
                        rows={2}
                        className={fieldStyle}
                        value={forwarded}
                        readOnly={pending}
                        onChange={event => setForwarded(event.target.value)}
                    />
                </label>
            )}
            <button type="submit" disabled={disabled || !text.trim()} className={primaryButtonStyle}>
                {t('send')}
            </button>
        </form>
    );
}
