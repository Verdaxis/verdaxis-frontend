import React from 'react';
import { Shield, CheckCircle2, Leaf, Droplets, Flame, Zap } from 'lucide-react';
import { PublicListing } from '../../types';

interface ListingCardProps {
    listing: PublicListing;
    onRequestQuote: (listingId: string) => void;
}

const getFuelIcon = (fuelType: string) => {
    switch (fuelType) {
        case 'Methanol': return <Droplets className="text-emerald-500" size={20} />;
        case 'Biofuel': return <Leaf className="text-green-500" size={20} />;
        case 'LNG': return <Flame className="text-blue-400" size={20} />;
        case 'Ammonia': return <Zap className="text-purple-400" size={20} />;
        default: return <Droplets className="text-slate-400" size={20} />;
    }
};

const getGradeColor = (grade: string) => {
    switch (grade) {
        case 'Green': return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30';
        case 'Bio': return 'bg-green-50 text-green-600 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30';
        default: return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30';
    }
};

const getTierColor = (tier: string) => {
    switch (tier) {
        case 'TIER_1_PRODUCER': return 'text-amber-400';
        case 'MAJOR_TRADER': return 'text-blue-400';
        case 'REGIONAL_SUPPLIER': return 'text-slate-400';
        default: return 'text-slate-500';
    }
};

const getTierDisplay = (tier: string) => {
    switch (tier) {
        case 'TIER_1_PRODUCER': return 'Tier 1 Producer';
        case 'MAJOR_TRADER': return 'Major Trader';
        case 'REGIONAL_SUPPLIER': return 'Regional Supplier';
        case 'INDEPENDENT': return 'Independent Supplier';
        default: return tier;
    }
};

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onRequestQuote }) => {
    return (
        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-xl p-5 hover:border-emerald-500/50 hover:shadow-md dark:hover:shadow-none transition-all group">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        {getFuelIcon(listing.fuel_type)}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg">
                            {listing.fuel_type} - {listing.region}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                            {listing.availability_window}
                        </p>
                    </div>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getGradeColor(listing.fuel_grade)}`}>
                    {listing.fuel_grade}
                </span>
            </div>

            {/* Anonymized Supplier Info */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <Shield size={16} className={getTierColor(listing.tier_label)} />
                <span className={`font-medium ${getTierColor(listing.tier_label)}`}>
                    {getTierDisplay(listing.tier_label)}
                </span>
                {listing.is_verdaxis_verified && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 ml-auto">
                        <CheckCircle2 size={12} />
                        Verdaxis Verified
                    </span>
                )}
            </div>

            {/* Quantity & Price */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Quantity</div>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-200">
                        {listing.quantity_mt.toLocaleString()} <span className="text-sm text-slate-400">MT</span>
                    </div>
                </div>
                <div>
                    <div className="text-xs text-slate-500 uppercase font-bold mb-1">Price</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        ${listing.price_per_mt_usd} <span className="text-sm text-slate-400">/MT</span>
                    </div>
                </div>
            </div>

            {/* Certifications */}
            {listing.certifications.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {listing.certifications.map((cert, idx) => (
                        <span 
                            key={idx}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-600 dark:text-slate-300"
                        >
                            ✓ {cert}
                        </span>
                    ))}
                </div>
            )}

            {/* CTA Button */}
            <button
                onClick={() => onRequestQuote(listing.id)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white dark:text-slate-900 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:shadow-lg group-hover:shadow-emerald-500/20"
            >
                Request Quote
            </button>
        </div>
    );
};
