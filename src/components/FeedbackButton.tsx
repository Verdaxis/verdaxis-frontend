import React, { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { api } from '../services/api';
import { ConfirmModal } from './ui/ConfirmModal';

// Floating first-party feedback control (be/docs/feedback.md). Sends the
// message with the current app path (path only — never query or hash).
export const FeedbackButton: React.FC = () => {
    const { t } = useTranslation('common');
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const close = () => {
        setOpen(false);
        setSent(false);
        setError(null);
        if (sent) setMessage('');
    };

    const submit = async () => {
        const trimmed = message.trim();
        if (!trimmed || sending || sent) return;
        setSending(true);
        setError(null);
        try {
            await api.feedback.submit(trimmed.slice(0, 2000), location.pathname);
            setSent(true);
            setMessage('');
        } catch {
            setError(t('feedback.error'));
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-full border border-verdaxis-border bg-verdaxis-card px-3.5 py-2 text-xs font-semibold text-verdaxis-text-muted shadow-sm transition-colors hover:text-verdaxis hover:border-verdaxis"
                data-testid="feedback-button"
            >
                <MessageSquarePlus size={14} aria-hidden />
                {t('feedback.button')}
            </button>
            <ConfirmModal
                isOpen={open}
                onClose={close}
                onConfirm={() => { void submit(); }}
                title={t('feedback.title')}
                message={t('feedback.message')}
                confirmText={sent ? t('feedback.sentShort') : t('feedback.submit')}
                cancelText={t('btn.close')}
                variant={sent ? 'success' : 'info'}
                isLoading={sending}
                confirmDisabled={sent || message.trim().length === 0}
                compact
            >
                {sent ? (
                    <p role="status" className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                        {t('feedback.sent')}
                    </p>
                ) : (
                    <textarea
                        value={message}
                        onChange={event => setMessage(event.target.value)}
                        maxLength={2000}
                        rows={4}
                        placeholder={t('feedback.placeholder')}
                        aria-label={t('feedback.title')}
                        className="mt-4 w-full rounded-lg border border-verdaxis-border bg-verdaxis-input p-3 text-sm text-verdaxis-text focus:outline-none focus:ring-1 focus:ring-verdaxis"
                        data-testid="feedback-message"
                    />
                )}
                {error && (
                    <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>
                )}
            </ConfirmModal>
        </>
    );
};
