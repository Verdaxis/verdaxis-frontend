import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Lock,
  Mail,
  UserRoundCheck,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useNamespace } from '../hooks/useNamespace';
import i18n from '../i18n';
import { API_URL } from '../services/config';

interface InvitationDetails {
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: 'BUYER' | 'SUPPLIER';
  organization_name: string;
  invited_by_name: string | null;
  expires_at: string;
}

const invitationToken = (): string | null => {
  const fragmentToken = new URLSearchParams(window.location.hash.slice(1)).get('token');
  return fragmentToken || new URLSearchParams(window.location.search).get('token');
};

const errorMessage = async (response: Response, fallback: string): Promise<string> => {
  const payload = await response.json().catch(() => null);
  if (typeof payload?.detail === 'string') return payload.detail;
  if (typeof payload?.detail?.message === 'string') return payload.detail.message;
  return fallback;
};

const AcceptInvitationPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t, ready } = useNamespace('auth');
  const [token] = useState(invitationToken);
  const [details, setDetails] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.delete('token');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`);
  }, [token]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    void fetch(`${API_URL}/auth/invitations/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(await errorMessage(response, t('acceptInvite.invalid.message')));
      setDetails(await response.json());
    }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : t('acceptInvite.invalid.message'));
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [t, token]);

  const passwordRules = useMemo(() => [
    { label: t('register.passwordRule.minLength'), passes: password.length >= 8 },
    { label: t('register.passwordRule.uppercase'), passes: /[A-Z]/.test(password) },
    { label: t('register.passwordRule.number'), passes: /\d/.test(password) },
  ], [password, t]);
  const passwordReady = passwordRules.every((rule) => rule.passes) && password === confirmPassword;
  const language = i18n.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !passwordReady || !acceptedTerms) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/auth/invitations/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password, accept_terms: true }),
      });
      if (!response.ok) throw new Error(await errorMessage(response, t('acceptInvite.error.failed')));
      const payload = await response.json();
      await login(payload.access_token);
      navigate('/app', { replace: true });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('acceptInvite.error.failed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return null;

  return (
    <main className="min-h-[100dvh] overflow-y-auto bg-slate-950 px-4 py-8 text-white sm:py-12">
      <div className="mx-auto w-full max-w-lg">
        <header className="mb-7 flex justify-center">
          <img src="/verdaxis-logo-words-right.png" alt="Verdaxis" className="h-12 w-auto object-contain" />
        </header>

        <section className="rounded-lg border border-slate-800 bg-slate-900 p-5 shadow-xl sm:p-8">
          {loading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="animate-spin text-emerald-400" size={32} />
              <p>{t('acceptInvite.loading')}</p>
            </div>
          ) : !details ? (
            <div className="space-y-5 py-5 text-center">
              <AlertCircle className="mx-auto text-amber-400" size={42} />
              <div>
                <h1 className="text-2xl font-semibold">{t('acceptInvite.invalid.title')}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {error || t('acceptInvite.invalid.message')}
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/login" className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
                  {t('acceptInvite.invalid.signIn')}
                </Link>
                <Link to="/forgot-password" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500">
                  {t('acceptInvite.invalid.resetPassword')}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <UserRoundCheck className="mx-auto mb-3 text-emerald-400" size={38} />
                <h1 className="text-2xl font-semibold">{t('acceptInvite.title')}</h1>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {details.invited_by_name
                    ? t('acceptInvite.invitedBy', { name: details.invited_by_name })
                    : t('acceptInvite.description')}
                </p>
              </div>

              <dl className="mb-6 divide-y divide-slate-800 border-y border-slate-800 text-sm">
                <div className="flex items-center gap-3 py-3">
                  <Mail size={16} className="shrink-0 text-slate-500" />
                  <dt className="sr-only">{t('acceptInvite.email')}</dt>
                  <dd className="min-w-0 break-all text-slate-200">{details.email}</dd>
                </div>
                <div className="flex items-center gap-3 py-3">
                  <Building2 size={16} className="shrink-0 text-slate-500" />
                  <dt className="sr-only">{t('acceptInvite.organization')}</dt>
                  <dd className="min-w-0 text-slate-200">{details.organization_name}</dd>
                  <span className="ml-auto shrink-0 rounded bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                    {details.role === 'BUYER' ? t('register.roleBuyer') : t('register.roleSupplier')}
                  </span>
                </div>
              </dl>

              {error && (
                <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <form onSubmit={submit} className="space-y-4">
                <label className="block text-sm font-medium text-slate-300">
                  {t('acceptInvite.password')}
                  <span className="relative mt-1.5 block">
                    <Lock className="absolute left-3 top-3 text-slate-500" size={17} />
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </span>
                </label>
                {password && (
                  <ul className="grid gap-1 text-xs sm:grid-cols-3">
                    {passwordRules.map((rule) => (
                      <li key={rule.label} className={`flex items-center gap-1.5 ${rule.passes ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <CheckCircle2 size={13} /> {rule.label}
                      </li>
                    ))}
                  </ul>
                )}
                <label className="block text-sm font-medium text-slate-300">
                  {t('acceptInvite.confirmPassword')}
                  <span className="relative mt-1.5 block">
                    <Lock className="absolute left-3 top-3 text-slate-500" size={17} />
                    <input
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-3 text-slate-100 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </span>
                </label>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-400">{t('register.passwordMismatch')}</p>
                )}

                <label className="flex items-start gap-3 text-sm leading-5 text-slate-400">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
                  />
                  <span>
                    {t('acceptInvite.agreementPrefix')}{' '}
                    <Link to={`/${language}/terms`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">{t('acceptInvite.terms')}</Link>
                    {' '}{t('acceptInvite.agreementJoin')}{' '}
                    <Link to={`/${language}/privacy`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">{t('acceptInvite.privacy')}</Link>.
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={submitting || !passwordReady || !acceptedTerms}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting && <Loader2 className="animate-spin" size={18} />}
                  {t('acceptInvite.submit')}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default AcceptInvitationPage;
