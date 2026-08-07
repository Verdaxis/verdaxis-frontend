import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../services/config';
import { useNamespace } from '../hooks/useNamespace';
import { localizedAuthError } from './authApiError';

type SubmitState = 'idle' | 'submitting' | 'approved' | 'rejected' | 'error';

const KycPage: React.FC = () => {
  const { token } = useAuth();
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [companyDocFile, setCompanyDocFile] = useState<File | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [rejectionMessage, setRejectionMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { t, ready } = useNamespace('auth');

  if (!ready) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passportFile || !companyDocFile) {
      setErrorMessage(t('kyc.error.missingDocuments'));
      return;
    }

    setErrorMessage('');
    setSubmitState('submitting');

    try {
      const formData = new FormData();
      formData.append('passport', passportFile);
      formData.append('company_doc', companyDocFile);

      const res = await fetch(`${API_URL}/kyc/submit`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.kyc_status === 'APPROVED') {
          setSubmitState('approved');
        } else if (data.kyc_status === 'REJECTED') {
          if (data.message) console.error('[auth] KYC rejected', data.message);
          setRejectionMessage(document.documentElement.lang.startsWith('zh')
            ? t('kyc.rejected.defaultMessage')
            : data.message || t('kyc.rejected.defaultMessage'));
          setSubmitState('rejected');
        } else {
          // PENDING or any other status — treat as pending confirmation
          setSubmitState('approved');
        }
      } else {
        const errData = await res.json().catch(() => null);
        setErrorMessage(localizedAuthError(errData, t, 'kyc.error.failed', 'KYC submission failed'));
        setSubmitState('error');
      }
    } catch (error) {
      console.error('[auth] KYC network error', error);
      setErrorMessage(t('kyc.error.connectionFailed'));
      setSubmitState('error');
    }
  };

  const handleReset = () => {
    setPassportFile(null);
    setCompanyDocFile(null);
    setSubmitState('idle');
    setRejectionMessage('');
    setErrorMessage('');
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
          <p className="text-slate-400">{t('kyc.subtitle')}</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {/* Approved State */}
          {submitState === 'approved' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('kyc.approved.title')}</h2>
              <p className="text-slate-400">
                {t('kyc.approved.message')}
              </p>
              <div className="pt-2">
                <Link
                  to="/app"
                  className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 py-2.5 rounded-lg transition-all"
                >
                  {t('kyc.approved.enterPlatform')}
                </Link>
              </div>
            </div>
          )}

          {/* Rejected State */}
          {submitState === 'rejected' && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle size={36} className="text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t('kyc.rejected.title')}</h2>
              <p className="text-slate-400">{rejectionMessage}</p>
              <div className="pt-2">
                <button
                  onClick={handleReset}
                  className="inline-block bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold px-6 py-2.5 rounded-lg transition-all"
                >
                  {t('kyc.rejected.tryAgain')}
                </button>
              </div>
            </div>
          )}

          {/* Submitting State */}
          {submitState === 'submitting' && (
            <div className="text-center space-y-4 py-8">
              <Loader2 size={48} className="animate-spin text-emerald-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white">{t('kyc.submitting.title')}</h2>
              <p className="text-slate-400">{t('kyc.submitting.message')}</p>
            </div>
          )}

          {/* Idle / Error State — show the form */}
          {(submitState === 'idle' || submitState === 'error') && (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-1">{t('kyc.formTitle')}</h2>
                <p className="text-slate-400 text-sm">
                  {t('kyc.formDescription')}
                </p>
              </div>

              {(submitState === 'error' || errorMessage) && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3 text-red-400">
                  <AlertCircle size={20} className="shrink-0" />
                  <span className="text-sm">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Passport / Government ID */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">
                    {t('kyc.passportLabel')}
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                    {passportFile ? (
                      <div className="flex items-center gap-2 text-emerald-400 px-4">
                        <FileText size={20} />
                        <span className="text-sm truncate max-w-[280px]">{passportFile.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Upload size={24} />
                        <span className="text-sm">{t('kyc.passportUpload')}</span>
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => setPassportFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                {/* Company Registration Document */}
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1.5">
                    {t('kyc.companyDocLabel')}
                  </label>
                  <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-700 rounded-lg cursor-pointer bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                    {companyDocFile ? (
                      <div className="flex items-center gap-2 text-emerald-400 px-4">
                        <FileText size={20} />
                        <span className="text-sm truncate max-w-[280px]">{companyDocFile.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500">
                        <Upload size={24} />
                        <span className="text-sm">{t('kyc.companyDocUpload')}</span>
                      </div>
                    )}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) => setCompanyDocFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!passportFile || !companyDocFile}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {t('kyc.submit')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KycPage;
