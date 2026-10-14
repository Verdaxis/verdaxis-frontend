import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface KycRequiredNoticeProps {
    className?: string;
}

/**
 * Localized notice for the `KYC_REQUIRED` 403: explains the block and links to
 * `/kyc`. Used by the order modal and the take and confirm actions, so a blocked
 * execution shows the reason instead of a generic failure.
 */
export const KycRequiredNotice: React.FC<KycRequiredNoticeProps> = ({ className = '' }) => {
    const { t } = useTranslation('common');
    return (
        <div
            role="alert"
            className={`flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 ${className}`}
        >
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>
                {t('kycGate.blocked.message')}{' '}
                <Link to="/kyc" className="font-bold underline underline-offset-2">
                    {t('kycGate.blocked.action')}
                </Link>
            </span>
        </div>
    );
};
