import React, { useState } from 'react';
import { UploadCloud, ScanLine, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const ComplianceDataInput: React.FC = () => {
    const { t } = useTranslation('compliance');
    const [uploadStep, setUploadStep] = useState<'IDLE' | 'SCANNING' | 'REVIEW' | 'SUCCESS'>('IDLE');

    const handleSimulateUpload = () => {
        setUploadStep('SCANNING');
        setTimeout(() => setUploadStep('REVIEW'), 2000); // Simulate OCR
    };

    const handleSubmitData = () => {
        setUploadStep('SUCCESS');
        setTimeout(() => setUploadStep('IDLE'), 3000);
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 lg:p-10 animate-in fade-in duration-300 flex flex-col items-center justify-center min-h-[500px]">
            {uploadStep === 'IDLE' && (
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200 dark:border-slate-700">
                        <UploadCloud size={40} className="text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-[#334155] dark:text-white mb-2">{t('upload.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">{t('upload.description')}</p>
                    
                    <button 
                        onClick={handleSimulateUpload}
                        className="bg-[#334155] text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-md"
                    >
                        {t('upload.select')}
                    </button>
                </div>
            )}

            {uploadStep === 'SCANNING' && (
                <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-[#5DADE2] rounded-full animate-spin"></div>
                        <ScanLine size={32} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#5DADE2]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#334155] dark:text-white">{t('upload.processing')}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">{t('upload.processingDescription')}</p>
                </div>
            )}

            {uploadStep === 'REVIEW' && (
                <div className="w-full max-w-2xl animate-in zoom-in duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-[#334155] dark:text-white">{t('upload.review')}</h3>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">{t('upload.confidence')}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('upload.vessel')}</label>
                            <input type="text" value="Verdaxis Pioneer" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-bold text-[#334155] dark:text-slate-200" readOnly />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('upload.port')}</label>
                            <input type="text" value="Singapore" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-bold text-[#334155] dark:text-slate-200" readOnly />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('upload.fuel')}</label>
                            <input type="text" value="Bio-Methanol (ISCC)" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-bold text-[#334155] dark:text-slate-200" readOnly />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">{t('upload.quantity')}</label>
                            <input type="text" value="500.00" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded font-bold text-[#334155] dark:text-slate-200" readOnly />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button onClick={() => setUploadStep('IDLE')} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-200">{t('upload.cancel')}</button>
                        <button onClick={handleSubmitData} className="px-8 py-3 bg-[#4CAF50] text-white rounded-lg font-bold hover:bg-green-600 shadow-md flex items-center gap-2">
                            <CheckCircle2 size={18} /> {t('upload.confirm')}
                        </button>
                    </div>
                </div>
            )}

            {uploadStep === 'SUCCESS' && (
                 <div className="text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#334155] dark:text-white mb-2">{t('upload.success')}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{t('upload.successDescription')}</p>
                </div>
            )}
        </div>
    );
};
