import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../services/config';


const RegisterPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'BUYER' // Default
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setSuccess(true);
      // Optional: Redirect after a few seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
        setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <div className="bg-slate-800 p-8 rounded-lg shadow-xl w-96 border border-slate-700">
        <h2 className="text-2xl font-bold mb-6 text-center text-emerald-400">Join Verdaxis</h2>
        
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {success ? (
             <div className="bg-emerald-500/10 border border-emerald-500 text-emerald-500 p-4 rounded mb-4 text-center">
                <p className="font-bold">Registration Successful!</p>
                <p className="text-sm mt-2">Your account is pending approval. You will be redirected to login shortly.</p>
             </div>
        ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">First Name</label>
                    <input
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-slate-300">Last Name</label>
                    <input
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                    required
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Email</label>
                <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                required
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">Password</label>
                <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                required
                />
            </div>

            <div>
                <label className="block text-sm font-medium mb-1 text-slate-300">I am a...</label>
                <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-emerald-500"
                >
                    <option value="BUYER">Buyer (Shipper/Trader)</option>
                    <option value="SUPPLIER">Supplier (Producer/Barge)</option>
                </select>
            </div>

            <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition cursor-pointer"
            >
                Register
            </button>
            </form>
        )}

        <div className="mt-4 text-center text-sm text-slate-400">
            Already have an account? <Link to="/login" className="text-emerald-400 hover:underline">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
