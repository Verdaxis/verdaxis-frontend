import React, { useState } from 'react';
import { X, Upload, CheckCircle2, AlertCircle, Loader2, FileText, Trash2 } from 'lucide-react';

interface CreateListingModalProps {
    onSubmit: (data: ListingFormData) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export interface ListingFormData {
    region: string;
    fuel_type: string;
    fuel_grade: string;
    quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: string;
    tier_label: string;
    certifications: string[];
}

const REGIONS = ['Singapore', 'ARA', 'Houston', 'Fujairah', 'Shanghai'];
const FUEL_TYPES = ['Methanol', 'Biofuel', 'LNG', 'Ammonia'];
const FUEL_GRADES = ['Conventional', 'Green', 'Bio'];
const AVAILABILITY_WINDOWS = ['Spot', 'Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Forward 2027', 'Forward 2028'];
const TIER_LABELS = ['Tier 1 Producer', 'Major Trader', 'Regional Supplier', 'Independent Supplier'];

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
    onSubmit,
    onCancel,
    isLoading = false,
}) => {
    const [formData, setFormData] = useState<ListingFormData>({
        region: REGIONS[0],
        fuel_type: FUEL_TYPES[0],
        fuel_grade: FUEL_GRADES[0],
        quantity_mt: 0,
        price_per_mt_usd: 0,
        availability_window: AVAILABILITY_WINDOWS[0],
        tier_label: TIER_LABELS[2],
        certifications: [],
    });

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
                                    {AVAILABILITY_WINDOWS.map(a => <option key={a} value={a}>{a}</option>)}
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

                        {/* Tier Label */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Supplier Tier (Shown to Buyers)</label>
                            <select
                                value={formData.tier_label}
                                onChange={(e) => handleChange('tier_label', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            >
                                {TIER_LABELS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">This label is shown to buyers instead of your company name</p>
                        </div>

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
