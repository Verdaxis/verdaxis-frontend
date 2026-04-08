import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, FileText, Trash2, BarChart3 } from 'lucide-react';
import type { AggregatedMarketEntry } from '../SupplierListingConsole';
import { SPOT_WINDOW, getAvailabilityWindowOptions } from '../../utils/availabilityWindow';

interface CreateListingModalProps {
    onSubmit: (data: ListingFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
    marketData?: AggregatedMarketEntry[];
}

export interface ListingFormData {
    region: string;
    fuel_type: string;
    fuel_grade: string;
    quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: string;
    certifications: string[];
}

const REGIONS = ['Singapore', 'ARA', 'Houston', 'Fujairah', 'Shanghai'];
const FUEL_TYPES = ['Methanol', 'Ethanol', 'Biofuel', 'Ammonia', 'Biomethane'];
const FUEL_GRADES = ['Conventional', 'Green', 'Bio'];

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
    onSubmit,
    onCancel,
    isLoading = false,
    marketData = [],
}) => {
    const [formData, setFormData] = useState<ListingFormData>({
        region: REGIONS[0],
        fuel_type: FUEL_TYPES[0],
        fuel_grade: FUEL_GRADES[0],
        quantity_mt: 0,
        price_per_mt_usd: 0,
        availability_window: SPOT_WINDOW,
        certifications: [],
    });
    const availabilityOptions = getAvailabilityWindowOptions();

    const [uploadedFiles, setUploadedFiles] = useState<{name: string; type: string}[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const handleChange = (field: keyof ListingFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const files: File[] = Array.from(e.dataTransfer.files);
        const validFiles = files.filter((f: File) => 
            f.type === 'application/pdf' || f.type.startsWith('image/')
        );
        
        const newFiles = validFiles.map((f: File) => ({ name: f.name, type: f.type }));
        setUploadedFiles(prev => [...prev, ...newFiles]);
        
        // Add certification names based on file names
        const certNames = validFiles.map((f: File) => {
            if (f.name.toLowerCase().includes('iscc')) return 'ISCC';
            if (f.name.toLowerCase().includes('nanolumi')) return 'Nanolumi';
            if (f.name.toLowerCase().includes('sustainab')) return 'ProofOfSustainability';
            return f.name.split('.')[0];
        });
        
        setFormData(prev => ({
            ...prev,
            certifications: [...new Set([...prev.certifications, ...certNames])]
        }));
    };

    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.quantity_mt <= 0 || formData.price_per_mt_usd <= 0) return;
        onSubmit(formData);
    };

    // Find matching market data for selected region + fuel type
    const marketEntry = marketData.find(
        (d) => d.region === formData.region && d.fuel_type === formData.fuel_type
    );

    const renderMarketContext = () => {
        if (!marketEntry) {
            return (
                <div className="rounded-lg border border-slate-200 dark:border-slate-600/50 bg-slate-50 dark:bg-slate-700/30 p-3">
                    <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <BarChart3 size={14} />
                        <span>No market data available for this combination</span>
                    </div>
                </div>
            );
        }

        const { min_price, max_price, avg_price, total_quantity, listing_count } = marketEntry;
        const range = max_price - min_price;
        const price = formData.price_per_mt_usd;

        // Competitiveness indicator
        let competitiveLabel = '';
        let competitiveColor = '';

        if (price > 0 && avg_price > 0) {
            const pctDiff = ((price - avg_price) / avg_price) * 100;
            if (pctDiff <= -3) {
                competitiveLabel = `Your price is ${Math.abs(pctDiff).toFixed(1)}% below market average`;
                competitiveColor = 'text-emerald-600 dark:text-emerald-400';
            } else if (pctDiff <= 3) {
                competitiveLabel = 'Your price is competitive';
                competitiveColor = 'text-emerald-600 dark:text-emerald-400';
            } else if (pctDiff <= 10) {
                competitiveLabel = `Your price is ${pctDiff.toFixed(1)}% above market average`;
                competitiveColor = 'text-amber-600 dark:text-amber-400';
            } else {
                competitiveLabel = `Your price is ${pctDiff.toFixed(1)}% above market average`;
                competitiveColor = 'text-rose-600 dark:text-rose-400';
            }
        }

        // Position of price marker on the range bar (clamped 0-100%)
        const markerPct = price > 0 && range > 0
            ? Math.min(100, Math.max(0, ((price - min_price) / range) * 100))
            : -1;

        return (
            <div className="rounded-lg border border-slate-200 dark:border-slate-600/50 bg-slate-50 dark:bg-emerald-900/20 p-3 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                    <BarChart3 size={14} className="text-emerald-500 dark:text-emerald-400" />
                    Market Context
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Price range:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                            ${min_price.toLocaleString()} - ${max_price.toLocaleString()} /MT
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Avg price:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                            ${avg_price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} /MT
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Active listings:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {listing_count} listing{listing_count !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Total available:</span>
                        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
                            {total_quantity.toLocaleString()} MT
                        </span>
                    </div>
                </div>

                {/* Price position bar */}
                {price > 0 && range > 0 && (
                    <div className="pt-1">
                        <div className="relative h-2 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-400 dark:from-emerald-500 dark:via-amber-500 dark:to-rose-500 overflow-visible">
                            {markerPct >= 0 && (
                                <div
                                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-800 shadow-md"
                                    style={{
                                        left: `${markerPct}%`,
                                        backgroundColor: markerPct <= 40 ? '#10b981' : markerPct <= 70 ? '#f59e0b' : '#f43f5e',
                                    }}
                                />
                            )}
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
                            <span>${min_price}</span>
                            <span>${max_price}</span>
                        </div>
                    </div>
                )}

                {/* Competitiveness label */}
                {price > 0 && competitiveLabel && (
                    <div className={`text-xs font-semibold ${competitiveColor}`}>
                        {competitiveLabel}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-shrink-0 bg-slate-50 dark:bg-slate-800">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">Create New Listing</h2>
                    <button 
                        onClick={onCancel}
                        className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
                    <div className="p-6 space-y-6">
                        {/* Location & Fuel */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Region</label>
                                <select
                                    value={formData.region}
                                    onChange={(e) => handleChange('region', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                >
                                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Fuel Type</label>
                                <select
                                    value={formData.fuel_type}
                                    onChange={(e) => handleChange('fuel_type', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                >
                                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Fuel Grade</label>
                                <select
                                    value={formData.fuel_grade}
                                    onChange={(e) => handleChange('fuel_grade', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                >
                                    {FUEL_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Availability</label>
                                <select
                                    value={formData.availability_window}
                                    onChange={(e) => handleChange('availability_window', e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                >
                                    {availabilityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Quantity & Price */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Quantity (MT)</label>
                                <input
                                    type="number"
                                    value={formData.quantity_mt || ''}
                                    onChange={(e) => handleChange('quantity_mt', parseFloat(e.target.value) || 0)}
                                    placeholder="e.g., 5000"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Price ($/MT)</label>
                                <input
                                    type="number"
                                    value={formData.price_per_mt_usd || ''}
                                    onChange={(e) => handleChange('price_per_mt_usd', parseFloat(e.target.value) || 0)}
                                    placeholder="e.g., 520"
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Price Benchmarking */}
                        {renderMarketContext()}

                        {/* Certification Upload */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Certifications</label>
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                                    isDragging 
                                        ? 'border-emerald-500 bg-emerald-500/10' 
                                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                                }`}
                            >
                                <Upload className="mx-auto text-slate-400 dark:text-slate-500 mb-2" size={32} />
                                <p className="text-slate-600 dark:text-slate-400 text-sm">
                                    Drag & drop certificates here
                                </p>
                                <p className="text-slate-500 text-xs mt-1">
                                    PDF, PNG, or JPG (ISCC, Proof of Sustainability, Nanolumi)
                                </p>
                            </div>

                            {/* Uploaded Files */}
                            {uploadedFiles.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {uploadedFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-100 dark:bg-slate-900/50 rounded-lg px-4 py-2 border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <FileText size={16} className="text-emerald-500 dark:text-emerald-400" />
                                                <span className="text-sm text-slate-700 dark:text-slate-300">{file.name}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(idx)}
                                                className="text-slate-500 hover:text-red-500 dark:hover:text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Certification Badges */}
                            {formData.certifications.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {formData.certifications.map((cert, idx) => (
                                        <span key={idx} className="flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-full text-xs text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle2 size={12} />
                                            {cert}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex gap-3 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-3 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={formData.quantity_mt <= 0 || formData.price_per_mt_usd <= 0 || isLoading}
                            className={`flex-1 py-3 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                formData.quantity_mt > 0 && formData.price_per_mt_usd > 0 && !isLoading
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-900'
                                    : 'bg-slate-200 dark:bg-slate-600 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-transparent'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin" size={18} />
                                    Publishing...
                                </>
                            ) : (
                                'Publish Listing'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
