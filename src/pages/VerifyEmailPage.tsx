import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../services/config';
import { useNamespace } from '../hooks/useNamespace';

type VerifyState = 'loading' | 'success' | 'error';

const ROLE_CARDS = [
  { id: 'buyer',           emoji: '⛽', labelKey: 'verifyEmail.role.buyer'          },
  { id: 'supplier',        emoji: '🌿', labelKey: 'verifyEmail.role.supplier'       },
  { id: 'financier_other', emoji: '💼', labelKey: 'verifyEmail.role.financierOther' },
] as const;
type UseCase = typeof ROLE_CARDS[number]['id'];

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const { t, ready } = useNamespace('auth');

  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null);
  const [referralSource, setReferralSource]   = useState('');
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [surveyDone, setSurveyDone]           = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setState('error');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`, {
          method: 'POST',
        });
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

  const handleSurveySubmit = async () => {
    if (!selectedUseCase || !verifiedEmail) return;
    setSurveySubmitting(true);
    try {
      await fetch(`${API_URL}/auth/survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verifiedEmail,
          use_case: selectedUseCase,
          referral_source: referralSource || undefined,
        }),
      });
    } catch {
      // Non-blocking — survey is best-effort
    } finally {
      setSurveyDone(true);
      setSurveySubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>

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

              {surveyDone ? (
                <div className="pt-2">
                  <Link
                    to="/login"
                    className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 py-2.5 rounded-lg transition-all"
                  >
                    {t('verifyEmail.success.signIn')}
                  </Link>
                </div>
              ) : (
                <div className="pt-6 border-t border-slate-800 space-y-4 text-left" style={{animation: 'fadeIn 0.3s ease 0.15s both'}}>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">{t('verifyEmail.quickQuestion')}</p>

                  {/* 3-column role cards */}
                  <div className="grid grid-cols-3 gap-2">
                    {ROLE_CARDS.map(({ id, emoji, labelKey }) => (
                      <button
                        key={id}
                        onClick={() => setSelectedUseCase(id)}
                        className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-all duration-150 text-center ${
                          selectedUseCase === id
                            ? 'border-emerald-500 bg-emerald-500/10 text-white'
                            : 'border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white hover:scale-[1.03]'
                        }`}
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="text-xs font-medium leading-tight">{t(labelKey)}</span>
                      </button>
                    ))}
                  </div>

                  {/* Optional referral source */}
                  <input
                    type="text"
                    placeholder={t('verifyEmail.referralPlaceholder')}
                    value={referralSource}
                    onChange={e => setReferralSource(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  />

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSurveySubmit}
                      disabled={!selectedUseCase || surveySubmitting}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {surveySubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      {t('verifyEmail.continue')}
                    </button>
                    <button
                      onClick={() => setSurveyDone(true)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {t('verifyEmail.skip')}
                    </button>
                  </div>
                </div>
              )}
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
                  to="/login"
                  className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 py-2.5 rounded-lg transition-all"
                >
                  {t('verifyEmail.error.signIn')}
                </Link>
                <Link
                  to="/forgot-password"
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  {t('verifyEmail.error.resetPassword')}
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
