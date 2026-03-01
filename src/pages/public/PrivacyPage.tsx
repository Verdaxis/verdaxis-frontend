import React, { useEffect } from 'react';

export const PrivacyPage: React.FC = () => {
    useEffect(() => {
        document.title = 'Privacy Policy — Verdaxis';
    }, []);

    return (
        <div className="max-w-[800px] mx-auto px-6 py-16">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Privacy Policy</h1>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
                Last updated: February 2026
            </p>
            <div className="text-slate-600 dark:text-slate-300 leading-relaxed">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">1. Information We Collect</h2>
                <p>Verdaxis Exchange collects information you provide when creating an account, placing orders, or contacting support. This includes your name, email address, company information, and transaction data.</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">2. How We Use Your Information</h2>
                <p>We use your information to operate the exchange platform, process transactions, ensure regulatory compliance (EU ETS, FuelEU), and communicate important updates about your account.</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">3. Data Protection</h2>
                <p>We implement appropriate technical and organizational measures to protect your personal data in accordance with GDPR requirements. All data is encrypted in transit and at rest.</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">4. Your Rights</h2>
                <p>Under GDPR, you have the right to access, rectify, erase, restrict processing, and port your personal data. To exercise these rights, contact privacy@verdaxis.exchange.</p>

                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-8 mb-3">5. Contact</h2>
                <p>For privacy inquiries, email privacy@verdaxis.exchange.</p>
            </div>
        </div>
    );
};
