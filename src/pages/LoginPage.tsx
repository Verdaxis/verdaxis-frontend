import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import { API_URL } from '../services/config';
import { DataOcean } from '../components/public/DataOcean';
import { useNamespace } from '../hooks/useNamespace';

type ErrorKind = 'generic' | 'unverified';

interface LoginError {
  kind: ErrorKind;
  message: string;
}

interface LoginLocationState {
  from?: {
    pathname: string;
    search: string;
    hash: string;
  };
}

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t, ready } = useNamespace('auth');

  // ProtectedRoute stashes the denied location; return there after login.
  const from = (location.state as LoginLocationState | null)?.from;
  const redirectTo = from ? `${from.pathname}${from.search}${from.hash}` : '/app';

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  if (!ready) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email); // OAuth2PasswordRequestForm expects 'username'
      formData.append('password', password);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(), // Ensure string representation
      });

      if (res.ok) {
        const data = await res.json();
        await login(data.access_token);
        navigate(redirectTo);
      } else {
        if (res.status === 401) {
          setLoginError({ kind: 'generic', message: t('login.error.invalidCredentials') });
        } else if (res.status === 403) {
          const errData = await res.json().catch(() => null);
          const detail: string = errData?.detail ?? '';
          if (detail.toLowerCase().includes('verify') || detail.toLowerCase().includes('verification')) {
            setLoginError({
              kind: 'unverified',
              message: t('login.error.unverified'),
            });
          } else {
            setLoginError({ kind: 'generic', message: detail || t('login.error.accessDenied') });
          }
        } else if (res.status >= 500) {
          setLoginError({ kind: 'generic', message: t('login.error.server') });
        } else {
          const errData = await res.json().catch(() => null);
          setLoginError({ kind: 'generic', message: errData?.detail || t('login.error.loginFailed') });
        }
      }
    } catch (err) {
      console.error(err);
      setLoginError({ kind: 'generic', message: t('login.error.connectionFailed') });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = () => {
    if (!loginError) return null;

    const isInfo = loginError.kind === 'unverified';

    if (isInfo) {
      return (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-3 text-amber-400">
          <Info size={20} className="shrink-0 mt-0.5" />
          <span className="text-sm">{loginError.message}</span>
        </div>
      );
    }

    return (
      <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
        <AlertCircle size={20} />
        <span className="text-sm">{loginError.message}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[#0F172A] z-0"></div>
      <div className="absolute inset-0 z-[1] opacity-40 pointer-events-auto">
        <DataOcean style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
      </div>
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] z-[2] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] z-[2] pointer-events-none"></div>

      <div className="w-full max-w-md p-8 relative z-10 pointer-events-auto">
        <div className="text-center mb-10">
           <h1 className="text-4xl font-light tracking-tight text-white mb-2">Verdaxis</h1>
           <p className="text-slate-400">{t('login.subtitle')}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            {t('login.title')}
          </h2>

          {renderError()}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('login.emailLabel')}</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  placeholder={t('login.emailPlaceholder')}
                />
                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-400">{t('login.passwordLabel')}</label>
                <Link to="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                  {t('login.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  placeholder={t('login.passwordPlaceholder')}
                />
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : t('login.submit')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              {t('login.createAccount')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
