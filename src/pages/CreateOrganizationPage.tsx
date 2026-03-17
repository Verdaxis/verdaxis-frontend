
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, Building2, Search, FileText, AlertCircle, Mail, ChevronDown, X, RefreshCw } from 'lucide-react';
import { API_URL } from '../services/config';
import { useAuth } from '../context/AuthContext';
import { useNamespace } from '../hooks/useNamespace';

const COUNTRIES = [
  { code: 'SG', name: 'Singapore' }, { code: 'CN', name: 'China' }, { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' }, { code: 'HK', name: 'Hong Kong' }, { code: 'TW', name: 'Taiwan' },
  { code: 'MY', name: 'Malaysia' }, { code: 'TH', name: 'Thailand' }, { code: 'ID', name: 'Indonesia' },
  { code: 'PH', name: 'Philippines' }, { code: 'VN', name: 'Vietnam' }, { code: 'IN', name: 'India' },
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'QA', name: 'Qatar' }, { code: 'BH', name: 'Bahrain' }, { code: 'KW', name: 'Kuwait' },
  { code: 'OM', name: 'Oman' }, { code: 'EG', name: 'Egypt' }, { code: 'GR', name: 'Greece' },
  { code: 'CY', name: 'Cyprus' }, { code: 'MT', name: 'Malta' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'NL', name: 'Netherlands' }, { code: 'DE', name: 'Germany' }, { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' }, { code: 'SE', name: 'Sweden' }, { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' }, { code: 'ES', name: 'Spain' }, { code: 'PT', name: 'Portugal' },
  { code: 'IT', name: 'Italy' }, { code: 'CH', name: 'Switzerland' }, { code: 'BE', name: 'Belgium' },
  { code: 'PL', name: 'Poland' }, { code: 'TR', name: 'Turkey' }, { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' }, { code: 'MX', name: 'Mexico' }, { code: 'BR', name: 'Brazil' },
  { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' }, { code: 'ZA', name: 'South Africa' },
  { code: 'NG', name: 'Nigeria' }, { code: 'KE', name: 'Kenya' }, { code: 'MA', name: 'Morocco' },
  { code: 'PA', name: 'Panama' }, { code: 'LR', name: 'Liberia' }, { code: 'MH', name: 'Marshall Islands' },
  { code: 'BS', name: 'Bahamas' }, { code: 'BM', name: 'Bermuda' }, { code: 'KY', name: 'Cayman Islands' },
  { code: 'GI', name: 'Gibraltar' }, { code: 'RU', name: 'Russia' }, { code: 'UA', name: 'Ukraine' },
  { code: 'IL', name: 'Israel' }, { code: 'PK', name: 'Pakistan' }, { code: 'BD', name: 'Bangladesh' },
  { code: 'LK', name: 'Sri Lanka' }, { code: 'MM', name: 'Myanmar' }, { code: 'KH', name: 'Cambodia' },
];

interface CountryDropdownProps {
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  noResults: string;
}

const CountryDropdown: React.FC<CountryDropdownProps> = ({ value, onChange, placeholder, searchPlaceholder, noResults }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const selected = COUNTRIES.find(c => c.code === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-left flex items-center justify-between text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
      >
        <span className={selected ? 'text-slate-200' : 'text-slate-500'}>
          {selected ? `${selected.code} — ${selected.name}` : placeholder}
        </span>
        <ChevronDown size={16} className="text-slate-500 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-slate-700/50 rounded px-8 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-2">
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-slate-500 text-sm px-3 py-2">{noResults}</p>
            ) : (
              filtered.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => { onChange(c.code); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors flex items-center gap-2 ${value === c.code ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-300'}`}
                >
                  <span className="font-mono text-xs text-slate-500 w-7 shrink-0">{c.code}</span>
                  {c.name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CreateOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const { t, ready } = useNamespace('auth');

  const registrationToken = location.state?.registration_token;

  useEffect(() => {
    if (!registrationToken) {
      navigate('/register');
    }
  }, [registrationToken, navigate]);

  const [formData, setFormData] = useState({
    name: '',
    type: 'SHIPPING_LINE',
    tax_id: '',
    country_code: ''
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  if (!ready) return null;

  const ORG_TYPES = [
    { value: 'SHIPPING_LINE', label: t('createOrg.orgType.shippingLine'), description: t('createOrg.orgType.shippingLineDesc') },
    { value: 'SHIP_MANAGER', label: t('createOrg.orgType.shipManager'), description: t('createOrg.orgType.shipManagerDesc') },
    { value: 'FUEL_SUPPLIER', label: t('createOrg.orgType.fuelSupplier'), description: t('createOrg.orgType.fuelSupplierDesc') },
    { value: 'BUNKER_BROKER', label: t('createOrg.orgType.bunkerBroker'), description: t('createOrg.orgType.bunkerBrokerDesc') },
    { value: 'PORT_AUTHORITY', label: t('createOrg.orgType.portAuthority'), description: t('createOrg.orgType.portAuthorityDesc') },
    { value: 'FUEL_TRADER', label: t('createOrg.orgType.fuelTrader'), description: t('createOrg.orgType.fuelTraderDesc') },
    { value: 'CHARTERER', label: t('createOrg.orgType.charterer'), description: t('createOrg.orgType.chartererDesc') },
    { value: 'FINANCIER', label: t('createOrg.orgType.financier'), description: t('createOrg.orgType.financierDesc') },
    { value: 'INSURER', label: t('createOrg.orgType.insurer'), description: t('createOrg.orgType.insurerDesc') },
    { value: 'INDUSTRY_ASSOC', label: t('createOrg.orgType.industryAssoc'), description: t('createOrg.orgType.industryAssocDesc') },
  ];

  const startCooldown = () => {
    setResendCooldown(60);
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
    if (resendCooldown > 0 || resendStatus === 'sending' || !registeredEmail) return;
    setResendStatus('sending');
    try {
      const res = await fetch(`${API_URL}/auth/resend-verification-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail }),
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
    setIsSubmitting(true);

    try {
      const payload = {
        registration_token: registrationToken,
        organization: formData
      };

      const res = await fetch(`${API_URL}/auth/register-with-org`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setRegisteredEmail(data.email || '');
        startCooldown();
      } else {
        const errData = await res.json();
        setError(errData.detail || t('createOrg.error.failed'));
      }
    } catch (err) {
      console.error(err);
      setError(t('createOrg.error.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedOrgType = ORG_TYPES.find(t => t.value === formData.type);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[#0F172A] z-0"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>

      <div className="w-full max-w-lg p-8 relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-light tracking-tight text-white mb-2">Verdaxis</h1>
          <p className="text-slate-400">{t('createOrg.subtitle')}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {registeredEmail ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                <Mail size={32} className="text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('createOrg.success.title')}</h2>
              <p className="text-slate-400">
                {t('createOrg.success.created')}{' '}
                <strong className="text-white">{registeredEmail}</strong>.
                {' '}{t('createOrg.success.clickToActivate')}
              </p>
              <p className="text-slate-500 text-sm">
                {t('createOrg.success.notReceived')}
              </p>

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
                    ? t('createOrg.resend.sent')
                    : resendStatus === 'error'
                    ? t('createOrg.resend.error')
                    : t('createOrg.resend.button')}
                </button>
                {resendCooldown > 0 && (
                  <p className="text-slate-600 text-xs tabular-nums">
                    {t('createOrg.resend.cooldown')} <span className="text-slate-400 font-semibold">{resendCooldown}s</span>
                  </p>
                )}
              </div>

              <div className="pt-1">
                <Link to="/login" className="text-emerald-400 text-sm hover:underline">
                  {t('createOrg.backToSignIn')}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-sm text-slate-400 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-2">
                  <Building2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  {t('createOrg.domainNotice')}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                  <AlertCircle size={20} />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('createOrg.orgName')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                      placeholder={t('createOrg.orgNamePlaceholder')}
                    />
                    <Building2 className="absolute left-3 top-3 text-slate-500" size={18} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('createOrg.orgType')}</label>
                  <div className="relative">
                    <select
                      name="type"
                      value={formData.type}
                      onChange={e => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all appearance-none"
                    >
                      {ORG_TYPES.map(orgType => (
                        <option key={orgType.value} value={orgType.value}>{orgType.label}</option>
                      ))}
                    </select>
                    <Building2 className="absolute left-3 top-3 text-slate-500" size={18} />
                  </div>
                  {selectedOrgType && (
                    <p className="mt-1.5 text-xs text-slate-500">{selectedOrgType.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">{t('createOrg.country')}</label>
                  <CountryDropdown
                    value={formData.country_code}
                    onChange={code => setFormData({ ...formData, country_code: code })}
                    placeholder={t('createOrg.countryPlaceholder')}
                    searchPlaceholder={t('createOrg.countrySearch')}
                    noResults={t('createOrg.countryNoResults')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">
                    {t('createOrg.taxId')} <span className="text-slate-600">{t('createOrg.taxIdOptional')}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                      className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                      placeholder={t('createOrg.taxIdPlaceholder')}
                    />
                    <FileText className="absolute left-3 top-3 text-slate-500" size={18} />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !formData.country_code}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : t('createOrg.submit')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateOrganizationPage;
