import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Mail, Lock, AlertCircle, Info } from 'lucide-react';
import { API_URL } from '../services/config';
import { DataOcean } from '../components/public/DataOcean';

type ErrorKind = 'generic' | 'unverified' | 'pending';

interface LoginError {
  kind: ErrorKind;
  message: string;
}

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<LoginError | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/app');
    }
  }, [isAuthenticated, navigate]);

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
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(), // Ensure string representation
      });

      if (res.ok) {
        const data = await res.json();
        await login(data.access_token, data.refresh_token);
        navigate('/app');
      } else {
        if (res.status === 401) {
          setLoginError({ kind: 'generic', message: 'Invalid email or password.' });
        } else if (res.status === 403) {
          const errData = await res.json().catch(() => null);
          const detail: string = errData?.detail ?? '';
          if (detail.toLowerCase().includes('verify') || detail.toLowerCase().includes('verification')) {
            setLoginError({
              kind: 'unverified',
              message: 'Please verify your email first. Check your inbox for the verification link.',
            });
          } else if (
            detail.toLowerCase().includes('pending') ||
            detail.toLowerCase().includes('review')
          ) {
            setLoginError({
              kind: 'pending',
              message: "Your account is under review. We'll notify you when approved.",
            });
          } else {
            setLoginError({ kind: 'generic', message: detail || 'Access denied.' });
          }
        } else if (res.status >= 500) {
          setLoginError({ kind: 'generic', message: 'Server error. Please try again later.' });
        } else {
          const errData = await res.json().catch(() => null);
          setLoginError({ kind: 'generic', message: errData?.detail || 'Login failed' });
        }
      }
    } catch (err) {
      console.error(err);
      setLoginError({ kind: 'generic', message: 'Unable to connect to server. Please check your connection.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderError = () => {
    if (!loginError) return null;

    const isInfo = loginError.kind === 'unverified' || loginError.kind === 'pending';

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
           <p className="text-slate-400">Intelligence Cockpit</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            Sign In
          </h2>

          {renderError()}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  placeholder="name@company.com"
                />
                <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                  placeholder="••••••••"
                />
                <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Sign In'}
            </button>
          </form>

          {/* OAuth Divider */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700/50"></div>
            <span className="text-xs text-slate-500 font-medium">or continue with</span>
            <div className="flex-1 h-px bg-slate-700/50"></div>
          </div>

          {/* OAuth Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a
              href={`${API_URL.replace('/api', '')}/oauth/google/login`}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-slate-700/50 rounded-lg text-sm text-slate-300 font-medium transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Google
            </a>
            <a
              href={`${API_URL.replace('/api', '')}/oauth/microsoft/login`}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-slate-700/50 rounded-lg text-sm text-slate-300 font-medium transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
              Microsoft
            </a>
          </div>

          <div className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
