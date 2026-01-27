import React from 'react';
import { CheckCircle2, ScanLine, FileCheck } from 'lucide-react';
import { TRACE_EVENTS } from '../../data';

export const ComplianceTracing: React.FC = () => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 lg:p-10 animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-xl font-['Montserrat'] font-bold text-[#334155]">End-to-End Traceability</h2>
                    <p className="text-sm text-slate-500">Chain of Custody for Voyage #SG-RTM-299</p>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                    <CheckCircle2 size={14} /> Verified Green
                </div>
            </div>

            <div className="relative border-l-2 border-slate-200 ml-3 space-y-10 pb-4">
                {TRACE_EVENTS.map((event, idx) => (
                    <div key={event.id} className="relative pl-8 group">
                        {/* Dot */}
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${event.stage === 'Bunkering' ? 'bg-[#5DADE2]' : 'bg-slate-300 group-hover:bg-[#5DADE2] transition-colors'}`}></div>
                        
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start bg-slate-50 p-4 rounded-lg border border-slate-100 group-hover:border-[#5DADE2] transition-colors">
                            <div className="flex-1">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-1">{event.stage}</div>
                                <h3 className="font-bold text-[#334155] text-lg mb-1">{event.description}</h3>
                                <div className="text-sm text-slate-500 flex items-center gap-2">
                                    <span>{event.location}</span>
                                    <span>•</span>
                                    <span className="font-mono">{event.timestamp}</span>
                                </div>
                            </div>

                            {/* Verification Badge */}
                            <div className="mt-3 sm:mt-0 flex flex-col items-end">
                                <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold border ${event.verificationType === 'Physical Tracer' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-white text-slate-600 border-slate-200'}`}>
                                    {event.verificationType === 'Physical Tracer' ? <ScanLine size={12} className="mr-1" /> : <FileCheck size={12} className="mr-1" />}
                                    {event.verificationId}
                                </div>
                                {event.verificationType === 'Physical Tracer' && (
                                    <span className="text-[10px] text-indigo-500 font-bold mt-1">Nanolumi Verified</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};