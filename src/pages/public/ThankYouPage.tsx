import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useNamespace } from '../../hooks/useNamespace';

type Completion = 'registration' | 'organization';

export const ThankYouPage: React.FC = () => {
  const { state } = useLocation();
  const { t, ready } = useNamespace('auth');
  const completion = (state as { completion?: Completion } | null)?.completion;
  const confirmed = completion === 'registration' || completion === 'organization';

  if (!ready) return null;

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-slate-950 px-4 py-10 text-white">
      <section className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-center shadow-2xl sm:p-8">
        {confirmed && (
          <CheckCircle2 aria-hidden="true" className="mx-auto mb-5 text-emerald-400" size={48} />
        )}
        <h1 className="text-3xl font-semibold tracking-tight">
          {t(confirmed ? 'thankYou.confirmed.title' : 'thankYou.direct.title')}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-300">
          {confirmed
            ? t(`thankYou.confirmed.${completion}`)
            : t('thankYou.direct.body')}
        </p>
        {confirmed && (
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400">
            {t('thankYou.confirmed.verifyEmail')}
          </p>
        )}
        <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <Link
            to={confirmed ? '/login' : '/register'}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            {t(confirmed ? 'thankYou.confirmed.signIn' : 'thankYou.direct.register')}
          </Link>
          <a
            href="mailto:info@verdaxis.exchange"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          >
            {t('thankYou.contact')}
          </a>
        </div>
      </section>
    </main>
  );
};
