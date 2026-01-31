import React, { useState } from 'react';
import { UploadCloud, ScanLine, CheckCircle2 } from 'lucide-react';

export const ComplianceDataInput: React.FC = () => {
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-10 animate-in fade-in duration-300 flex flex-col items-center justify-center min-h-[500px]">
            {uploadStep === 'IDLE' && (
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-200">
                        <UploadCloud size={40} className="text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-[#334155] mb-2">Upload Bunker Delivery Note (BDN)</h2>
                    <p className="text-slate-500 mb-8">Drag and drop your PDF or Image file here. Our AI will automatically extract verification data.</p>
                    
                    <button 
                        onClick={handleSimulateUpload}
                        className="bg-[#334155] text-white px-8 py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-md"
                    >
                        Select File & Simulate Upload
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
                    <h3 className="text-lg font-bold text-[#334155]">Processing Document...</h3>
                    <p className="text-slate-500 text-sm mt-2">Running OCR extraction and compliance checks.</p>
                </div>
            )}

            {uploadStep === 'REVIEW' && (
                <div className="w-full max-w-2xl animate-in zoom-in duration-300">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-[#334155]">Verify Extracted Data</h3>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">High Confidence Match</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vessel Name</label>
                            <input type="text" value="Verdaxis Pioneer" className="w-full p-3 bg-slate-50 border border-slate-200 rounded font-bold text-[#334155]" readOnly />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bunkering Port</label>
                            <input type="text" value="Singapore" className="w-full p-3 bg-slate-50 border border-slate-200 rounded font-bold text-[#334155]" readOnly />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fuel Type</label>
                            <input type="text" value="Bio-Methanol (ISCC)" className="w-full p-3 bg-slate-50 border border-slate-200 rounded font-bold text-[#334155]" readOnly />
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantity (MT)</label>
                            <input type="text" value="500.00" className="w-full p-3 bg-slate-50 border border-slate-200 rounded font-bold text-[#334155]" readOnly />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-4">
                        <button onClick={() => setUploadStep('IDLE')} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-700">Cancel</button>
                        <button onClick={handleSubmitData} className="px-8 py-3 bg-[#4CAF50] text-white rounded-lg font-bold hover:bg-green-600 shadow-md flex items-center gap-2">
                            <CheckCircle2 size={18} /> Confirm & Submit
                        </button>
                    </div>
                </div>
            )}

            {uploadStep === 'SUCCESS' && (
                 <div className="text-center animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-[#334155] mb-2">Data Ingested Successfully</h2>
                    <p className="text-slate-500">Your compliance ledger has been updated. Verification ID: #BDN-2993</p>
                </div>
            )}
        </div>
    );
};