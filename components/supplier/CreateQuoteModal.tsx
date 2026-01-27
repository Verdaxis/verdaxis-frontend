import React from 'react';
import { ArrowRight, X } from 'lucide-react';

interface CreateQuoteModalProps {
    requestId: string;
    onClose: () => void;
    onSubmit: () => void;
}

export const CreateQuoteModal: React.FC<CreateQuoteModalProps> = ({ requestId, onClose, onSubmit }) => {
    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="text-xl font-['Montserrat'] font-bold text-[#334155]">Create Quote: {requestId}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-6 space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="text-slate-500">Buyer:</div>
                            <div className="font-bold text-[#334155]">Global Shipping Co.</div>
                            <div className="text-slate-500">Product:</div>
                            <div className="font-bold text-[#334155]">Methanol (500 MT)</div>
                            <div className="text-slate-500">Delivery:</div>
                            <div className="font-bold text-[#334155]">Nov 15, 2023</div>
                        </div>
                        </div>

                        <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price per MT ($)</label>
                        <input type="number" className="w-full p-3 border border-slate-200 rounded-lg bg-white font-bold text-[#334155]" defaultValue={520} />
                        </div>

                        <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Validity</label>
                        <select className="w-full p-3 border border-slate-200 rounded-lg bg-white font-medium">
                            <option>24 Hours</option>
                            <option>48 Hours</option>
                            <option>7 Days</option>
                        </select>
                        </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3 rounded-b-2xl">
                        <button 
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 font-bold hover:text-slate-800 text-sm"
                    >
                        Cancel
                    </button>
                        <button 
                        onClick={onSubmit}
                        className="px-6 py-2 bg-[#334155] hover:bg-slate-800 text-white font-bold rounded-lg shadow-sm flex items-center space-x-2 text-sm"
                    >
                        <span>Send Quote</span>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};