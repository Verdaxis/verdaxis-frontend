
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Loader2, Building2, Globe, FileText, AlertCircle, Mail } from 'lucide-react';
import { API_URL } from '../services/config';
import { useAuth } from '../context/AuthContext';

const CreateOrganizationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth(); // kept for potential cleanup, but we use location token now
  
  const registrationToken = location.state?.registration_token;

  useEffect(() => {
    if (!registrationToken) {
        // If no token, this page shouldn't be accessed directly in new flow
        // Redirect to register
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
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setRegisteredEmail(data.email || payload.registration_token);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to create organization');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
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
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>

      <div className="w-full max-w-lg p-8 relative z-10">
        <div className="text-center mb-10">
           <h1 className="text-4xl font-light tracking-tight text-white mb-2">Verdaxis</h1>
           <p className="text-slate-400">Setup Your Organization</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {registeredEmail ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                <Mail size={32} className="text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">Check your inbox</h2>
              <p className="text-slate-400">
                Organization created! We sent a verification link to{' '}
                <strong className="text-white">{registeredEmail}</strong>.
                Click it to activate your account.
              </p>
              <div className="pt-2">
                <Link to="/login" className="text-emerald-400 text-sm hover:underline">
                  Back to Sign In
                </Link>
              </div>
            </div>
          ) : (
          <>
          <div className="mb-6">
              <p className="text-sm text-slate-400 bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg flex gap-2">
                  <Building2 size={16} className="text-blue-400 shrink-0 mt-0.5" />
                  We noticed your email domain doesn't belong to an existing organization. Please create one to continue.
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
                <label className="block text-sm font-medium text-slate-400 mb-1.5">Organization Name</label>
                <div className="relative">
                    <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                    placeholder="Acme Shipping Co."
                    />
                    <Building2 className="absolute left-3 top-3 text-slate-500" size={18} />
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">Organization Type</label>
              <div className="relative">
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all appearance-none"
                >
                    <option value="SHIPPING_LINE">Shipping Line</option>
                    <option value="FUEL_SUPPLIER">Fuel Supplier</option>
                    <option value="PORT_AUTHORITY">Port Authority</option>
                </select>
                <Globe className="absolute left-3 top-3 text-slate-500" size={18} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Tax ID (Optional)</label>
                    <div className="relative">
                        <input
                        type="text"
                        name="tax_id"
                        value={formData.tax_id}
                        onChange={handleChange}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                        placeholder="VAT-123"
                        />
                        <FileText className="absolute left-3 top-3 text-slate-500" size={18} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1.5">Country Code</label>
                    <div className="relative">
                        <input
                        type="text"
                        name="country_code"
                        maxLength={2}
                        value={formData.country_code}
                        onChange={(e) => setFormData({...formData, country_code: e.target.value.toUpperCase()})}
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                        placeholder="US"
                        />
                        <Globe className="absolute left-3 top-3 text-slate-500" size={18} />
                    </div>
                </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : 'Create Organization'}
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
