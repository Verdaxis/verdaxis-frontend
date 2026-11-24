import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../../components/ui/ConfirmModal';

export function SourceTextDialog({ text, close }: { text: string; close: () => void }) {
    const { t } = useTranslation('agent');
    return (
        <ConfirmModal
            isOpen
            compact
            title={t('draft.source')}
            message=""
            confirmText={t('draft.close')}
            cancelText=""
            onConfirm={close}
            onClose={close}
        >
            <p className="whitespace-pre-wrap break-words">{text}</p>
        </ConfirmModal>
    );
}
