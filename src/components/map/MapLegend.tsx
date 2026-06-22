import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useNamespace } from '../../hooks/useNamespace';

export const MapLegend: React.FC = () => {
    const { t, ready } = useNamespace('dashboard');
    const [isHovered, setIsHovered] = useState(false);

    if (!ready) return null;

    return (
        <div
            className="absolute top-4 right-4 z-[20]"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Trigger icon */}
            <button
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 p-2 rounded-lg shadow-lg hover:text-emerald-500 transition-colors"
                aria-label={t('mapLegend.title')}
            >
                <HelpCircle size={20} />
            </button>

            {/* Hover panel — opens downward from the icon */}
            {isHovered && (
                <div className="absolute top-full right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-4 w-72 text-slate-700 dark:text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">{t('mapLegend.title')}</h4>

                    <div className="space-y-4">
                        {/* Port Circles */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Port — Order Volume & Spread</div>
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5 text-xs">
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-white dark:bg-slate-800"></div>
                                        <span className="text-slate-400 mx-0.5">&rarr;</span>
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-400 bg-white dark:bg-slate-800"></div>
                                    </div>
                                    <span>Size = open order volume</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs">
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-white dark:bg-slate-800"></div>
                                    <span>Tight spread (&lt;5%)</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs">
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 bg-white dark:bg-slate-800"></div>
                                    <span>Moderate spread (5–15%)</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs">
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-red-500 bg-white dark:bg-slate-800"></div>
                                    <span>Wide spread (&gt;15%)</span>
                                </div>
                            </div>
                        </div>

                        {/* Overlays */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">Overlays (Bottom)</div>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span>Avails — available volume by port</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded border border-slate-400 flex items-center justify-center text-[8px] font-bold text-slate-500">$</div>
                                    <span>{t('mapLegend.recentListings')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
