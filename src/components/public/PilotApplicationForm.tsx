import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, CheckCircle } from 'lucide-react';
import { useNamespace } from '../../hooks/useNamespace';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FormData {
  companyName: string;
  yourName: string;
  email: string;
  role: string;
  fuelTypes: string[];
  estimatedVolume: string;
  interest: string;
}

const initialFormData: FormData = {
  companyName: '',
  yourName: '',
  email: '',
  role: '',
  fuelTypes: [],
  estimatedVolume: '',
  interest: '',
};

const STORAGE_KEY = 'verdaxis_pilot_applications';

/* ------------------------------------------------------------------ */
/*  Shared inline-style helpers                                        */
/* ------------------------------------------------------------------ */

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 600,
  color: '#0F172A',
  marginBottom: 6,
};

const inputBase: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  fontSize: 15,
  border: '1px solid #E2E8F0',
  borderRadius: 8,
  outline: 'none',
  color: '#0F172A',
  background: '#FFFFFF',
  boxSizing: 'border-box',
};

const fieldGroup: React.CSSProperties = {
  marginBottom: 24,
};

/* ================================================================== */
/*  PilotApplicationForm                                               */
/* ================================================================== */

export const PilotApplicationForm: React.FC = () => {
  const { t, ready } = useNamespace('public');
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

  // Navigate to /register 3s after submission. Cleaned up on unmount to avoid
  // calling navigate() on a dead component if the user leaves early.
  useEffect(() => {
    if (!submitted) return;
    const id = setTimeout(() => navigate('/register'), 3000);
    return () => clearTimeout(id);
  }, [submitted, navigate]);

  /* ---- helpers ---- */

  const requiredFields: (keyof FormData)[] = ['companyName', 'yourName', 'email'];

  const isFieldInvalid = (field: keyof FormData) => {
    if (!touched) return false;
    const val = formData[field];
    if (typeof val === 'string') return val.trim() === '';
    return false;
  };

  const borderFor = (field: keyof FormData): React.CSSProperties => ({
    ...inputBase,
    borderColor: isFieldInvalid(field) ? '#EF4444' : '#E2E8F0',
  });

  const handleText = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCheckbox = (fuelType: string) => {
    setFormData((prev) => {
      const types = prev.fuelTypes.includes(fuelType)
        ? prev.fuelTypes.filter((t) => t !== fuelType)
        : [...prev.fuelTypes, fuelType];
      return { ...prev, fuelTypes: types };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    // Validate required fields
    for (const field of requiredFields) {
      const val = formData[field];
      if (typeof val === 'string' && val.trim() === '') return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return;

    const application = {
      ...formData,
      submittedAt: new Date().toISOString(),
    };

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.push(application);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    // Fire-and-forget — endpoint may not exist yet; localStorage is the reliable store.
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      await fetch(`${apiUrl}/pilot-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(application),
      });
    } catch {
      // API unavailable — localStorage backup is already saved above.
    }

    setSubmitted(true);
  };

  if (!ready) return null;

  /* ---- Option arrays (translated) ---- */

  const roleOptions = [
    { value: 'Producer', label: t('pilotForm.roles.producer') },
    { value: 'Buyer/Operator', label: t('pilotForm.roles.buyerOperator') },
    { value: 'Trader/Aggregator', label: t('pilotForm.roles.traderAggregator') },
    { value: 'Financier', label: t('pilotForm.roles.financier') },
    { value: 'Other', label: t('pilotForm.roles.other') },
  ];

  const fuelTypeOptions = [
    { value: 'Methanol', label: t('pilotForm.fuelTypes.methanol') },
    { value: 'Ethanol', label: t('pilotForm.fuelTypes.ethanol') },
    { value: 'SAF', label: t('pilotForm.fuelTypes.saf') },
    { value: 'Ammonia', label: t('pilotForm.fuelTypes.ammonia') },
    { value: 'Biofuel', label: t('pilotForm.fuelTypes.biofuel') },
    { value: 'Other', label: t('pilotForm.fuelTypes.other') },
  ];

  const volumeOptions = [
    { value: '<10,000', label: t('pilotForm.volumeOptions.lt10k') },
    { value: '10,000-50,000', label: t('pilotForm.volumeOptions.10kTo50k') },
    { value: '50,000-200,000', label: t('pilotForm.volumeOptions.50kTo200k') },
    { value: '200,000-500,000', label: t('pilotForm.volumeOptions.200kTo500k') },
    { value: '500,000+', label: t('pilotForm.volumeOptions.gt500k') },
  ];

  /* ---- Success state ---- */

  if (submitted) {
    return (
      <div
        style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 12,
          padding: 48,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#DCFCE7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          <CheckCircle size={32} color="#4CAF50" />
        </div>
        <h3
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#0F172A',
            marginBottom: 12,
          }}
        >
          {t('pilotForm.success.heading')}
        </h3>
        <p
          style={{
            fontSize: 15,
            color: '#64748B',
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          {t('pilotForm.success.body')}
        </p>
        <button
          onClick={() => navigate('/register')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
            color: '#FFFFFF',
            padding: '12px 28px',
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
            marginBottom: 12,
          }}
        >
          {t('pilotForm.success.createAccount')} →
        </button>
        <p style={{ fontSize: 13, color: '#94A3B8' }}>
          {t('pilotForm.success.redirecting')}
        </p>
      </div>
    );
  }

  /* ---- Form ---- */

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Company Name */}
      <div style={fieldGroup}>
        <label htmlFor="companyName" style={labelStyle}>
          {t('pilotForm.companyName')} <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          id="companyName"
          type="text"
          value={formData.companyName}
          onChange={handleText('companyName')}
          style={borderFor('companyName')}
          placeholder={t('pilotForm.companyNamePlaceholder')}
        />
      </div>

      {/* Your Name */}
      <div style={fieldGroup}>
        <label htmlFor="yourName" style={labelStyle}>
          {t('pilotForm.yourName')} <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          id="yourName"
          type="text"
          value={formData.yourName}
          onChange={handleText('yourName')}
          style={borderFor('yourName')}
          placeholder={t('pilotForm.yourNamePlaceholder')}
        />
      </div>

      {/* Email */}
      <div style={fieldGroup}>
        <label htmlFor="email" style={labelStyle}>
          {t('pilotForm.email')} <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={handleText('email')}
          style={borderFor('email')}
          placeholder={t('pilotForm.emailPlaceholder')}
        />
      </div>

      {/* Role */}
      <div style={fieldGroup}>
        <label htmlFor="role" style={labelStyle}>
          {t('pilotForm.role')}
        </label>
        <select
          id="role"
          value={formData.role}
          onChange={handleText('role')}
          style={{ ...inputBase, cursor: 'pointer' }}
        >
          <option value="">{t('pilotForm.rolePlaceholder')}</option>
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Fuel Types of Interest */}
      <div style={fieldGroup}>
        <span style={{ ...labelStyle, marginBottom: 12 }}>{t('pilotForm.fuelTypesLabel')}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {fuelTypeOptions.map((fuel) => (
            <label
              key={fuel.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={formData.fuelTypes.includes(fuel.value)}
                onChange={() => handleCheckbox(fuel.value)}
                style={{ width: 16, height: 16, accentColor: '#4CAF50', cursor: 'pointer' }}
              />
              {fuel.label}
            </label>
          ))}
        </div>
      </div>

      {/* Estimated Annual Volume */}
      <div style={fieldGroup}>
        <label htmlFor="estimatedVolume" style={labelStyle}>
          {t('pilotForm.estimatedVolume')}
        </label>
        <select
          id="estimatedVolume"
          value={formData.estimatedVolume}
          onChange={handleText('estimatedVolume')}
          style={{ ...inputBase, cursor: 'pointer' }}
        >
          <option value="">{t('pilotForm.volumePlaceholder')}</option>
          {volumeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Interest */}
      <div style={fieldGroup}>
        <label htmlFor="interest" style={labelStyle}>
          {t('pilotForm.interestLabel')}
        </label>
        <textarea
          id="interest"
          value={formData.interest}
          onChange={handleText('interest')}
          rows={4}
          style={{
            ...inputBase,
            resize: 'vertical',
          }}
          placeholder={t('pilotForm.interestPlaceholder')}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'linear-gradient(135deg, #5DADE2, #4CAF50)',
          color: '#FFFFFF',
          padding: '14px 36px',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <Send size={18} />
        {t('pilotForm.submit')}
      </button>
    </form>
  );
};
