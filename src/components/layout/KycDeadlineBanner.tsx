import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ExecutionEligibility, ExecutionEligibilityReason } from '../../types';

interface KycDeadlineBannerProps {
    eligibility: ExecutionEligibility | null | undefined;
}

type BannerReason = Extract<ExecutionEligibilityReason, 'KYC_GRACE' | 'KYC_REQUIRED' | 'KYC_REJECTED'>;

const isBannerReason = (reason: ExecutionEligibilityReason | undefined): reason is BannerReason =>
    reason === 'KYC_GRACE' || reason === 'KYC_REQUIRED' || reason === 'KYC_REJECTED';

const COPY_KEYS: Record<BannerReason, { title: string; titleNoDate?: string; body: string }> = {
    KYC_GRACE: { title: 'kycBanner.grace.title', titleNoDate: 'kycBanner.grace.titleNoDate', body: 'kycBanner.grace.body' },
    KYC_REQUIRED: { title: 'kycBanner.required.title', body: 'kycBanner.required.body' },
    KYC_REJECTED: { title: 'kycBanner.rejected.title', body: 'kycBanner.rejected.body' },
};

/**
 * Deadline banner for users who cannot execute yet. Grace users see their
 * expiry date; required and rejected users see the blocking reason. Approved
 * users and `NOT_APPLICABLE` accounts (admins, no organization) render nothing.
 */
export const KycDeadlineBanner: React.FC<KycDeadlineBannerProps> = ({ eligibility }) => {
    const { t, i18n } = useTranslation('common');
    const reason = eligibility?.reason;
    if (!isBannerReason(reason)) return null;

    const copy = COPY_KEYS[reason];
    const isGrace = reason === 'KYC_GRACE';
    const graceDate = isGrace && eligibility?.grace_expires_at ? new Date(eligibility.grace_expires_at) : null;
    const hasGraceDate = Boolean(graceDate && !Number.isNaN(graceDate.getTime()));
    const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';

    const title = isGrace && hasGraceDate
        ? t(copy.title, { date: graceDate!.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) })
        : t(copy.titleNoDate ?? copy.title);
    const Icon = isGrace ? Clock : AlertTriangle;
    const tone = isGrace
        ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/80 dark:text-amber-100'
        : 'border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950/80 dark:text-red-100';
    const iconTone = isGrace ? 'bg-amber-500' : 'bg-red-500';

    return (
        <section
            role="status"
            aria-label={t('kycBanner.label')}
            className={`border-b px-4 py-3 shadow-sm ${tone}`}
        >
            <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className={`mt-0.5 rounded-lg p-2 text-white shadow-sm ${iconTone}`}>
                        <Icon size={18} aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-extrabold">{title}</div>
                        <p className="mt-1 text-xs opacity-90">{t(copy.body)}</p>
                    </div>
                </div>
                <Link
                    to="/kyc"
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-current bg-white px-3 py-2 text-xs font-bold transition-colors hover:bg-black/5 dark:bg-slate-900/40 dark:hover:bg-slate-900/70"
                >
                    {t('kycBanner.action')}
                </Link>
            </div>
        </section>
    );
};
