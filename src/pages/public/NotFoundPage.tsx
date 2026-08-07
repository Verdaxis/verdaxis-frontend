import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNamespace } from '../../hooks/useNamespace';

export const NotFoundPage: React.FC = () => {
    const { t, ready } = useNamespace('public');

    useEffect(() => {
        if (ready) document.title = `${t('notFound.title')} — Verdaxis`;
    }, [ready, t]);

    if (!ready) return null;

    return (
        <div className="max-w-[600px] mx-auto px-6 py-32 text-center">
            <div className="text-7xl font-extrabold text-slate-200 dark:text-slate-700 mb-4">404</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{t('notFound.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                {t('notFound.message')}
            </p>
            <Link
                to="/"
                className="inline-block px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-semibold no-underline"
            >
                {t('notFound.backHome')}
            </Link>
        </div>
    );
};
