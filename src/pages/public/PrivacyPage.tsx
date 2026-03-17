import React, { useEffect } from 'react';
import { useNamespace } from '../../hooks/useNamespace';

export const PrivacyPage: React.FC = () => {
    const { t, ready } = useNamespace('public');

    useEffect(() => {
        document.title = 'Privacy Policy — Verdaxis';
    }, []);

    if (!ready) return null;

    return (
        <div className="max-w-[800px] mx-auto px-6 py-16">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t('privacy.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {t('privacy.lastUpdated')}
            </p>
            <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('privacy.sections.0.heading')}</h2>
                <p>{t('privacy.sections.0.body')}</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('privacy.sections.1.heading')}</h2>
                <p>{t('privacy.sections.1.body')}</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('privacy.sections.2.heading')}</h2>
                <p>{t('privacy.sections.2.body')}</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('privacy.sections.3.heading')}</h2>
                <p>{t('privacy.sections.3.body')}</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('privacy.sections.4.heading')}</h2>
                <p>{t('privacy.sections.4.body')}</p>
            </div>
        </div>
    );
};
