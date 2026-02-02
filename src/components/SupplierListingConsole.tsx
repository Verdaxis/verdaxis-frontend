import React, { useState, useEffect } from 'react';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    AlertTriangle, 
    CheckCircle2, 
    Eye, 
    EyeOff,
    Loader2,
    TrendingUp,
    Package,
    FileText,
    Shield
} from 'lucide-react';
import { CreateListingModal, ListingFormData } from './supplier/CreateListingModal';
import { api } from '../services/api';

interface SupplierListing {
    id: string;
    region: string;
    fuel_type: string;
    fuel_grade: string;
    quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: string;
    tier_label: string;
    certifications: string[];
    is_verdaxis_verified: boolean;
    status: 'ACTIVE' | 'INACTIVE';
    match_count: number;
    created_at: string;
}

// Mock data
const INITIAL_LISTINGS: SupplierListing[] = [
    {
        id: 'lst-001',
        region: 'Singapore',
        fuel_type: 'Methanol',
        fuel_grade: 'Green',
        quantity_mt: 5000,
        price_per_mt_usd: 520,
        availability_window: 'Spot',
        tier_label: 'Tier 1 Producer',
        certifications: ['ISCC', 'Nanolumi'],
        is_verdaxis_verified: true,
        status: 'ACTIVE',
        match_count: 3,
        created_at: '2026-01-15T10:00:00Z',
    },
    {
        id: 'lst-002',
        region: 'ARA',
        fuel_type: 'Methanol',
        fuel_grade: 'Conventional',
        quantity_mt: 3000,
        price_per_mt_usd: 485,
        availability_window: 'Q1 2026',
        tier_label: 'Major Trader',
        certifications: ['ISCC'],
        is_verdaxis_verified: true,
        status: 'ACTIVE',
        match_count: 1,
        created_at: '2026-01-20T14:30:00Z',
    },
];

export const SupplierListingConsole: React.FC = () => {
    const [listings, setListings] = useState<SupplierListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Listings
    useEffect(() => {
        fetchListings();
    }, []);

    const fetchListings = async () => {
        try {
            setIsLoading(true);
            const data = await api.listings.getMyListings();
            setListings(data);
        } catch (error) {
            console.error("Failed to fetch listings:", error);
            // Fallback to empty or handled error state
        } finally {
            setIsLoading(false);
        }
    };

    // Stats
    const totalVolume = listings.reduce((sum, l) => sum + (l.quantity_mt || 0), 0);
    const activeListings = listings.filter(l => l.status === 'ACTIVE').length;
    const totalMatches = listings.reduce((sum, l) => sum + (l.match_count || 0), 0);

    const handleCreateListing = async (data: ListingFormData) => {
        setIsSubmitting(true);
        try {
            await api.listings.create(data);
            await fetchListings(); // Refresh list
            setIsCreateModalOpen(false);
        } catch (error) {
            console.error("Failed to create listing:", error);
            alert("Failed to create listing. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleListingStatus = async (id: string, currentStatus: string) => {
        // Optimistic update
        console.log("Toggle status for", id);
        setListings(prev => prev.map(l => 
            l.id === id 
                ? { ...l, status: l.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
                : l
        ));
    };

    const deleteListing = async (id: string) => {
        if (!confirm("Are you sure you want to delete this listing?")) return;
        
        console.log("Delete listing", id);
        setListings(prev => prev.filter(l => l.id !== id));
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                            Listing Console
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            Manage your fuel listings and track incoming orders.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white dark:text-slate-900 font-bold rounded-lg transition-colors shadow-sm"
                    >
                        <Plus size={20} />
                        Create Listing
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm dark:shadow-none">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                            <FileText className="text-emerald-500 dark:text-emerald-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : listings.length}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Total Listings</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm dark:shadow-none">
                        <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                            <Eye className="text-blue-500 dark:text-blue-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : activeListings}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Active</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm dark:shadow-none">
                        <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                            <Package className="text-amber-500 dark:text-amber-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : `${totalVolume.toLocaleString()} MT`}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Total Volume</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-center gap-4 shadow-sm dark:shadow-none">
                        <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-lg">
                            <TrendingUp className="text-purple-500 dark:text-purple-400" size={24} />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">
                                {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : totalMatches}
                            </div>
                            <div className="text-xs text-slate-500 uppercase font-bold">Order Matches</div>
                        </div>
                    </div>
                </div>

                {/* Listings Table */}
                <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm dark:shadow-none">
                    {isLoading ? (
                        <div className="p-12 flex justify-center items-center text-slate-500 dark:text-slate-400">
                            <Loader2 className="animate-spin mr-2" />
                            <span>Loading listings...</span>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500 font-bold bg-slate-50 dark:bg-slate-800/50">
                                            <th className="px-6 py-4 text-left">Fuel / Region</th>
                                            <th className="px-6 py-4 text-left">Availability</th>
                                            <th className="px-6 py-4 text-right">Quantity</th>
                                            <th className="px-6 py-4 text-right">Price</th>
                                            <th className="px-6 py-4 text-center">Certifications</th>
                                            <th className="px-6 py-4 text-center">Order Matches</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                        {listings.map(listing => (
                                            <tr key={listing.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900 dark:text-slate-200">
                                                        {listing.fuel_type} ({listing.fuel_grade})
                                                    </div>
                                                    <div className="text-sm text-slate-500">{listing.region}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{listing.availability_window}</td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-700 dark:text-slate-200">
                                                    {listing.quantity_mt.toLocaleString()} MT
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">${listing.price_per_mt_usd}</span>
                                                    <span className="text-slate-500">/MT</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-1 flex-wrap">
                                                        {listing.certifications?.map((cert, idx) => (
                                                            <span key={idx} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-transparent">
                                                                {cert}
                                                            </span>
                                                        ))}
                                                        {listing.is_verdaxis_verified && (
                                                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 rounded text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                                                                <Shield size={10} />
                                                                Verified
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {(listing.match_count || 0) > 0 ? (
                                                        <span className="px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-sm font-bold border border-purple-200 dark:border-purple-500/30">
                                                            {listing.match_count}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                                        listing.status === 'ACTIVE'
                                                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                                                            : 'bg-slate-100 dark:bg-slate-600/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-500/50'
                                                    }`}>
                                                        {listing.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => toggleListingStatus(listing.id, listing.status)}
                                                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                            title={listing.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {listing.status === 'ACTIVE' ? <EyeOff size={16} /> : <Eye size={16} />}
                                                        </button>
                                                        <button
                                                            onClick={() => deleteListing(listing.id)}
                                                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {listings.length === 0 && (
                                <div className="p-12 text-center text-slate-500">
                                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">No listings yet</p>
                                    <p className="text-sm mt-1">Create your first listing to start receiving Direct Orders</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Create Listing Modal */}
            {isCreateModalOpen && (
                <CreateListingModal
                    onSubmit={handleCreateListing}
                    onCancel={() => setIsCreateModalOpen(false)}
                    isLoading={isSubmitting}
                />
            )}
        </div>
    );
};
