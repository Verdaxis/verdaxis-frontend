import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, FileText, ExternalLink, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Supplier, Course } from '../../types';
import { COURSES } from '../../data';

interface DirectOrderModalProps {
    supplier: Supplier;
    onClose: () => void;
}

export const DirectOrderModal: React.FC<DirectOrderModalProps> = ({ supplier, onClose }) => {
    const [quoteStep, setQuoteStep] = useState<'FORM' | 'CONFIRMING' | 'SUCCESS'>('FORM');

    const handleConfirmQuote = () => {
        setQuoteStep('CONFIRMING');
        setTimeout(() => {
            setQuoteStep('SUCCESS');
        }, 1500);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800 transition-colors duration-200">
                {quoteStep === 'FORM' && (
                    <>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155] dark:text-slate-100">Request Direct Order</h3>
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                        </div>
                        <div className="p-6 space-y-6">
                            {/* Compliance Check */}
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl p-4 flex items-start space-x-3">
                                <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-full text-green-600 dark:text-green-400 mt-1">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-green-800 dark:text-green-300">Pre-Trade Compliance Check Passed</h4>
                                    <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                                        This supplier meets your company's sustainability thresholds. ISCC certification is on file. 
                                        Transaction will generate approx. 120 FuelEU credits.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Vessel</label>
                                    <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200">
                                        <option>Verdaxis Pioneer (IMO 9812345)</option>
                                        <option>Green Horizon (IMO 9834567)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Quantity (MT)</label>
                                    <input type="number" defaultValue={500} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-700 dark:text-slate-200" />
                                </div>
                            </div>

                            {/* Training Recommendation */}
                            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-200 font-bold">
                                        <AlertTriangle size={16} className="text-amber-500" />
                                        <span>Training Gap Detected</span>
                                    </div>
                                    <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded font-bold">Optional</span>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                                    3 crew members on <span className="font-semibold text-slate-800 dark:text-slate-200">Verdaxis Pioneer</span> lack Methanol Safety L2 certification required for this bunker operation.
                                </p>
                                <div className="flex items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <FileText size={20} className="text-slate-400 mr-3" />
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-[#334155] dark:text-slate-200">{COURSES[0].title}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400">{COURSES[0].duration} • Online Module</div>
                                    </div>
                                    <button className="text-xs font-bold text-[#5DADE2] hover:underline flex items-center whitespace-nowrap">
                                        Add to Order <ExternalLink size={10} className="ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex justify-end space-x-3 rounded-b-2xl">
                            <button 
                                onClick={onClose}
                                className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-slate-200"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmQuote}
                                className="px-6 py-2.5 bg-[#334155] dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold rounded-lg shadow-lg flex items-center space-x-2"
                            >
                                <span>Confirm Order</span>
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </>
                )}

                {quoteStep === 'CONFIRMING' && (
                    <div className="p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                        <div className="w-16 h-16 border-4 border-[#5DADE2] border-t-transparent rounded-full animate-spin mb-6"></div>
                        <h3 className="text-xl font-bold text-[#334155] dark:text-slate-100">Securing Connection...</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Encryption handshake with supplier node.</p>
                    </div>
                )}

                {quoteStep === 'SUCCESS' && (
                    <div className="p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-in zoom-in duration-300">
                            <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-2xl font-['Montserrat'] font-bold text-[#334155] dark:text-slate-100 mb-2">Request Sent!</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-8">
                            Request #DO-2939 has been securely transmitted to {supplier.name}. Expect a response within 4 hours.
                        </p>
                        <div className="flex space-x-4">
                            <button 
                                onClick={onClose}
                                className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                                Close
                            </button>
                            <button className="px-6 py-2.5 bg-[#5DADE2] text-white rounded-lg font-bold hover:bg-[#4FA3D9] shadow-md">
                                Track Status
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};