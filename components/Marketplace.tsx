import React, { useState, useEffect } from 'react';
import { Search, Filter, Ship, Loader2, MapPin } from 'lucide-react';
import { Port, Supplier } from '../types';
import { PORTS } from '../data'; 
import { SupplierCard } from './marketplace/SupplierCard';
import { QuoteRequestModal } from './marketplace/QuoteRequestModal';
import { api } from '../services/api';

interface MarketplaceProps {
    initialPort: Port | null;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ initialPort }) => {
    const [portInput, setPortInput] = useState(initialPort?.name || '');
    const [fuelType, setFuelType] = useState('Methanol');
    
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    
    // Autocomplete state
    const [suggestions, setSuggestions] = useState<Port[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Debounce Search logic
    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch();
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [portInput]); // Re-run when input changes

    // Handle Input Change & Autocomplete
    const handleInputChange = (text: string) => {
        setPortInput(text);
        if (text.length > 1) {
            const matches = PORTS.filter(p => p.name.toLowerCase().includes(text.toLowerCase()));
            setSuggestions(matches);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (portName: string) => {
        setPortInput(portName);
        setShowSuggestions(false);
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        setIsSearching(true);
        setLoading(true);
        
        try {
            // "Smart Search": Pass the input directly to API for fuzzy matching
            const data = await api.suppliers.list(portInput);
            setSuppliers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    const handleRequestQuote = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
    };

    return (
        <div className="max-w-7xl mx-auto p-4 lg:p-10 pb-24" onClick={() => setShowSuggestions(false)}>
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl lg:text-3xl v-heading">Green Fuel Marketplace</h1>
                <p className="text-slate-500 mt-1 lg:mt-2 text-sm lg:text-base">Secure compliant marine fuels based on energy density and real-time availability.</p>
            </div>

            {/* Search Bar */}
            <div className="v-card p-4 lg:p-6 mb-8 relative z-20">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="relative">
                        <label className="v-label">Port Location</label>
                        <div className="relative">
                            <Ship className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                value={portInput}
                                onChange={(e) => handleInputChange(e.target.value)}
                                className="v-input pl-10"
                                placeholder="e.g. Singapore"
                                autoComplete="off"
                            />
                        </div>
                        
                        {/* Autocomplete Dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 mt-1 z-30 overflow-hidden">
                                {suggestions.map(port => (
                                    <div 
                                        key={port.id}
                                        className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center space-x-2 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            selectSuggestion(port.name);
                                        }}
                                    >
                                        <MapPin size={14} className="text-slate-400" />
                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{port.name}, {port.country}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="v-label">Fuel Type</label>
                        <select 
                            value={fuelType}
                            onChange={(e) => setFuelType(e.target.value)}
                            className="v-input appearance-none"
                        >
                            <option>Methanol</option>
                            <option>Biofuel (B24)</option>
                            <option>Biofuel (B100)</option>
                            <option>LNG</option>
                            <option>Ammonia (Green)</option>
                        </select>
                    </div>
                    <div>
                        <label className="v-label">Delivery Window</label>
                        <input 
                            type="date" 
                            className="v-input text-slate-600"
                        />
                    </div>
                    <button 
                        type="submit"
                        className="v-btn-primary w-full"
                    >
                        {isSearching ? (
                            <span className="animate-pulse">Searching...</span>
                        ) : (
                            <>
                                <Search size={18} />
                                <span>Find Supply</span>
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Results */}
            <div className="animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                    <h2 className="text-lg lg:text-xl v-heading">
                        {loading ? 'Searching Suppliers...' : `Available Suppliers ${portInput ? `matching "${portInput}"` : ''}`}
                    </h2>
                    <button className="flex items-center space-x-2 text-sm font-medium text-slate-500 hover:text-[#5DADE2]">
                        <Filter size={16} />
                        <span>Filter Results</span>
                    </button>
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                             <Loader2 size={32} className="animate-spin text-verdaxis" />
                        </div>
                    ) : suppliers.length > 0 ? (
                        suppliers.map((supplier, idx) => (
                            <SupplierCard 
                                key={supplier.id} 
                                supplier={supplier} 
                                index={idx} 
                                onRequestQuote={handleRequestQuote} 
                            />
                        ))
                    ) : (
                            <div className="text-center py-16 v-card border-dashed">
                            <Ship className="mx-auto h-12 w-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-500">No suppliers found</h3>
                            <p className="text-slate-400 mt-1">Try searching for "Singapore" or "Rotterdam".</p>
                        </div>
                    )}
                </div>
            </div>

            {/* The "Aha!" Quote Modal */}
            {selectedSupplier && (
                <QuoteRequestModal 
                    supplier={selectedSupplier} 
                    onClose={() => setSelectedSupplier(null)} 
                />
            )}
        </div>
    );
};