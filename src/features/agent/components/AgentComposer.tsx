import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AgentMessageInput } from '../api/agentTypes';

const field = 'mt-1 w-full resize-y rounded-md border border-slate-300 bg-white p-2 focus-visible:ring-2 focus-visible:ring-verdaxis dark:border-slate-600 dark:bg-slate-900';
export function AgentComposer({ disabled, pending, send }: { disabled: boolean; pending: boolean; send: (input: AgentMessageInput) => Promise<boolean> }) {
    const { t } = useTranslation('agent');
    const [text, setText] = useState('');
    const [forwarded, setForwarded] = useState('');
    const [expanded, setExpanded] = useState(false);
    const addForwarded = (value: string) => {
        if (!value) return;
        setExpanded(true);
        setForwarded(old => old ? `${old}\n${value}` : value);
    };
    async function submit() {
        if (disabled || !text.trim()) return;
        if (await send({ text, untrusted: forwarded ? [{ label: 'Forwarded requirement', text: forwarded }] : [] })) {
            setText(''); setForwarded(''); setExpanded(false);
        }
    }
    return <form className="shrink-0 space-y-2 border-t border-slate-200 p-4 dark:border-slate-700" onSubmit={event => { event.preventDefault(); void submit(); }}>
        <label className="block">{t('message')}<textarea autoFocus rows={2} className={field} readOnly={pending} value={text}
            onChange={event => setText(event.target.value)}
            onDrop={event => { event.preventDefault(); if (!pending) addForwarded(event.dataTransfer.getData('text/plain')); }}
            onPaste={event => { event.preventDefault(); if (!pending) addForwarded(event.clipboardData.getData('text/plain')); }}
            onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(); }
            }} /></label>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="block underline focus-visible:ring-2">{t('paste')}</button>
        {expanded && <label className="block">{t('forwarded')}<textarea rows={2} className={field} value={forwarded} readOnly={pending} onChange={event => setForwarded(event.target.value)} /></label>}
        <button disabled={disabled || !text.trim()} className="rounded-md bg-slate-800 px-4 py-2 font-semibold text-white focus-visible:ring-2 disabled:opacity-50 dark:bg-slate-200 dark:text-slate-900">{t('send')}</button>
    </form>;
}
