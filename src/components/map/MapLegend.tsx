import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { useNamespace } from '../../hooks/useNamespace';

export const MapLegend: React.FC = () => {
    const { t, ready } = useNamespace('dashboard');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const closeOutside = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        };
        document.addEventListener('mousedown', closeOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('mousedown', closeOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [isOpen]);

    if (!ready) return null;

    return (
        <div
            ref={containerRef}
            className="static"
        >
            {/* Trigger icon */}
            <button
                ref={buttonRef}
                type="button"
                aria-expanded={isOpen}
                aria-controls="map-legend-content"
                onClick={() => setIsOpen(current => !current)}
                className="flex min-h-11 items-center gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 p-2 rounded-lg shadow-lg hover:text-emerald-500 transition-colors"
                aria-label={t('mapLegend.title')}
            >
                <HelpCircle size={16} />
                <span className="text-xs font-semibold">{t('mapLegend.button')}</span>
            </button>

            {/* Align the disclosure with the control row so it fits beside the insights panel. */}
            {isOpen && (
                <div id="map-legend-content" className="absolute top-full left-0 mt-2 max-h-[50vh] overflow-y-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-4 w-72 max-w-full text-slate-700 dark:text-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">{t('mapLegend.title')}</h4>

                    <div className="space-y-4">
                        {/* Port Circles */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{t('mapLegend.portVolumeSpread')}</div>
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5 text-xs">
                                    <div className="flex items-center gap-1">
                                        <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-white dark:bg-slate-800"></div>
                                        <span className="text-slate-400 mx-0.5">&rarr;</span>
                                        <div className="w-5 h-5 rounded-full border-2 border-slate-400 bg-white dark:bg-slate-800"></div>
                                    </div>
                                    <span>{t('mapLegend.sizeOpenVolume')}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs">
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-white dark:bg-slate-800"></div>
                                    <span>{t('mapLegend.tightSpread')}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs">
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-500 bg-white dark:bg-slate-800"></div>
                                    <span>{t('mapLegend.moderateSpread')}</span>
                                </div>
                                <div className="flex items-center gap-2.5 text-xs">
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-red-500 bg-white dark:bg-slate-800"></div>
                                    <span>{t('mapLegend.wideSpread')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Overlays */}
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">{t('mapLegend.referenceOverlays')}</div>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-5 rounded border border-sky-600 bg-sky-300/25"></div>
                                    <span>{t('mapLegend.activeEca')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-5 rounded border border-amber-600 bg-amber-300/20"></div>
                                    <span>{t('mapLegend.phaseInEca')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-5 rounded border border-violet-600 bg-violet-300/10"></div>
                                    <span>{t('mapLegend.futureEca')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span>{t('mapLegend.avails')}</span>
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
