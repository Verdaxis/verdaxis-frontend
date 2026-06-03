
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, Building2, Search, FileText, AlertCircle, Mail, ChevronDown, X, RefreshCw } from 'lucide-react';
import { API_URL } from '../services/config';
import { useAuth } from '../context/AuthContext';
import { useNamespace } from '../hooks/useNamespace';

const ISO_COUNTRY_CODES = [
  'AF', 'AX', 'AL', 'DZ', 'AS', 'AD', 'AO', 'AI', 'AQ', 'AG', 'AR', 'AM', 'AW', 'AU', 'AT', 'AZ',
  'BS', 'BH', 'BD', 'BB', 'BY', 'BE', 'BZ', 'BJ', 'BM', 'BT', 'BO', 'BQ', 'BA', 'BW', 'BV', 'BR',
  'IO', 'BN', 'BG', 'BF', 'BI', 'CV', 'KH', 'CM', 'CA', 'KY', 'CF', 'TD', 'CL', 'CN', 'CX', 'CC',
  'CO', 'KM', 'CG', 'CD', 'CK', 'CR', 'CI', 'HR', 'CU', 'CW', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO',
  'EC', 'EG', 'SV', 'GQ', 'ER', 'EE', 'SZ', 'ET', 'FK', 'FO', 'FJ', 'FI', 'FR', 'GF', 'PF', 'TF',
  'GA', 'GM', 'GE', 'DE', 'GH', 'GI', 'GR', 'GL', 'GD', 'GP', 'GU', 'GT', 'GG', 'GN', 'GW', 'GY',
  'HT', 'HM', 'VA', 'HN', 'HK', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IM', 'IL', 'IT', 'JM',
  'JP', 'JE', 'JO', 'KZ', 'KE', 'KI', 'KP', 'KR', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR', 'LY',
  'LI', 'LT', 'LU', 'MO', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MQ', 'MR', 'MU', 'YT', 'MX',
  'FM', 'MD', 'MC', 'MN', 'ME', 'MS', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NC', 'NZ', 'NI',
  'NE', 'NG', 'NU', 'NF', 'MK', 'MP', 'NO', 'OM', 'PK', 'PW', 'PS', 'PA', 'PG', 'PY', 'PE', 'PH',
  'PN', 'PL', 'PT', 'PR', 'QA', 'RE', 'RO', 'RU', 'RW', 'BL', 'SH', 'KN', 'LC', 'MF', 'PM', 'VC',
  'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC', 'SL', 'SG', 'SX', 'SK', 'SI', 'SB', 'SO', 'ZA', 'GS',
  'SS', 'ES', 'LK', 'SD', 'SR', 'SJ', 'SE', 'CH', 'SY', 'TW', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TK',
  'TO', 'TT', 'TN', 'TR', 'TM', 'TC', 'TV', 'UG', 'UA', 'AE', 'GB', 'US', 'UM', 'UY', 'UZ', 'VU',
  'VE', 'VN', 'VG', 'VI', 'WF', 'EH', 'YE', 'ZM', 'ZW',
] as const;

const ENGLISH_COUNTRY_OVERRIDES: Partial<Record<typeof ISO_COUNTRY_CODES[number], string>> = {
  BO: 'Bolivia',
  BQ: 'Caribbean Netherlands',
  CD: 'Democratic Republic of the Congo',
  CG: 'Republic of the Congo',
  CI: "Cote d'Ivoire",
  CZ: 'Czechia',
  FK: 'Falkland Islands',
  FM: 'Micronesia',
  IR: 'Iran',
  KP: 'North Korea',
  KR: 'South Korea',
  LA: 'Laos',
  MD: 'Moldova',
  MK: 'North Macedonia',
  PS: 'Palestine',
  RU: 'Russia',
  SY: 'Syria',
  TZ: 'Tanzania',
  TR: 'Turkey',
  TW: 'Taiwan',
  US: 'United States',
  VA: 'Vatican City',
  VE: 'Venezuela',
  VN: 'Vietnam',
};

export interface CountryOption {
  code: string;
  name: string;
}

