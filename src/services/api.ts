import { Port, Vessel, Supplier, InventoryItem, Notification, Course } from '../types';
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
            if (e instanceof Error && e.message !== errorText) throw e;
            throw new Error(errorText || res.statusText);
        }
    }
    return res.json();
};

// Fetch with timeout to prevent indefinite loading spinners
const fetchWithTimeout = (url: string, options?: RequestInit, timeoutMs = 15000): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .catch((err) => {
            if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
            throw err;
        })
        .finally(() => clearTimeout(timeout));
};

// Helper to fetch from API and handle response
const fetchApi = async (path: string, options?: RequestInit) => {
    const res = await fetchWithTimeout(`${API_URL}${path}`, options);
    return handleResponse(res);
};

export const api = {
    ports: {
        list: async (): Promise<Port[]> => {
            const res = await fetchWithTimeout(`${API_URL}/ports`, { headers: getHeaders() });
            const data = await handleResponse(res);
            // Transform backend data to frontend Port interface
            return data.map((p: any) => ({
                ...p,
                location: { lat: p.lat, lng: p.lng },
                // Ensure default values for missing intelligence/details if necessary
                priceMethanol: p.intelligence?.methanol_price_avg || 0,
                priceTrend: p.intelligence?.price_trend ?? 0,
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
            const res = await fetchWithTimeout(`${API_URL}/ports/${id}`, { headers: getHeaders() });
            return handleResponse(res);
        }
    },

    vessels: {
        list: async (): Promise<Vessel[]> => {
            const res = await fetchWithTimeout(`${API_URL}/vessels`, { headers: getHeaders() });
            const data = await handleResponse(res);
            // Varied mock voyage/status data keyed by IMO suffix
            const voyageData: Record<string, { status: string; nextVoyage: string; nextDryDock: string }> = {
                '9919475': { status: 'At Sea', nextVoyage: 'Colombo → Rotterdam (ETA: 12 Days)', nextDryDock: 'Mar 2027' },
                '9919487': { status: 'At Sea', nextVoyage: 'Halifax → Antwerp (ETA: 6 Days)', nextDryDock: 'Sep 2026' },
                '9919499': { status: 'At Sea', nextVoyage: 'Honolulu → Yokohama (ETA: 9 Days)', nextDryDock: 'Jan 2028' },
                '9919504': { status: 'At Sea', nextVoyage: 'Santos → Algeciras (ETA: 8 Days)', nextDryDock: 'Jun 2026' },
                '9919516': { status: 'At Sea', nextVoyage: 'Durban → Singapore (ETA: 14 Days)', nextDryDock: 'Nov 2026' },
                '9919528': { status: 'In Port', nextVoyage: 'Hamburg → Gothenburg (Dep: Tomorrow)', nextDryDock: 'Apr 2027' },
                '9919530': { status: 'At Sea', nextVoyage: 'Guayaquil → Cartagena (ETA: 3 Days)', nextDryDock: 'Aug 2026' },
                '9919542': { status: 'At Sea', nextVoyage: 'Fujairah → Jebel Ali (ETA: 1 Day)', nextDryDock: 'Feb 2026' },
            };
            return data.map((v: any) => {
                const meta = voyageData[v.imo_number] || { status: 'At Sea', nextVoyage: 'En route', nextDryDock: 'TBD' };
                return {
                    id: v.id,
                    name: v.name,
                    imo: v.imo_number,
                    vesselType: v.vessel_type,
                    status: meta.status as Vessel['status'],
                    complianceEUETS: v.eu_ets_status || 'Non-Compliant',
                    complianceFuelEU: v.fueleu_status || 'Non-Compliant',
                    ciiGrade: v.cii_rating || 'C',
                    nextVoyage: meta.nextVoyage,
                    nextDryDock: meta.nextDryDock,
                    location: v.lat && v.lng ? { lat: v.lat, lng: v.lng } : undefined,
                    previousLocation: v.prev_lat && v.prev_lng ? { lat: v.prev_lat, lng: v.prev_lng } : undefined,
                };
            });
        },
        updateStatus: async (id: string, status: 'At Sea' | 'In Port'): Promise<Vessel> => {
           // Backend doesn't have status update yet, mock for now or implement?
           // The backend definition of Vessel doesn't actually have a status update endpoint.
           // We'll return mock or error. For demo continuity, let's keep it mocked or throw unimplemented.
           // However, to avoid breaking the UI, we might need to fake it or implement it on backend.
           // Backend Vessel model has filtering by org.
           // Let's assume for now read-only for vessels from backend, or simple error.
           console.warn("Vessel status update not strictly implemented in backend yet");
           const res = await fetchWithTimeout(`${API_URL}/vessels/${id}`, { headers: getHeaders() });
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

    inventory: {
        list: async (): Promise<InventoryItem[]> => {
            const res = await fetchWithTimeout(`${API_URL}/inventory`, { headers: getHeaders() });
            const data = await handleResponse(res);
            // Transform backend data to frontend InventoryItem interface
            return data.map((item: any) => {
                // Determine status based on stock levels
                let status: 'Available' | 'Low Stock' | 'Out of Stock' = 'Available';
                const currentStock = Number(item.current_stock_mt);
                if (currentStock <= 0) {
                    status = 'Out of Stock';
                } else if (currentStock < 500) {
                    status = 'Low Stock';
                }
                
                return {
                    id: item.id,
                    productName: item.product_name || item.fuel_type,
                    portId: item.port_id,
                    portName: item.port_id?.split('-')[1]?.toUpperCase() || item.port_id, // Extract readable port name
                    currentStock: currentStock,
                    incomingStock: Number(item.incoming_stock_mt) || 0,
                    pricePerMt: Number(item.price_per_mt_usd) || 0,
                    status: status
                };
            });
        },
        publish: async (itemId: string): Promise<any> => {
            const res = await fetchWithTimeout(`${API_URL}/inventory/${itemId}/publish`, {
                method: 'POST',
                headers: getHeaders()
            });
            return handleResponse(res);
        },
        update: async (itemId: string, data: any): Promise<any> => {
            const res = await fetchWithTimeout(`${API_URL}/inventory/${itemId}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            return handleResponse(res);
        },
        delete: async (itemId: string): Promise<void> => {
            const res = await fetchWithTimeout(`${API_URL}/inventory/${itemId}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!res.ok) {
                const error = await res.text();
                throw new Error(error || "Failed to delete inventory item");
            }
        },
        add: async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
            // Transform frontend format to backend format
            const payload = {
                port_id: item.portId,
                fuel_type: item.productName, // Use product name as fuel type
                product_name: item.productName,
                current_stock_mt: item.currentStock,
                incoming_stock_mt: item.incomingStock,
                price_per_mt_usd: item.pricePerMt
            };
            const res = await fetchWithTimeout(`${API_URL}/inventory`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await handleResponse(res);
            // Transform response back to frontend format
            let status: 'Available' | 'Low Stock' | 'Out of Stock' = 'Available';
            const currentStock = Number(data.current_stock_mt);
            if (currentStock <= 0) {
                status = 'Out of Stock';
            } else if (currentStock < 500) {
                status = 'Low Stock';
            }
            return {
                id: data.id,
                productName: data.product_name || data.fuel_type,
                portId: data.port_id,
                portName: data.port_id?.split('-')[1]?.toUpperCase() || data.port_id,
                currentStock: currentStock,
                incomingStock: Number(data.incoming_stock_mt) || 0,
                pricePerMt: Number(data.price_per_mt_usd) || 0,
                status: status
            };
        }
    },

    notifications: {
        list: async (): Promise<Notification[]> => {
            const res = await fetchWithTimeout(`${API_URL}/notifications`, { headers: getHeaders() });
            return handleResponse(res);
        },
        getUnreadCount: async (): Promise<number> => {
            const res = await fetchWithTimeout(`${API_URL}/notifications/unread-count`, { headers: getHeaders() });
            const data = await handleResponse(res);
            return data.count;
        },
        markRead: async (id: string): Promise<any> => {
            const res = await fetchWithTimeout(`${API_URL}/notifications/${id}/read`, {
                method: 'PATCH',
                headers: getHeaders()
            });
            return handleResponse(res);
        },
        markAllRead: async (): Promise<any> => {
            const res = await fetchWithTimeout(`${API_URL}/notifications/read-all`, {
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

    orderbook: {
        list: async (params?: { region?: string; fuel_type?: string; side?: string; availability?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.side) searchParams.append('side', params.side);
            if (params?.availability) searchParams.append('availability', params.availability);
            const query = searchParams.toString();
            return fetchApi(`/orderbook${query ? `?${query}` : ''}`);
        },
        listBids: async (params?: { region?: string; fuel_type?: string; availability?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.availability) searchParams.append('availability', params.availability);
            const query = searchParams.toString();
            return fetchApi(`/orderbook/bids${query ? `?${query}` : ''}`);
        },
        listAsks: async (params?: { region?: string; fuel_type?: string; availability?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.availability) searchParams.append('availability', params.availability);
            const query = searchParams.toString();
            return fetchApi(`/orderbook/asks${query ? `?${query}` : ''}`);
        },
        myOrders: async () => {
            return fetchApi('/orderbook/my', { headers: getHeaders() });
        },
        create: async (data: any) => {
            return fetchApi('/orderbook', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
        },
        update: async (id: string, data: any) => {
            return fetchApi(`/orderbook/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
        },
        cancel: async (id: string) => {
            return fetchApi(`/orderbook/${id}`, {
                method: 'DELETE',
                headers: getHeaders(),
            });
        },
        aggregated: async () => {
            return fetchApi('/orderbook/aggregated');
        },
        regions: async () => {
            return fetchApi('/orderbook/regions');
        },
        fuelTypes: async () => {
            return fetchApi('/orderbook/fuel-types');
        },
    },

    trades: {
        initiate: async (data: { order_id: string; quantity_mt: number }) => {
            return fetchApi('/trades', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
        },
        myTrades: async () => {
            return fetchApi('/trades/my', { headers: getHeaders() });
        },
        confirm: async (tradeId: string) => {
            return fetchApi(`/trades/${tradeId}/confirm`, {
                method: 'PUT',
                headers: getHeaders(),
            });
        },
        decline: async (tradeId: string) => {
            return fetchApi(`/trades/${tradeId}/decline`, {
                method: 'PUT',
                headers: getHeaders(),
            });
        },
        deliver: async (tradeId: string, data: { final_quantity_mt: number; final_price_per_mt: number }) => {
            return fetchApi(`/trades/${tradeId}/deliver`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
        },
        pay: async (tradeId: string) => {
            return fetchApi(`/trades/${tradeId}/pay`, {
                method: 'POST',
                headers: getHeaders(),
            });
        },
    },
};
