import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../services/config';
import { useNamespace } from '../hooks/useNamespace';

type VerifyState = 'loading' | 'success' | 'error';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const { t, ready } = useNamespace('auth');

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setState('error');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          setVerifiedEmail(data.email ?? null);
          setState('success');
        } else {
          setState('error');
        }
      } catch {
        setState('error');
      }
    };

    verify();
  }, [searchParams]);

  if (!ready) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[#0F172A] z-0"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Verdaxis</h1>
          <p className="text-slate-400">{t('verifyEmail.subtitle')}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-10 shadow-2xl text-center">
          {state === 'loading' && (
            <div className="space-y-4">
              <Loader2 size={48} className="animate-spin text-emerald-400 mx-auto" />
              <p className="text-slate-400">{t('verifyEmail.loading')}</p>
            </div>
          )}

          {state === 'success' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('verifyEmail.success.title')}</h2>
              {verifiedEmail && (
                <p className="text-slate-400 text-sm">
                  <strong className="text-white">{verifiedEmail}</strong> {t('verifyEmail.success.confirmed')}
                </p>
              )}
              <p className="text-slate-400">
                {t('verifyEmail.success.message')}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 py-2.5 rounded-lg transition-all"
                >
                  {t('verifyEmail.success.signIn')}
                </Link>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle size={36} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('verifyEmail.error.title')}</h2>
              <p className="text-slate-400">
                {t('verifyEmail.error.message')}
              </p>
              <div className="flex items-center justify-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 py-2.5 rounded-lg transition-all"
                >
                  {t('verifyEmail.error.registerAgain')}
                </Link>
                <Link
                  to="/login"
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  {t('verifyEmail.error.backToSignIn')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
