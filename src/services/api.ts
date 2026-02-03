import { Port, Vessel, Supplier, DirectOrder, InventoryItem, Notification, Course } from '../types';
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
            const data = await handleResponse(res);
            // Transform backend data to frontend Port interface
            return data.map((p: any) => ({
                ...p,
                location: { lat: p.lat, lng: p.lng },
                // Ensure default values for missing intelligence/details if necessary
                priceMethanol: p.intelligence?.methanol_price_avg || 0,
                methanolSupply: p.intelligence?.congestion_level || 'Medium', // Use congestion as proxy or default
                details: {
                    ...p.details,
                    plattsPrice: p.intelligence?.methanol_price_avg,
                    ffaPrice: p.intelligence?.biofuel_price_avg,
                    priceHistory: p.details?.priceHistory || [500, 510, 505, 520, 515, 525, 530], // Mock history if missing
                    congestionLevel: p.intelligence?.congestion_level || 'Low',
                    avgWaitingTime: 0,
                    activeBarges: 0,
                    forecastSupply: 'Balanced',
                    upcomingProjects: []
                }
            }));
        },
        getById: async (id: string): Promise<Port | undefined> => {
            const res = await fetch(`${API_URL}/ports/${id}`, { headers: getHeaders() });
            return handleResponse(res);
        }
    },

    vessels: {
        list: async (): Promise<Vessel[]> => {
            const res = await fetch(`${API_URL}/vessels`, { headers: getHeaders() });
            const data = await handleResponse(res);
            return data.map((v: any) => ({
                id: v.id,
                name: v.name,
                imo: v.imo_number, // backend: imo_number
                vesselType: v.vessel_type,
                status: 'At Sea', // Mock status for now as backend doesn't store operational status yet
                complianceEUETS: v.eu_ets_status || 'Non-Compliant',
                complianceFuelEU: v.fueleu_status || 'Non-Compliant',
                ciiGrade: v.cii_rating || 'C',
                // Mock voyage info until backend supports it
                nextVoyage: 'Singapore -> Rotterdam (ETA: 4 Days)',
                nextDryDock: 'Sep 2026', 
                location: v.lat && v.lng ? { lat: v.lat, lng: v.lng } : undefined,
                // Add previous location if needed for heading
                previousLocation: v.prev_lat && v.prev_lng ? { lat: v.prev_lat, lng: v.prev_lng } : undefined
            }));
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

    directOrders: {
        list: async (): Promise<DirectOrder[]> => {
             const res = await fetch(`${API_URL}/direct-orders`, { headers: getHeaders() });
             const data = await handleResponse(res);
             return data.map((q: any) => ({
                 id: q.id,
                 portId: q.port_id,
                 fuelType: q.fuel_type,
                 quantity: q.quantity_mt,
                 deliveryDate: q.delivery_window_start,
                 vesselId: q.vessel_id,
                 status: q.status,
                 supplierId: q.awarded_supplier_id,
                 price: q.final_price_per_mt,
                 offers: q.offers?.map((o: any) => ({
                     id: o.id,
                     directOrderId: o.direct_order_id,
                     supplierId: o.supplier_id,
                     pricePerMt: o.price_per_mt_usd,
                     validUntil: o.valid_until,
                     terms: o.terms_and_conditions,
                     isAccepted: o.is_accepted,
                     createdAt: o.created_at
                 })) || []
             }));
        },
        create: async (request: Partial<DirectOrder>): Promise<DirectOrder> => {
            const payload = {
                port_id: request.portId,
                fuel_type: request.fuelType,
                quantity_mt: request.quantity,
                delivery_window_start: request.deliveryDate,
                delivery_window_end: request.deliveryDate, // Simplified 1-day window
                vessel_id: request.vesselId
            };
            const res = await fetch(`${API_URL}/direct-orders`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            return handleResponse(res);
        },
        createOffer: async (quoteId: string, offer: { pricePerMt: number, validUntil?: string, terms?: string }): Promise<any> => {
            const payload = {
                price_per_mt_usd: offer.pricePerMt,
                valid_until: offer.validUntil,
                terms_and_conditions: offer.terms
            };
            const res = await fetch(`${API_URL}/direct-orders/${quoteId}/offers`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            return handleResponse(res);
        },
        acceptOffer: async (quoteId: string, offerId: string): Promise<any> => {
             const res = await fetch(`${API_URL}/direct-orders/${quoteId}/accept/${offerId}`, {
                method: 'PUT',
                headers: getHeaders()
            });
            return handleResponse(res);
        },
        update: async (id: string, updates: any): Promise<any> => {
            // Not implemented fully yet
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
            const res = await fetch(`${API_URL}/notifications`, { headers: getHeaders() });
            return handleResponse(res);
        },
        getUnreadCount: async (): Promise<number> => {
            const res = await fetch(`${API_URL}/notifications/unread-count`, { headers: getHeaders() });
            const data = await handleResponse(res);
            return data.count;
        },
        markRead: async (id: string): Promise<any> => {
            const res = await fetch(`${API_URL}/notifications/${id}/read`, {
                method: 'PATCH',
                headers: getHeaders()
            });
            return handleResponse(res);
        },
        markAllRead: async (): Promise<any> => {
            const res = await fetch(`${API_URL}/notifications/read-all`, {
                method: 'PATCH',
                headers: getHeaders()
            });
            return handleResponse(res);
        }
    },

    training: {
        list: async (): Promise<Course[]> => {
             // Mock training data
             return [
                 { 
                     id: '1', 
                     title: 'Methanol Safety', 
                     duration: '2h',
                     description: 'Basics of methanol bunkering safety',
                     category: 'Safety',
                     requiredForFuel: ['Methanol'],
                     level: 'Beginner',
                     syllabus: ['Introduction', 'Properties', 'Hazards', 'Response']
                 }
             ];
        }
    },

    // ============== Order Marketplace API ==============
    listings: {
        list: async (filters?: { region?: string; fuelType?: string; availability?: string }): Promise<any[]> => {
            const params = new URLSearchParams();
            if (filters?.region) params.append('region', filters.region);
            if (filters?.fuelType) params.append('fuel_type', filters.fuelType); // Note snake_case param in backend
            if (filters?.availability) params.append('availability', filters.availability);
            
            const res = await fetch(`${API_URL}/listings?${params.toString()}`, { headers: getHeaders() });
            const data = await handleResponse(res);
            return data.map((item: any) => ({
                ...item,
                quantity_mt: Number(item.quantity_mt),
                price_per_mt_usd: Number(item.price_per_mt_usd)
            }));
        },
        getAggregated: async (): Promise<any[]> => {
            const res = await fetch(`${API_URL}/listings/aggregated`, { headers: getHeaders() });
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
        },
        delete: async (id: string): Promise<void> => {
             const res = await fetch(`${API_URL}/listings/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) {
                const error = await res.text();
                throw new Error(error || "Failed to delete listing");
            }
        }
    },

    orders: {
        create: async (listingId: string, acceptedTerms: boolean, quantity?: number, deliveryDate?: string): Promise<any> => {
            const res = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ 
                    listing_id: listingId, 
                    accepted_terms: acceptedTerms,
                    quantity_mt: quantity,
                    delivery_date: deliveryDate
                })
            });
            return handleResponse(res);
        },
        listMyOrders: async (): Promise<any[]> => {
             const res = await fetch(`${API_URL}/orders/my-orders`, { headers: getHeaders() });
             return handleResponse(res);
        },
        listIncoming: async (): Promise<any[]> => {
             const res = await fetch(`${API_URL}/orders/incoming`, { headers: getHeaders() });
             return handleResponse(res);
        },
        respond: async (orderId: string, status: string): Promise<any> => {
             const res = await fetch(`${API_URL}/orders/${orderId}/respond`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ status })
            });
            return handleResponse(res);
        },
        deliver: async (orderId: string, data: { final_quantity_mt: number, final_price_per_mt: number }): Promise<any> => {
             const res = await fetch(`${API_URL}/orders/${orderId}/deliver`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        markPaid: async (orderId: string): Promise<any> => {
             const res = await fetch(`${API_URL}/orders/${orderId}/pay`, {
                method: 'POST',
                headers: getHeaders()
            });
            return handleResponse(res);
        }
    },
};
