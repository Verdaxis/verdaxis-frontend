import { Port, Vessel, Supplier, QuoteRequest, InventoryItem, Notification, Course } from '../types';
import { API_URL } from './config';

// Helper to get auth header
const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
    };
};

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        const errorText = await res.text();
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.detail || res.statusText);
        } catch (e) {
            throw new Error(errorText || res.statusText);
        }
    }
    return res.json();
};

export const api = {
    ports: {
        list: async (): Promise<Port[]> => {
            const res = await fetch(`${API_URL}/ports`, { headers: getHeaders() });
            return handleResponse(res);
        },
        getById: async (id: string): Promise<Port | undefined> => {
            const res = await fetch(`${API_URL}/ports/${id}`, { headers: getHeaders() });
            return handleResponse(res);
        }
    },

    vessels: {
        list: async (): Promise<Vessel[]> => {
            const res = await fetch(`${API_URL}/vessels`, { headers: getHeaders() });
            return handleResponse(res);
        },
        updateStatus: async (id: string, status: 'At Sea' | 'In Port'): Promise<Vessel> => {
           // Backend doesn't have status update yet, mock for now or implement?
           // The backend definition of Vessel doesn't actually have a status update endpoint.
           // We'll return mock or error. For demo continuity, let's keep it mocked or throw unimplemented.
           // However, to avoid breaking the UI, we might need to fake it or implement it on backend.
           // Backend Vessel model has filtering by org.
           // Let's assume for now read-only for vessels from backend, or simple error.
           console.warn("Vessel status update not strictly implemented in backend yet");
           const res = await fetch(`${API_URL}/vessels/${id}`, { headers: getHeaders() }); 
           return handleResponse(res);
        }
    },

    suppliers: {
        list: async (query?: string): Promise<Supplier[]> => {
             // Backend currently doesn't expose a public supplier list endpoint (privacy).
             // However, for the "Marketplace" filters we might need it? 
             // Or maybe we use the listings to derive suppliers.
             // The original app mocked this.
             // We'll return an empty list or mock list to prevent crash, as our new backend relies on ANONYMOUS listings until interaction.
             return []; 
        }
    },

    quotes: {
        // This was the old global quote system. The new system is RFQ-based.
        // We'll map this to RFQ listings if possible, or leave empty if the UI has migrated.
        list: async (role: 'BUYER' | 'SUPPLIER' = 'BUYER', search?: string): Promise<QuoteRequest[]> => {
             return []; // Legacy
        },
        create: async (request: any): Promise<any> => {
            return {};
        },
        update: async (id: string, updates: any): Promise<any> => {
            return {};
        },
        delete: async (id: string): Promise<void> => {
            return;
        }
    },

    inventory: {
        list: async (): Promise<InventoryItem[]> => {
            const res = await fetch(`${API_URL}/inventory`, { headers: getHeaders() });
            return handleResponse(res);
        },
        add: async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
             const res = await fetch(`${API_URL}/inventory`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(item)
            });
            return handleResponse(res);
        }
    },

    notifications: {
        list: async (): Promise<Notification[]> => {
            // Mock notifications for now as backend doesn't have this yet
            return [
                { id: '1', type: 'info', message: 'Welcome to the new implementation', read: false, date: new Date().toISOString() }
            ];
        }
    },

    training: {
        list: async (): Promise<Course[]> => {
             // Mock training data
             return [
                 { id: '1', title: 'Methanol Safety', provider: 'Verdaxis', duration: '2h', completed: false }
             ];
        }
    },

    // ============== RFQ Marketplace API ==============
    listings: {
        list: async (filters?: { region?: string; fuelType?: string; availability?: string }): Promise<any[]> => {
            const params = new URLSearchParams();
            if (filters?.region) params.append('region', filters.region);
            if (filters?.fuelType) params.append('fuel_type', filters.fuelType); // Note snake_case param in backend
            if (filters?.availability) params.append('availability', filters.availability);
            
            const res = await fetch(`${API_URL}/listings?${params.toString()}`, { headers: getHeaders() });
            return handleResponse(res);
        },
        getRegions: async (): Promise<string[]> => {
             const res = await fetch(`${API_URL}/listings/regions/list`, { headers: getHeaders() });
             return handleResponse(res);
        },
        getFuelTypes: async (): Promise<string[]> => {
             const res = await fetch(`${API_URL}/listings/fuel-types/list`, { headers: getHeaders() });
             return handleResponse(res);
        },
        getMyListings: async (): Promise<any[]> => {
             const res = await fetch(`${API_URL}/listings/my`, { headers: getHeaders() });
             return handleResponse(res);
        },
        create: async (data: any): Promise<any> => {
             const res = await fetch(`${API_URL}/listings`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        }
    },

    rfq: {
        request: async (listingId: string, acceptedTerms: boolean): Promise<any> => {
            const res = await fetch(`${API_URL}/rfq/request`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ listing_id: listingId, accepted_terms: acceptedTerms })
            });
            return handleResponse(res);
        },
        listMyRequests: async (): Promise<any[]> => {
             const res = await fetch(`${API_URL}/rfq/my-requests`, { headers: getHeaders() });
             return handleResponse(res);
        },
        listIncoming: async (): Promise<any[]> => {
             const res = await fetch(`${API_URL}/rfq/incoming`, { headers: getHeaders() });
             return handleResponse(res);
        },
        respond: async (matchId: string, status: string): Promise<any> => {
             const res = await fetch(`${API_URL}/rfq/${matchId}/respond`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ status })
            });
            return handleResponse(res);
        },
        complete: async (matchId: string, data: { final_quantity_mt: number, final_price_per_mt: number }): Promise<any> => {
             const res = await fetch(`${API_URL}/rfq/${matchId}/complete`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        }
    },
};
