import type { Ref } from 'react';
import { MessageSquare } from 'lucide-react';
import { useNamespace } from '../../../hooks/useNamespace';

export type AgentButtonProps = { ref: Ref<HTMLButtonElement>; open: boolean; toggle: () => void };
export function AgentButton({ ref, open, toggle }: AgentButtonProps) {
    const { t, ready } = useNamespace('agent');
    if (!ready) return null;
    return <button ref={ref} type="button" onClick={toggle} aria-expanded={open} aria-controls={open ? 'agent-panel' : undefined}
        aria-label={t('title')} title={t('title')} className="rounded-md p-2 text-slate-300 hover:text-white focus-visible:ring-2">
        <MessageSquare size={18} />
    </button>;
}
