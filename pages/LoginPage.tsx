import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white overflow-hidden relative">
      {/* Background Ambients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="bg-slate-900/50 backdrop-blur-xl p-12 rounded-2xl shadow-2xl w-[480px] border border-slate-800 flex flex-col items-center relative z-10">
        <div className="bg-emerald-500/20 p-4 rounded-full mb-6">
            <ShieldCheck className="w-12 h-12 text-emerald-400" />
        </div>
        
        <h2 className="text-3xl font-bold mb-2 text-center text-white tracking-tight">Welcome to Verdaxis</h2>
        <p className="text-slate-400 mb-10 text-center text-lg">Intelligence Cockpit & Trading Terminal</p>
        
        <button
          onClick={loginWithRedirect}
          className="w-full group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-3"
        >
          <span>Log In / Sign Up</span>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        <p className="mt-8 text-xs text-slate-500 text-center">
          Supports Email, Google, and Enterprise SSO
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