export function getAvailableCountries(locale = 'en'): CountryOption[] {
  const displayNames = typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames([locale], { type: 'region' })
    : null;

  return ISO_COUNTRY_CODES
    .map((code) => ({
      code,
      name: displayNames?.of(code) || ENGLISH_COUNTRY_OVERRIDES[code] || code,
    }))
    .map((country) => ({
      ...country,
      name: locale.toLowerCase().startsWith('en')
        ? ENGLISH_COUNTRY_OVERRIDES[country.code as typeof ISO_COUNTRY_CODES[number]] || country.name
        : country.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

interface CountryDropdownProps {
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  noResults: string;
}

export const CREATE_ORGANIZATION_ORG_TYPES = [
  { value: 'SHIPPING_LINE', side: 'BUYER', labelKey: 'shippingLine', descriptionKey: 'shippingLineDesc' },
  { value: 'SHIP_MANAGER', side: 'BUYER', labelKey: 'shipManager', descriptionKey: 'shipManagerDesc' },
  { value: 'FUEL_BUYER', side: 'BUYER', labelKey: 'fuelBuyer', descriptionKey: 'fuelBuyerDesc' },
  { value: 'CHARTERER', side: 'BUYER', labelKey: 'charterer', descriptionKey: 'chartererDesc' },
  { value: 'FUEL_SUPPLIER', side: 'SELLER', labelKey: 'fuelSupplier', descriptionKey: 'fuelSupplierDesc' },
] as const;

type OrganizationSide = 'BUYER' | 'SELLER';

interface OrganizationTypeOption {
  value: string;
  side: OrganizationSide;
  label: string;
  description: string;
}

interface OrganizationTypeDropdownProps {
  value: string;
  options: OrganizationTypeOption[];
  buyerLabel: string;
  sellerLabel: string;
  onChange: (value: string) => void;
}

export function formatApiErrorDetail(detail: unknown, fallback: string): string {
  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => formatApiErrorDetail(item, ''))
      .filter(Boolean);
    return messages.length > 0 ? messages.join(' ') : fallback;
  }

  if (detail && typeof detail === 'object') {
    const record = detail as Record<string, unknown>;
    if (typeof record.msg === 'string' && record.msg.trim()) return record.msg;
    if (typeof record.message === 'string' && record.message.trim()) return record.message;
    if (typeof record.error === 'string' && record.error.trim()) return record.error;
  }

  return fallback;
}

const CountryDropdown: React.FC<CountryDropdownProps> = ({ value, onChange, placeholder, searchPlaceholder, noResults }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const countries = useMemo(
    () => getAvailableCountries(typeof navigator === 'undefined' ? 'en' : navigator.language || 'en'),
    [],
  );

  const filtered = countries.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const selected = countries.find(c => c.code === value);

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

const sideStyles: Record<OrganizationSide, { pill: string; dot: string; header: string }> = {
  BUYER: {
    pill: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
    dot: 'bg-blue-400',
    header: 'text-blue-300',
  },
  SELLER: {
    pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    dot: 'bg-emerald-400',
    header: 'text-emerald-300',
  },
};

const OrganizationTypeDropdown: React.FC<OrganizationTypeDropdownProps> = ({
  value,
  options,
  buyerLabel,
  sellerLabel,
  onChange,
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(option => option.value === value);
  const groupedOptions: Array<{ side: OrganizationSide; label: string; options: OrganizationTypeOption[] }> = [
    { side: 'BUYER', label: buyerLabel, options: options.filter(option => option.side === 'BUYER') },
    { side: 'SELLER', label: sellerLabel, options: options.filter(option => option.side === 'SELLER') },
  ];

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
        onClick={() => setOpen(!open)}
        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-10 py-2.5 text-left flex items-center justify-between gap-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
      >
        <span className="truncate">{selected?.label}</span>
        {selected && (
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${sideStyles[selected.side].pill}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sideStyles[selected.side].dot}`} />
            {selected.side === 'BUYER' ? buyerLabel : sellerLabel}
          </span>
        )}
      </button>
      <Building2 className="absolute left-3 top-3 text-slate-500 pointer-events-none" size={18} />
      <ChevronDown size={16} className="absolute right-3 top-3.5 text-slate-500 pointer-events-none" />

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          {groupedOptions.map((group, groupIndex) => (
            <div key={group.side} className={groupIndex > 0 ? 'border-t border-slate-700/80' : undefined}>
              <div className={`px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] bg-slate-900/70 ${sideStyles[group.side].header}`}>
                {group.label}
              </div>
              {group.options.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className={`w-full px-3 py-2.5 text-left hover:bg-slate-700 transition-colors ${value === option.value ? 'bg-emerald-500/5' : ''}`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-200">{option.label}</span>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${sideStyles[option.side].pill}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sideStyles[option.side].dot}`} />
                      {option.side === 'BUYER' ? buyerLabel : sellerLabel}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                </button>
              ))}
            </div>
          ))}
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

  const ORG_TYPES = CREATE_ORGANIZATION_ORG_TYPES.map((type) => ({
    value: type.value,
    side: type.side,
    label: t(`createOrg.orgType.${type.labelKey}`),
    description: t(`createOrg.orgType.${type.descriptionKey}`),
  }));

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
        const errData = await res.json().catch(() => null);
        setError(formatApiErrorDetail(errData?.detail ?? errData, t('createOrg.error.failed')));
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
                  <OrganizationTypeDropdown
                    value={formData.type}
                    options={ORG_TYPES}
                    buyerLabel={t('createOrg.side.buyer')}
                    sellerLabel={t('createOrg.side.seller')}
                    onChange={type => setFormData({ ...formData, type })}
                  />
                  {selectedOrgType && (
                    <p className="mt-1.5 text-xs text-slate-500">{selectedOrgType.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      {t('createOrg.side.buyer')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {t('createOrg.side.seller')}
                    </span>
                  </div>
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
