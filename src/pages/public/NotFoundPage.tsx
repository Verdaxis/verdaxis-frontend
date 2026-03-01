import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
    useEffect(() => {
        document.title = 'Page Not Found — Verdaxis';
    }, []);

    return (
        <div className="max-w-[600px] mx-auto px-6 py-32 text-center">
            <div className="text-7xl font-extrabold text-slate-200 dark:text-slate-700 mb-4">404</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Page Not Found</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link
                to="/"
                className="inline-block px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg font-semibold no-underline"
            >
                Back to Home
            </Link>
        </div>
    );
};
