import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Mail, Lock, User, AlertCircle, Briefcase, CheckCircle2, RefreshCw } from 'lucide-react';
import { API_URL } from '../services/config';
import { useNamespace } from '../hooks/useNamespace';

const RESEND_COOLDOWN = 60; // seconds

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const { t, ready } = useNamespace('auth');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'BUYER' // Default
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  // Resend state
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  if (!ready) return null;

  const PASSWORD_RULES = [
    { label: t('register.passwordRule.minLength'), test: (pw: string) => pw.length >= 8 },
    { label: t('register.passwordRule.uppercase'), test: (pw: string) => /[A-Z]/.test(pw) },
    { label: t('register.passwordRule.number'), test: (pw: string) => /\d/.test(pw) },
  ];

  const allRulesPass = PASSWORD_RULES.every(rule => rule.test(formData.password));

  const startCooldown = () => {
    setResendCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resendStatus === 'sending') return;
    setResendStatus('sending');
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      if (res.ok) {
        setResendStatus('sent');
        startCooldown();
        setTimeout(() => setResendStatus('idle'), 3000);
      } else {
        setResendStatus('error');
        setTimeout(() => setResendStatus('idle'), 3000);
      }
    } catch {
      setResendStatus('error');
      setTimeout(() => setResendStatus('idle'), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const failedRule = PASSWORD_RULES.find(rule => !rule.test(formData.password));
    if (failedRule) {
      setError(t('register.error.requirementNotMet', { rule: failedRule.label.toLowerCase() }));
      return;
    }
    if (formData.password !== confirmPassword) {
      setError(t('register.error.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...formData, ...(referralCode ? { referral_code: referralCode } : {}) }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.status === 'requires_org') {
          // Email domain has no org — go to org creation flow
          navigate('/create-organization', {
            state: { registration_token: data.registration_token }
          });
        } else {
          // status === 'created' — user created, verification email sent
          setRegistered(true);
          startCooldown();
        }
      } else {
        const errData = await res.json();
        setError(errData.detail || t('register.error.failed'));
      }
    } catch (err) {
      console.error(err);
      setError(t('register.error.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setFormData({
          ...formData,
          [e.target.name]: e.target.value
      });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[#0F172A] z-0"></div>
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>

      <div className="w-full max-w-lg p-8 relative z-10">
        <div className="text-center mb-10">
           <h1 className="text-4xl font-light tracking-tight text-white mb-2">Verdaxis</h1>
           <p className="text-slate-400">{t('register.subtitle')}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {registered ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                <Mail size={32} className="text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('register.success.title')}</h2>
              <p className="text-slate-400">
                {t('register.success.sentTo')}{' '}
                <strong className="text-white">{formData.email}</strong>.
                {' '}{t('register.success.clickToActivate')}
              </p>
              <p className="text-slate-500 text-sm">
                {t('register.success.notReceived')}
              </p>

              {/* Resend button with visual countdown */}
              <div className="pt-2 flex flex-col items-center gap-2">
                <button
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || resendStatus === 'sending'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-500 disabled:text-slate-600 disabled:border-slate-800 disabled:cursor-not-allowed transition-all"
                >
                  {resendStatus === 'sending' ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} className={resendStatus === 'sent' ? 'text-emerald-400' : ''} />
                  )}
                  {resendStatus === 'sent'
                    ? t('register.resend.sent')
                    : resendStatus === 'error'
                    ? t('register.resend.error')
                    : t('register.resend.button')}
                </button>
                {resendCooldown > 0 && (
                  <p className="text-slate-600 text-xs tabular-nums">
                    {t('register.resend.cooldown')} <span className="text-slate-400 font-semibold">{resendCooldown}s</span>
                  </p>
                )}
              </div>

              <div className="pt-1">
                <Link to="/login" className="text-emerald-400 text-sm hover:underline">
                  {t('register.backToSignIn')}
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

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('register.firstName')}</label>
                        <div className="relative">
                            <input
                            type="text"
                            name="first_name"
                            required
                            value={formData.first_name}
                            onChange={handleChange}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                            placeholder={t('register.firstNamePlaceholder')}
                            />
                            <User className="absolute left-3 top-3 text-slate-500" size={18} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('register.lastName')}</label>
                        <div className="relative">
                            <input
                            type="text"
                            name="last_name"
                            required
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                            placeholder={t('register.lastNamePlaceholder')}
                            />
                            <User className="absolute left-3 top-3 text-slate-500" size={18} />
                        </div>
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('register.role')}</label>
                  <div className="relative">
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all appearance-none"
                    >
                        <option value="BUYER">{t('register.roleBuyer')}</option>
                        <option value="SUPPLIER">{t('register.roleSupplier')}</option>
                    </select>
                    <Briefcase className="absolute left-3 top-3 text-slate-500" size={18} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('register.email')}</label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                      placeholder={t('register.emailPlaceholder')}
                    />
                    <Mail className="absolute left-3 top-3 text-slate-500" size={18} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('register.password')}</label>
                  <div className="relative">
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                      placeholder={t('register.passwordPlaceholder')}
                    />
                    <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                  </div>
                  {formData.password && (
                    <div className="mt-2 space-y-1">
                      {PASSWORD_RULES.map(rule => {
                        const passes = rule.test(formData.password);
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
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('register.confirmPassword')}</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                      placeholder={t('register.confirmPasswordPlaceholder')}
                    />
                    <Lock className="absolute left-3 top-3 text-slate-500" size={18} />
                  </div>
                  {confirmPassword && confirmPassword !== formData.password && (
                    <p className="mt-1.5 text-xs text-red-400">{t('register.passwordMismatch')}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !allRulesPass || formData.password !== confirmPassword}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : t('register.submit')}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-500">
                {t('register.hasAccount')}{' '}
                <Link to="/login" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                  {t('register.signIn')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
