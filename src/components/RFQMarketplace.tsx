import React, { useState, useEffect } from 'react';
import { Search, Filter, Loader2, CheckCircle2, AlertCircle, Droplets, Leaf, Flame, Zap } from 'lucide-react';
import { PublicListing } from '../types';
import { ListingCard } from './rfq/ListingCard';
import { RFQConfirmModal } from './rfq/RFQConfirmModal';

import { api } from '../services/api';
import { useCopilotContext } from '../context/CopilotContext';

const REGIONS = ['All', 'Singapore', 'ARA', 'Houston', 'Fujairah', 'Shanghai'];
const FUEL_TYPES = ['All', 'Methanol', 'Biofuel', 'LNG', 'Ammonia'];

export const RFQMarketplace: React.FC = () => {
    const { setPageContext } = useCopilotContext();
    const [listings, setListings] = useState<PublicListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedRegion, setSelectedRegion] = useState('All');
    const [selectedFuelType, setSelectedFuelType] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Modal state
    const [selectedListing, setSelectedListing] = useState<PublicListing | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        fetchListings();
    }, [selectedRegion, selectedFuelType]);

    const fetchListings = async () => {
        setIsLoading(true);
        try {
            const filters: { region?: string; fuelType?: string } = {};
            if (selectedRegion !== 'All') filters.region = selectedRegion;
            if (selectedFuelType !== 'All') filters.fuelType = selectedFuelType;
            
            const data = await api.listings.list(filters);
            setListings(data);
             // Broadcast to Copilot
             setPageContext({
                view: 'RFQ Marketplace (Detailed)',
                filters: filters,
                listings: data.slice(0, 50), // Limit to avoid hitting token limits
                summary: `Showing ${data.length} detailed listings.`
            });
        } catch (error) {
            console.error('Failed to fetch listings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRequestQuote = (listingId: string) => {
        const listing = listings.find(l => l.id === listingId);
        if (listing) {
            setSelectedListing(listing);
        }
    };

    const handleConfirmRFQ = async () => {
        if (!selectedListing) return;
        
        setIsSubmitting(true);
        try {
            await api.rfq.request(selectedListing.id, true);
            setSuccessMessage(`RFQ sent successfully for ${selectedListing.fuel_type} in ${selectedListing.region}!`);
            setSelectedListing(null);
            
            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Failed to send RFQ:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredListings = listings.filter(listing => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
                listing.region.toLowerCase().includes(query) ||
                listing.fuel_type.toLowerCase().includes(query) ||
                listing.tier_label.toLowerCase().includes(query)
            );
        }
        return true;
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            Marketplace
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">
                            Browse available stems from verified suppliers. Request quotes directly.
                        </p>
                    </div>
                    
                    {/* Search */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search listings..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                    </div>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="mb-6 flex items-center gap-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 className="text-emerald-400" size={20} />
                        <span className="text-emerald-300">{successMessage}</span>
                    </div>
                )}

                {/* Filters */}
                <div className="flex flex-wrap gap-4 mb-6">
                    {/* Region Tabs */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs uppercase font-bold text-slate-500 mr-2">Region:</span>
                        {REGIONS.map(region => (
                            <button
                                key={region}
                                onClick={() => setSelectedRegion(region)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    selectedRegion === region
                                        ? 'bg-emerald-500 text-white dark:text-slate-900 shadow-md'
                                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-slate-200'
                                }`}
                            >
                                {region}
                            </button>
                        ))}
                    </div>

                    {/* Fuel Type Pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs uppercase font-bold text-slate-500 mr-2">Fuel:</span>
                        {FUEL_TYPES.map(fuel => (
                            <button
                                key={fuel}
                                onClick={() => setSelectedFuelType(fuel)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                    selectedFuelType === fuel
                                        ? 'bg-slate-800 dark:bg-slate-700 text-white dark:text-slate-100 border border-slate-600 dark:border-slate-500 shadow-sm'
                                        : 'bg-white dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-emerald-600 dark:hover:text-slate-200'
                                }`}
                            >
                                {fuel === 'Methanol' && <Droplets size={14} className="text-emerald-400" />}
                                {fuel === 'Biofuel' && <Leaf size={14} className="text-green-400" />}
                                {fuel === 'LNG' && <Flame size={14} className="text-blue-400" />}
                                {fuel === 'Ammonia' && <Zap size={14} className="text-purple-400" />}
                                {fuel}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Listings Grid */}
            <div className="max-w-7xl mx-auto">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="animate-spin text-emerald-500" size={40} />
                    </div>
                ) : filteredListings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <AlertCircle size={48} className="mb-4" />
                        <p className="text-lg">No listings found matching your criteria</p>
                        <button
                            onClick={() => {
                                setSelectedRegion('All');
                                setSelectedFuelType('All');
                                setSearchQuery('');
                            }}
                            className="mt-4 text-emerald-400 hover:underline"
                        >
                            Clear filters
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredListings.map(listing => (
                            <ListingCard
                                key={listing.id}
                                listing={listing}
                                onRequestQuote={handleRequestQuote}
                            />
                        ))}
                    </div>
                )}

                {/* Summary Stats */}
                <div className="mt-8 pt-8 border-t border-slate-800 flex flex-wrap gap-8 justify-center text-sm">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{filteredListings.length}</div>
                        <div className="text-slate-500">Active Listings</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-500 dark:text-emerald-400">
                            {filteredListings.reduce((sum, l) => sum + l.quantity_mt, 0).toLocaleString()} MT
                        </div>
                        <div className="text-slate-500">Total Volume</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">
                            {filteredListings.filter(l => l.is_verdaxis_verified).length}
                        </div>
                        <div className="text-slate-500">Verified Suppliers</div>
                    </div>
                </div>
            </div>

            {/* RFQ Confirmation Modal */}
            {selectedListing && (
                <RFQConfirmModal
                    listing={selectedListing}
                    onConfirm={handleConfirmRFQ}
                    onCancel={() => setSelectedListing(null)}
                    isLoading={isSubmitting}
                />
            )}

            {/* AI Insight Panel */}

        </div>
    );
};
