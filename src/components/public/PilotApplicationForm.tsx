import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';

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

const roleOptions = ['Producer', 'Buyer/Operator', 'Trader/Aggregator', 'Financier', 'Other'];
const fuelTypeOptions = ['Methanol', 'Ethanol', 'SAF', 'Ammonia', 'Biofuel', 'Other'];
const volumeOptions = [
  '<10,000',
  '10,000-50,000',
  '50,000-200,000',
  '200,000-500,000',
  '500,000+',
];

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
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(false);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    // Validate required fields
    for (const field of requiredFields) {
      const val = formData[field];
      if (typeof val === 'string' && val.trim() === '') return;
    }

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    existing.push({
      ...formData,
      submittedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    setSubmitted(true);
  };

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
          Thank you! We'll be in touch within 48 hours.
        </h3>
        <p
          style={{
            fontSize: 15,
            color: '#64748B',
            lineHeight: 1.6,
          }}
        >
          Or email us directly at{' '}
          <a
            href="mailto:pilot@verdaxis.exchange"
            style={{ color: '#5DADE2', fontWeight: 600, textDecoration: 'underline' }}
          >
            pilot@verdaxis.exchange
          </a>
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
          Company Name <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          id="companyName"
          type="text"
          value={formData.companyName}
          onChange={handleText('companyName')}
          style={borderFor('companyName')}
          placeholder="e.g. Nordic Green Fuels AS"
        />
      </div>

      {/* Your Name */}
      <div style={fieldGroup}>
        <label htmlFor="yourName" style={labelStyle}>
          Your Name <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          id="yourName"
          type="text"
          value={formData.yourName}
          onChange={handleText('yourName')}
          style={borderFor('yourName')}
          placeholder="e.g. Jane Doe"
        />
      </div>

      {/* Email */}
      <div style={fieldGroup}>
        <label htmlFor="email" style={labelStyle}>
          Email <span style={{ color: '#EF4444' }}>*</span>
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={handleText('email')}
          style={borderFor('email')}
          placeholder="e.g. jane@company.com"
        />
      </div>

      {/* Role */}
      <div style={fieldGroup}>
        <label htmlFor="role" style={labelStyle}>
          Role
        </label>
        <select
          id="role"
          value={formData.role}
          onChange={handleText('role')}
          style={{ ...inputBase, cursor: 'pointer' }}
        >
          <option value="">Select a role...</option>
          {roleOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Fuel Types of Interest */}
      <div style={fieldGroup}>
        <span style={{ ...labelStyle, marginBottom: 12 }}>Fuel Types of Interest</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {fuelTypeOptions.map((fuel) => (
            <label
              key={fuel}
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
                checked={formData.fuelTypes.includes(fuel)}
                onChange={() => handleCheckbox(fuel)}
                style={{ width: 16, height: 16, accentColor: '#4CAF50', cursor: 'pointer' }}
              />
              {fuel}
            </label>
          ))}
        </div>
      </div>

      {/* Estimated Annual Volume */}
      <div style={fieldGroup}>
        <label htmlFor="estimatedVolume" style={labelStyle}>
          Estimated Annual Volume (mt)
        </label>
        <select
          id="estimatedVolume"
          value={formData.estimatedVolume}
          onChange={handleText('estimatedVolume')}
          style={{ ...inputBase, cursor: 'pointer' }}
        >
          <option value="">Select a range...</option>
          {volumeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Interest */}
      <div style={fieldGroup}>
        <label htmlFor="interest" style={labelStyle}>
          What interests you about Verdaxis?
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
          placeholder="Tell us about your needs (optional)"
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
        Submit Application
      </button>
    </form>
  );
};
