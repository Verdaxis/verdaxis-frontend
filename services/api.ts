
import { PORTS, VESSELS, SUPPLIERS, MOCK_REQUESTS, INVENTORY_ITEMS as SEED_INVENTORY, NOTIFICATIONS, COURSES } from '../data';
import { Port, Vessel, Supplier, QuoteRequest, InventoryItem, Notification, Course } from '../types';

// Simulate Network Latency (300ms - 800ms)
const delay = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms || 300 + Math.random() * 500));

// --- IN-MEMORY DATABASE STATE ---
let db_ports = [...PORTS];
let db_vessels = [...VESSELS];
let db_suppliers = [...SUPPLIERS];
let db_quotes = [...MOCK_REQUESTS];
let db_inventory: InventoryItem[] = [...SEED_INVENTORY];

export const api = {
    ports: {
        list: async (): Promise<Port[]> => {
            await delay();
            return db_ports;
        },
        getById: async (id: string): Promise<Port | undefined> => {
            await delay(200);
            return db_ports.find(p => p.id === id);
        }
    },

    vessels: {
        list: async (): Promise<Vessel[]> => {
            await delay();
            return db_vessels;
        },
        updateStatus: async (id: string, status: 'At Sea' | 'In Port'): Promise<Vessel> => {
            await delay();
            const idx = db_vessels.findIndex(v => v.id === id);
            if (idx === -1) throw new Error("Vessel not found");
            db_vessels[idx] = { ...db_vessels[idx], status };
            return db_vessels[idx];
        }
    },

    suppliers: {
        // Supports filtering by explicit Port ID OR a general search query string
        list: async (query?: string): Promise<Supplier[]> => {
            await delay();
            
            let results = db_suppliers;

            if (query && query.trim() !== '') {
                const lowerQ = query.toLowerCase();
                
                // 1. Find ports that match the query (e.g. "Sing" -> "Singapore")
                const matchingPortIds = db_ports
                    .filter(p => p.name.toLowerCase().includes(lowerQ) || p.country.toLowerCase().includes(lowerQ))
                    .map(p => p.id);
                
                // 2. Filter suppliers: 
                //    - Match Name (e.g. "Global")
                //    - OR Operates in one of the matching ports
                results = results.filter(s => 
                    s.name.toLowerCase().includes(lowerQ) || 
                    s.ports.some(pid => matchingPortIds.includes(pid))
                );
            }
            return results;
        }
    },

    quotes: {
        list: async (role: 'BUYER' | 'SUPPLIER' = 'BUYER', search?: string): Promise<QuoteRequest[]> => {
            await delay();
            let results = db_quotes;

            if (search && search.trim() !== '') {
                const lowerS = search.toLowerCase();
                results = results.filter(q => 
                    q.id.toLowerCase().includes(lowerS) ||
                    (q.buyerName && q.buyerName.toLowerCase().includes(lowerS)) ||
                    (q.vesselId && q.vesselId.toLowerCase().includes(lowerS))
                );
            }

            return results;
        },
        create: async (request: Omit<QuoteRequest, 'id' | 'status'>): Promise<QuoteRequest> => {
            await delay(800);
            const newQuote: QuoteRequest = {
                ...request,
                id: `qr-${Math.floor(Math.random() * 10000)}`,
                status: 'Pending'
            };
            db_quotes = [newQuote, ...db_quotes];
            return newQuote;
        },
        update: async (id: string, updates: Partial<QuoteRequest>): Promise<QuoteRequest> => {
            await delay(500);
            const idx = db_quotes.findIndex(q => q.id === id);
            if (idx === -1) throw new Error("Quote not found");
            
            db_quotes[idx] = { ...db_quotes[idx], ...updates };
            return db_quotes[idx];
        },
        delete: async (id: string): Promise<void> => {
            await delay(300);
            db_quotes = db_quotes.filter(q => q.id !== id);
        }
    },

    inventory: {
        list: async (): Promise<InventoryItem[]> => {
            await delay();
            return db_inventory;
        },
        add: async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
            await delay(600);
            const newItem = { ...item, id: `inv-${Date.now()}` };
            db_inventory = [...db_inventory, newItem];
            return newItem;
        }
    },

    notifications: {
        list: async (): Promise<Notification[]> => {
            await delay();
            return NOTIFICATIONS;
        }
    },

    training: {
        list: async (): Promise<Course[]> => {
            await delay();
            return COURSES;
        }
    },

    // ============== RFQ Marketplace API ==============
    listings: {
        list: async (filters?: { region?: string; fuelType?: string; availability?: string }): Promise<any[]> => {
            await delay();
            // Mock data for anonymized listings
            return [
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
                    created_at: new Date().toISOString(),
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
                    created_at: new Date().toISOString(),
                },
                {
                    id: 'lst-003',
                    region: 'Houston',
                    fuel_type: 'Biofuel',
                    fuel_grade: 'Bio',
                    quantity_mt: 2500,
                    price_per_mt_usd: 780,
                    availability_window: 'Spot',
                    tier_label: 'Regional Supplier',
                    certifications: ['ProofOfSustainability'],
                    is_verdaxis_verified: false,
                    status: 'ACTIVE',
                    created_at: new Date().toISOString(),
                },
                {
                    id: 'lst-004',
                    region: 'Singapore',
                    fuel_type: 'LNG',
                    fuel_grade: 'Conventional',
                    quantity_mt: 10000,
                    price_per_mt_usd: 890,
                    availability_window: 'Q2 2026',
                    tier_label: 'Tier 1 Producer',
                    certifications: [],
                    is_verdaxis_verified: true,
                    status: 'ACTIVE',
                    created_at: new Date().toISOString(),
                },
                {
                    id: 'lst-005',
                    region: 'ARA',
                    fuel_type: 'Methanol',
                    fuel_grade: 'Green',
                    quantity_mt: 8000,
                    price_per_mt_usd: 545,
                    availability_window: 'Spot',
                    tier_label: 'Independent Supplier',
                    certifications: ['ISCC', 'Nanolumi', 'ProofOfSustainability'],
                    is_verdaxis_verified: true,
                    status: 'ACTIVE',
                    created_at: new Date().toISOString(),
                },
            ].filter(l => {
                if (filters?.region && !l.region.toLowerCase().includes(filters.region.toLowerCase())) return false;
                if (filters?.fuelType && l.fuel_type !== filters.fuelType) return false;
                if (filters?.availability && l.availability_window !== filters.availability) return false;
                return true;
            });
        },
        getRegions: async (): Promise<string[]> => {
            await delay(200);
            return ['Singapore', 'ARA', 'Houston', 'Fujairah', 'Shanghai'];
        },
        getFuelTypes: async (): Promise<string[]> => {
            await delay(200);
            return ['Methanol', 'Biofuel', 'LNG', 'Ammonia'];
        },
    },

    rfq: {
        request: async (listingId: string, acceptedTerms: boolean): Promise<any> => {
            await delay(800);
            if (!acceptedTerms) throw new Error('Terms must be accepted');
            return {
                id: `rfq-${Date.now()}`,
                listing_id: listingId,
                status: 'PENDING',
                created_at: new Date().toISOString(),
            };
        },
        listMyRequests: async (): Promise<any[]> => {
            await delay();
            return []; // Mock empty for now
        },
    },
};
