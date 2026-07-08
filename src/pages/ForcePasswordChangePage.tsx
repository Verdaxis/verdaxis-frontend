import React, { useState } from 'react';
import { AlertCircle, Check, Eye, EyeOff, Loader2, Lock, LogOut, ShieldCheck } from 'lucide-react';
import { API_URL } from '../services/config';
import { useAuth } from '../context/AuthContext';
import { useNamespace } from '../hooks/useNamespace';

const ForcePasswordChangePage: React.FC = () => {
  const { token, login, logout, user } = useAuth();
  const { t, ready } = useNamespace('settings');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!ready) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('security.errorMismatch') });
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: t('security.errorTooShort') });
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        setMessage({ type: 'error', text: error?.detail || t('security.errorGeneric') });
        return;
      }

      const data = await res.json();
      setMessage({ type: 'success', text: t('security.successMsg') });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (data.access_token) {
        await login(data.access_token, data.refresh_token);
      }
    } catch {
      setMessage({ type: 'error', text: t('security.errorNetwork') });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,122,0.12),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_30%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
            <ShieldCheck className="text-emerald-300" size={24} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Verdaxis</h1>
          <p className="mt-2 text-sm text-slate-400">{t('forcePassword.subtitle')}</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur">
          <div className="mb-5">
            <h2 className="text-xl font-semibold">{t('forcePassword.title')}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {t('forcePassword.description', { email: user?.email || '' })}
            </p>
          </div>

          {message && (
            <div className={`mb-5 flex items-center gap-2 rounded-lg p-3 text-sm ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-red-500/10 text-red-300'
            }`}>
              {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">{t('security.currentPassword')}</label>
              <div className="relative">
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                  placeholder={t('security.currentPasswordPlaceholder')}
                />
                <button type="button" onClick={() => setShowCurrentPw((value) => !value)} className="absolute right-3 top-2.5 text-slate-400 hover:text-white">
                  {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">{t('security.newPassword')}</label>
              <div className="relative">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 pr-10 text-sm text-white outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                  placeholder={t('security.newPasswordPlaceholder')}
                />
                <button type="button" onClick={() => setShowNewPw((value) => !value)} className="absolute right-3 top-2.5 text-slate-400 hover:text-white">
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">{t('security.confirmPassword')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/10"
                placeholder={t('security.confirmPasswordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} />}
              {isSubmitting ? t('security.changingBtn') : t('forcePassword.submit')}
            </button>
          </form>

          <button
            type="button"
            onClick={logout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={16} />
            {t('forcePassword.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForcePasswordChangePage;
