import React from 'react';
import { CheckCircle2, ShieldCheck, Gauge, MessageSquare } from 'lucide-react';
import { Supplier } from '../../types';
import { Tooltip } from '../ui/Tooltip';

interface SupplierCardProps {
    supplier: Supplier;
    index: number;
    onRequestQuote: (supplier: Supplier) => void;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, index, onRequestQuote }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 lg:p-6 flex flex-col lg:flex-row items-center justify-between hover:shadow-md transition-shadow relative overflow-hidden gap-6">
            {(index === 0 && supplier.isVerdaxisCertified) && (
                <div className="absolute top-0 left-0 bg-[#4CAF50] text-white text-xs font-bold px-3 py-1 rounded-br-lg z-10 flex items-center space-x-1">
                    <ShieldCheck size={12} />
                    <span>VERDAXIS CHOICE</span>
                </div>
            )}
            
            {/* Supplier Info */}
            <div className="flex items-center space-x-4 w-full lg:w-auto">
                <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-bold text-xl shrink-0">
                    {supplier.name.charAt(0)}
                </div>
                <div>
                    <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-lg text-[#334155]">{supplier.name}</h3>
                        {supplier.isVerdaxisCertified && <CheckCircle2 size={16} className="text-[#5DADE2]" fill="#5DADE2" color="white" />}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 mt-1">
                        <span className="flex items-center text-amber-500 font-bold">
                            ★ {supplier.rating}
                        </span>
                        <span>•</span>
                        <span>{supplier.availableStock} MT Available</span>
                        <span>•</span>
                        <span className="text-green-600 font-medium">ISCC Certified</span>
                    </div>
                </div>
            </div>

            {/* Risk & Compliance Section */}
            {supplier.riskProfile && (
                <div className="flex items-center space-x-4 w-full lg:w-auto border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 pl-0 lg:pl-8">
                    <Tooltip content="Financial Credit Score (0-100)">
                        <div className="flex flex-col items-center">
                            <div className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
                                <Gauge size={12} /> Credit
                            </div>
                            <div className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold text-xs 
                                ${supplier.riskProfile.creditScore > 85 ? 'border-green-500 text-green-600' : 'border-amber-500 text-amber-600'}`}>
                                {supplier.riskProfile.creditScore}
                            </div>
                        </div>
                    </Tooltip>
                    <div className="flex flex-col space-y-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1
                            ${supplier.riskProfile.kybStatus === 'Verified' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            <ShieldCheck size={10} /> {supplier.riskProfile.kybStatus === 'Verified' ? 'KYB Verified' : 'KYB Pending'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-50 text-slate-600 border-slate-200">
                            {supplier.riskProfile.paymentTerms}
                        </span>
                    </div>
                </div>
            )}

            {/* Price & Actions */}
            <div className="flex flex-row-reverse lg:flex-row items-center justify-between w-full lg:w-auto lg:space-x-4 pt-4 lg:pt-0 border-t lg:border-0 border-slate-100">
                <div className="text-right mr-0 lg:mr-2">
                    <div className="text-xs text-slate-400 uppercase font-bold">Est. Price</div>
                    <div className="text-xl font-bold text-[#334155]">${index === 0 ? '520' : index === 1 ? '535' : '510'}<span className="text-sm text-slate-400 font-normal">/mt</span></div>
                </div>
                <div className="flex items-center space-x-2">
                    <Tooltip content="Start Negotiation (Chat)">
                        <button className="p-2.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-[#5DADE2] transition-colors">
                            <MessageSquare size={20} />
                        </button>
                    </Tooltip>
                    <button 
                        onClick={() => onRequestQuote(supplier)}
                        className="bg-[#5DADE2] hover:bg-[#4FA3D9] text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm whitespace-nowrap"
                    >
                        Request Quote
                    </button>
                </div>
            </div>
        </div>
    );
};