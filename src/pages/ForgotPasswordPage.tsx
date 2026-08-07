import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { API_URL } from '../services/config';
import { useNamespace } from '../hooks/useNamespace';
import { localizedAuthError } from './authApiError';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { t, ready } = useNamespace('auth');

  if (!ready) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const errData = await res.json().catch(() => null);
        setError(localizedAuthError(errData, t, 'forgotPassword.error.generic', 'forgot password failed'));
      }
    } catch (error) {
      console.error('[auth] forgot password network error', error);
      setError(t('forgotPassword.error.connectionFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0F172A] z-0"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Verdaxis</h1>
          <p className="text-slate-400">{t('forgotPassword.subtitle')}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {submitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('forgotPassword.success.title')}</h2>
              <p className="text-slate-400">
                {t('forgotPassword.success.sentTo')}{' '}
                <strong className="text-white">{email}</strong>,
                {' '}{t('forgotPassword.success.sentMessage')}
              </p>
              <p className="text-slate-500 text-sm">
                {t('forgotPassword.success.expiry')}
              </p>
              <div className="pt-4">
                <Link to="/login" className="text-emerald-400 text-sm hover:underline flex items-center justify-center gap-1">
                  <ArrowLeft size={14} />
                  {t('forgotPassword.backToSignIn')}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-slate-400 text-sm mb-6">
                {t('forgotPassword.description')}
              </p>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('forgotPassword.emailLabel')}</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                      placeholder={t('forgotPassword.emailPlaceholder')}
                    />
                    <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : t('forgotPassword.submit')}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1">
                  <ArrowLeft size={14} />
                  {t('forgotPassword.backToSignIn')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
