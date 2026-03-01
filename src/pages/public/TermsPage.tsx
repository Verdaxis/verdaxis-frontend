import React, { useEffect } from 'react';

export const TermsPage: React.FC = () => {
    useEffect(() => {
        document.title = 'Terms of Service — Verdaxis';
    }, []);

    return (
        <div className="max-w-[800px] mx-auto px-6 py-16">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Terms of Service</h1>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                Last updated: February 2026
            </p>
            <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">1. Acceptance of Terms</h2>
                <p>By accessing Verdaxis Exchange, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform.</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">2. Platform Description</h2>
                <p>Verdaxis Exchange is a compliance-first marketplace for low-carbon marine fuels. The platform facilitates transactions between fuel suppliers and shipping companies.</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">3. Account Responsibilities</h2>
                <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Notify us immediately of any unauthorized use.</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">4. Trading Rules</h2>
                <p>All trades executed on the platform are subject to our trading rules and settlement procedures. Bids and offers are binding once confirmed.</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">5. Limitation of Liability</h2>
                <p>Verdaxis Exchange is provided "as is". We are not liable for trading losses, data interruptions, or third-party service failures beyond our reasonable control.</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">6. Contact</h2>
                <p>For questions about these terms, email legal@verdaxis.exchange.</p>
            </div>
        </div>
    );
};
