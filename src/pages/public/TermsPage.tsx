import React, { useEffect } from 'react';
import { useNamespace } from '../../hooks/useNamespace';

export const TermsPage: React.FC = () => {
    const { t, ready } = useNamespace('public');

    useEffect(() => {
        document.title = 'Terms of Service — Verdaxis';
    }, []);

    if (!ready) return null;

    return (
        <div className="max-w-[800px] mx-auto px-6 py-16">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{t('terms.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                {t('terms.lastUpdated')}
            </p>
            <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('terms.sections.0.heading')}</h2>
                <p>{t('terms.sections.0.body')}</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('terms.sections.1.heading')}</h2>
                <p>{t('terms.sections.1.body')}</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('terms.sections.2.heading')}</h2>
                <p>{t('terms.sections.2.body')}</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('terms.sections.3.heading')}</h2>
                <p>{t('terms.sections.3.body')}</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('terms.sections.4.heading')}</h2>
                <p>{t('terms.sections.4.body')}</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">{t('terms.sections.5.heading')}</h2>
                <p>{t('terms.sections.5.body')}</p>
            </div>
        </div>
    );
};
