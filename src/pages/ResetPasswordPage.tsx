import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { API_URL } from '../services/config';

const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
  { label: 'Contains uppercase letter', test: (pw: string) => /[A-Z]/.test(pw) },
  { label: 'Contains a number', test: (pw: string) => /\d/.test(pw) },
];

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const allRulesPass = PASSWORD_RULES.every(rule => rule.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing reset token. Please use the link from your email.');
      return;
    }

    const failedRule = PASSWORD_RULES.find(rule => !rule.test(password));
    if (failedRule) {
      setError(`Password requirement not met: ${failedRule.label.toLowerCase()}.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const errData = await res.json().catch(() => null);
        setError(errData?.detail || 'Failed to reset password. The link may have expired.');
      }
    } catch {
      setError('Unable to connect to server. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[#0F172A] z-0"></div>
        <div className="w-full max-w-md p-8 relative z-10">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-4">
            <AlertCircle size={48} className="text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-white">Invalid Reset Link</h2>
            <p className="text-slate-400 text-sm">
              This password reset link is invalid or missing. Please request a new one.
            </p>
            <Link to="/forgot-password" className="text-emerald-400 text-sm hover:underline inline-block mt-2">
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0F172A] z-0"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Verdaxis</h1>
          <p className="text-slate-400">Set New Password</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Password Updated</h2>
              <p className="text-slate-400">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
              <div className="pt-4">
                <Link
                  to="/login"
                  className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 px-6 rounded-lg transition-all"
                >
                  Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">New Password</label>
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
                  {password && (
                    <div className="mt-2 space-y-1">
                      {PASSWORD_RULES.map(rule => {
                        const passes = rule.test(password);
                        return (
                          <div key={rule.label} className="flex items-center gap-2 text-xs">
                            <CheckCircle2 size={14} className={passes ? 'text-emerald-400' : 'text-slate-600'} />
                            <span className={passes ? 'text-emerald-400' : 'text-slate-500'}>{rule.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                      placeholder="••••••••"
                    />
                    <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p className="mt-1.5 text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !allRulesPass || password !== confirmPassword}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Reset Password'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors flex items-center justify-center gap-1">
                  <ArrowLeft size={14} />
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
