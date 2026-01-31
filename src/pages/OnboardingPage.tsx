import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Briefcase, LayoutDashboard } from 'lucide-react';
import { API_URL } from '../services/config';

export const OnboardingPage: React.FC = () => {
    const { token, login } = useAuth(); // We might need a method to refresh user profile
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        role: '' // 'BUYER' | 'SUPPLIER'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (!formData.role) {
            setError("Please select a role.");
            setIsLoading(false);
            return;
        }

        try {
            // Updated Endpoint: Assuming POST /users/onboard or PUT /users/me
            // Standard approach: PUT /users/me with new fields
            const response = await fetch(`${API_URL}/auth/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to update profile');
            }
            
            // Force reload or re-fetch profile?
            // Ideally AuthContext should expose a `refreshUser` or we just reload window
            window.location.href = '/'; 
            
        } catch (err: any) {
            console.error("Onboarding error:", err);
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome to Verdaxis</h1>
                    <p className="text-slate-400">Please complete your profile to continue.</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">First Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="John"
                                value={formData.first_name}
                                onChange={e => setFormData({...formData, first_name: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Last Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="Doe"
                                value={formData.last_name}
                                onChange={e => setFormData({...formData, last_name: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-300">Select your role</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, role: 'BUYER'})}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                                    formData.role === 'BUYER'
                                        ? 'border-blue-500 bg-blue-500/10 text-white'
                                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                                }`}
                            >
                                <LayoutDashboard size={24} />
                                <span className="font-medium">Buyer</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({...formData, role: 'SUPPLIER'})}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                                    formData.role === 'SUPPLIER'
                                        ? 'border-emerald-500 bg-emerald-500/10 text-white'
                                        : 'border-slate-700 bg-slate-950 text-slate-400 hover:border-slate-600'
                                }`}
                            >
                                <Briefcase size={24} />
                                <span className="font-medium">Supplier</span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-8"
                    >
                        {isLoading ? 'Creating Profile...' : 'Complete Setup'}
                    </button>
                </form>
            </div>
        </div>
    );
};
