import { Port, Vessel, InventoryItem, Notification, PriceDiscoveryResponse, PricingOverlayResponse, Product, DeliveryPoint, MarketProduct } from '../types';
import { reliability } from './analytics';
import { getAccessToken, refreshAccessToken } from './authToken';
import { isBackendUnavailableStatus } from './backendAvailability';
import { API_URL } from './config';

export const mapPortResponse = (p: any): Port => ({
    ...p,
    location: { lat: p.lat, lng: p.lng },
    priceMethanol: Number(p.intelligence?.methanol_price_avg ?? 0),
    priceTrend: Number(p.intelligence?.price_trend ?? 0),
    methanolSupply: 'Unknown',
    biofuelSupply: 'Unknown',
    details: {
        ...p.details,
        plattsPrice: p.intelligence?.methanol_price_avg ?? undefined,
        ffaPrice: p.intelligence?.biofuel_price_avg ?? undefined,
        priceHistory: Array.isArray(p.details?.priceHistory) ? p.details.priceHistory : [],
        congestionLevel: p.intelligence?.congestion_level ?? 'Unknown',
        avgWaitingTime: Number(p.details?.avgWaitingTime ?? 0),
        activeBarges: Number(p.details?.activeBarges ?? 0),
        forecastSupply: p.details?.forecastSupply ?? 'Unknown',
        upcomingProjects: Array.isArray(p.details?.upcomingProjects) ? p.details.upcomingProjects : [],
        swapPrice: p.details?.swapPrice ?? undefined,
        lastDone: p.details?.lastDone ?? undefined,
    }
});

const getHeaders = () => {
    const token = getAccessToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
};

const shouldSkipRefresh = (path: string) => path.startsWith('/auth/');

const withAuthHeader = (headers?: RequestInit['headers'], token?: string): Headers => {
    const merged = new Headers(headers);
    if (!merged.has('Content-Type')) merged.set('Content-Type', 'application/json');
    const authToken = token || getAccessToken();
    if (authToken) {
        merged.set('Authorization', `Bearer ${authToken}`);
    } else {
        merged.delete('Authorization');
    }
    return merged;
};

const handleResponse = async (res: Response) => {
    if (!res.ok) {
        if (res.status === 429) {
            // Surface throttling globally — callers routinely swallow request
            // errors, which made 429s invisible (Sprint 3 item 15). The
            // ToastProvider listens for this event.
            window.dispatchEvent(new CustomEvent('verdaxis:rate-limited', {
                detail: { retryAfter: res.headers.get('Retry-After') },
            }));
        }
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
    const externalSignal = options?.signal;
    const abortFromExternalSignal = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    externalSignal?.addEventListener('abort', abortFromExternalSignal);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .catch((err) => {
            if (err.name === 'AbortError') throw new Error('Request timed out. Please try again.');
            throw err;
        })
        .finally(() => {
            clearTimeout(timeout);
            externalSignal?.removeEventListener('abort', abortFromExternalSignal);
        });
};

// Helper to fetch from API and handle response
const fetchApi = async (path: string, options?: RequestInit) => {
    // Mutations get a longer timeout (30s) since they must not be silently dropped
    const isMutation = options?.method && options.method !== 'GET';
    const timeout = isMutation ? 30000 : 15000;
    const url = `${API_URL}${path}`;
    const initialOptions: RequestInit = {
        ...options,
        headers: withAuthHeader(options?.headers),
    };

    let res: Response;
    try {
        res = await fetchWithTimeout(url, initialOptions, timeout);
    } catch (error) {
        // Best-effort, deduplicated telemetry; the caller's error handling
        // and the maintenance UI behavior are unchanged.
        reliability.reportFrontendError('network');
        throw error;
    }
    if (isBackendUnavailableStatus(res.status)) {
        reliability.reportBackendUnavailable();
    }

    if (res.status === 401 && !shouldSkipRefresh(path)) {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
            const retryOptions: RequestInit = {
                ...options,
                headers: withAuthHeader(options?.headers, refreshedToken),
            };
            res = await fetchWithTimeout(url, retryOptions, timeout);
        }
    }

    return handleResponse(res);
};

// Paginated response shape from backend
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    skip: number;
    limit: number;
}

export type ProductUsagePeriod = 7 | 30 | 90;
export type ProductUsageStatus = 'ready' | 'empty' | 'unavailable';

export interface ProductUsageResponse {
    behavioralStatus: ProductUsageStatus;
    diagnosticCategory?: string;
    observedAt: string | null;
    periodDays: ProductUsagePeriod;
    metrics: {
        visitors: number;
        visits: number;
        pageviews: number;
        totalTimeSeconds: number;
        averageSessionDurationSeconds: number | null;
        signupStarts: number;
        completedRegistrations: number;
        registrationConversionRate: number | null;
    };
    funnel: Array<{ key: string; count: number; conversionRate: number | null }>;
    daily: Array<{ date: string; visitors: number; completedRegistrations: number | null }>;
    featureUsage: Array<{ event: string; count: number }>;
    topEntryPages: Array<{ value: string; count: number }>;
    topReferrers: Array<{ value: string; count: number }>;
}

const PRODUCT_USAGE_EVENTS = new Set([
    'platform_navigation', 'market_slice_selected', 'listing_opened', 'order_form_opened', 'order_form_submitted',
    'trade_confirmation_opened', 'tutorial_started', 'tutorial_step_completed',
    'tutorial_step_skipped', 'tutorial_completed', 'estimator_opened', 'estimator_completed',
]);

const PRODUCT_USAGE_FUNNEL_KEYS: Record<string, string> = {
    visitors: 'landing_visitors',
    signup_started: 'signup_starts',
    registrations: 'completed_registrations',
    users_logging_in: 'active_logins',
    order_placing_organizations: 'order_creating_organizations',
};

const mapProductUsageResponse = (data: any): ProductUsageResponse => {
    const behavioral = data.behavioral ?? {};
    const authoritative = data.authoritative ?? {};
    const eventTotals = behavioral.event_totals && typeof behavioral.event_totals === 'object' ? behavioral.event_totals : {};
    const signupStarts = Number(eventTotals.signup_started ?? 0);
    const completedRegistrations = Number(authoritative.registrations ?? 0);
    const hasActivity = Number(behavioral.visitors ?? 0) > 0
        || Number(behavioral.visits ?? 0) > 0
        || Object.values(eventTotals).some(value => Number(value) > 0)
        || completedRegistrations > 0
        || Number(authoritative.users_logging_in ?? 0) > 0
        || Number(authoritative.order_placing_organizations ?? 0) > 0;
    const available = data.behavioral_status === 'available';
    return {
    behavioralStatus: available ? (hasActivity ? 'ready' : 'empty') : 'unavailable',
    diagnosticCategory: data.diagnostic ?? undefined,
    observedAt: data.observed_at ?? null,
    periodDays: data.days,
    metrics: {
        visitors: Number(behavioral.visitors ?? 0),
        visits: Number(behavioral.visits ?? 0),
        pageviews: Number(behavioral.pageviews ?? 0),
        totalTimeSeconds: Number(behavioral.total_time_seconds ?? 0),
        averageSessionDurationSeconds: available ? Number(behavioral.average_session_duration_seconds ?? 0) : null,
        signupStarts,
        completedRegistrations,
        registrationConversionRate: available && signupStarts > 0 && completedRegistrations <= signupStarts
            ? completedRegistrations / signupStarts
            : null,
    },
    funnel: Array.isArray(data.funnel) ? data.funnel.map((item: any) => ({
        key: PRODUCT_USAGE_FUNNEL_KEYS[String(item.name)] ?? String(item.name),
        count: Number(item.value ?? 0),
        conversionRate: item.conversion_from_previous_pct == null
            || Number(item.conversion_from_previous_pct) < 0
            || Number(item.conversion_from_previous_pct) > 100
            ? null
            : Number(item.conversion_from_previous_pct) / 100,
    })) : [],
    daily: Array.isArray(behavioral.daily_visitors) ? behavioral.daily_visitors.map((item: any) => ({
        date: String(item.date),
        visitors: Number(item.value ?? 0),
        completedRegistrations: null,
    })) : [],
    featureUsage: Object.entries(eventTotals)
        .filter(([event]) => PRODUCT_USAGE_EVENTS.has(event))
        .map(([event, count]) => ({ event, count: Number(count ?? 0) }))
        .sort((a, b) => b.count - a.count),
    topEntryPages: Array.isArray(behavioral.top_entries) ? behavioral.top_entries.map((item: any) => ({ value: String(item.name), count: Number(item.value ?? 0) })) : [],
    topReferrers: Array.isArray(behavioral.top_referrers) ? behavioral.top_referrers.map((item: any) => ({ value: String(item.name), count: Number(item.value ?? 0) })) : [],
    };
};

export const api = {
    preferences: {
        getAll: async (): Promise<Record<string, unknown>> => {
            const data: unknown = await fetchApi('/users/me/preferences', { headers: getHeaders() });
            if (typeof data !== 'object' || data === null || Array.isArray(data)) {
                throw new Error('Malformed preferences response');
            }
            return data as Record<string, unknown>;
        },
        put: async (namespace: string, value: unknown): Promise<void> => {
            await fetchApi(`/users/me/preferences/${encodeURIComponent(namespace)}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(value),
            });
        },
    },

    ports: {
        list: async (): Promise<Port[]> => {
            const res = await fetchWithTimeout(`${API_URL}/ports`, { headers: getHeaders() });
            const data = await handleResponse(res);
            return data.map(mapPortResponse);
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
           console.warn("Vessel status update not strictly implemented in backend yet");
           const res = await fetchWithTimeout(`${API_URL}/vessels/${id}`, { headers: getHeaders() });
           return handleResponse(res);
        }
    },

    compliance: {
        fleet: async () => {
            const res = await fetchWithTimeout(`${API_URL}/compliance/fleet`, { headers: getHeaders() });
            return handleResponse(res);
        },
        vesselScore: async (vesselId: string) => {
            const res = await fetchWithTimeout(`${API_URL}/compliance/vessels/${vesselId}/score`, { headers: getHeaders() });
            return handleResponse(res);
        },
        scenario: async (vesselId: string, fuelMix: Record<string, string>, year: number = 2026) => {
            const res = await fetchWithTimeout(`${API_URL}/compliance/scenario`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ vessel_id: vesselId, fuel_mix: fuelMix, year }),
            }, 30000);
            return handleResponse(res);
        },
        pricingOverlay: async (orderIds: string[]): Promise<PricingOverlayResponse> => {
            const res = await fetchWithTimeout(`${API_URL}/compliance/pricing-overlay`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ order_ids: orderIds }),
            });
            return handleResponse(res);
        },
        fuels: async () => {
            const res = await fetchWithTimeout(`${API_URL}/compliance/fuels`);
            return handleResponse(res);
        },
    },

    inventory: {
        list: async (): Promise<InventoryItem[]> => {
            const res = await fetchWithTimeout(`${API_URL}/inventory`, { headers: getHeaders() });
            const data = await handleResponse(res);
            return data.map((item: any) => {
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
                    portName: item.port_id?.split('-')[1]?.toUpperCase() || item.port_id,
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
            }, 30000);
            return handleResponse(res);
        },
        update: async (itemId: string, data: any): Promise<any> => {
            const res = await fetchWithTimeout(`${API_URL}/inventory/${itemId}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify(data)
            }, 30000);
            return handleResponse(res);
        },
        delete: async (itemId: string): Promise<void> => {
            const res = await fetchWithTimeout(`${API_URL}/inventory/${itemId}`, {
                method: 'DELETE',
                headers: getHeaders()
            }, 30000);
            if (!res.ok) {
                const error = await res.text();
                throw new Error(error || "Failed to delete inventory item");
            }
        },
        add: async (item: Omit<InventoryItem, 'id'>): Promise<InventoryItem> => {
            const payload = {
                port_id: item.portId,
                fuel_type: item.productName,
                product_name: item.productName,
                current_stock_mt: item.currentStock,
                incoming_stock_mt: item.incomingStock,
                price_per_mt_usd: item.pricePerMt
            };
            const res = await fetchWithTimeout(`${API_URL}/inventory`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            }, 30000);
            const data = await handleResponse(res);
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
            }, 30000);
            return handleResponse(res);
        },
        markAllRead: async (): Promise<any> => {
            const res = await fetchWithTimeout(`${API_URL}/notifications/read-all`, {
                method: 'PATCH',
                headers: getHeaders()
            }, 30000);
            return handleResponse(res);
        }
    },

    catalog: {
        products: async (): Promise<Product[]> => {
            return fetchApi('/catalog/products', { headers: getHeaders() });
        },
        deliveryPoints: async (): Promise<DeliveryPoint[]> => {
            return fetchApi('/catalog/delivery-points', { headers: getHeaders() });
        },
    },

    orderbook: {
        listWithCI: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; side?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.side) searchParams.append('side', params.side);
            const query = searchParams.toString();
            return fetchApi(`/orderbook/with-ci${query ? `?${query}` : ''}`);
        },
        list: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; side?: string; availability?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.side) searchParams.append('side', params.side);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            const query = searchParams.toString();
            return fetchApi(`/orderbook${query ? `?${query}` : ''}`);
        },
        // Backward-compatible: returns array (extracts .items from paginated response)
        listBids: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; availability?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            searchParams.append('limit', '100');
            const res = await fetchApi(`/orderbook/bids?${searchParams.toString()}`);
            return res.items ?? res;
        },
        // Paginated: returns { items, total, skip, limit }
        listBidsPaged: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; availability?: string; skip?: number; limit?: number }): Promise<PaginatedResult<any>> => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            searchParams.append('skip', String(params?.skip ?? 0));
            searchParams.append('limit', String(params?.limit ?? 20));
            return fetchApi(`/orderbook/bids?${searchParams.toString()}`);
        },
        // Backward-compatible: returns array
        listAsks: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; availability?: string }) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            searchParams.append('limit', '100');
            const res = await fetchApi(`/orderbook/asks?${searchParams.toString()}`);
            return res.items ?? res;
        },
        // Paginated: returns { items, total, skip, limit }
        listAsksPaged: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; availability?: string; skip?: number; limit?: number }): Promise<PaginatedResult<any>> => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            searchParams.append('skip', String(params?.skip ?? 0));
            searchParams.append('limit', String(params?.limit ?? 20));
            return fetchApi(`/orderbook/asks?${searchParams.toString()}`);
        },
        myOrders: async () => {
            return fetchApi('/orderbook/my', { headers: getHeaders() });
        },
        create: async (data: {
            side: string;
            product_id: string;
            delivery_point_id?: string;
            quantity_mt: number;
            price_per_mt_usd: number;
            availability_window: string;
            is_anonymous?: boolean;
            delivery_window_start?: string;
            delivery_window_end?: string;
            expires_at?: string;
        }) => {
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

    prices: {
        getSummaries: async (params?: { market_product?: string; product_id?: string; delivery_point_id?: string; availability_window?: string; fuel_type?: string; region?: string; hours?: number }): Promise<PriceDiscoveryResponse> => {
            const searchParams = new URLSearchParams();
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.product_id) searchParams.append('product_id', params.product_id);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.availability_window) searchParams.append('availability_window', params.availability_window);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.region) searchParams.append('region', params.region);
            if (params?.hours) searchParams.append('hours', String(params.hours));
            const query = searchParams.toString();
            return fetchApi(`/prices${query ? `?${query}` : ''}`);
        },
        getReference: async (params?: { market_product?: string; product_id?: string; delivery_point_id?: string; availability_window?: string; fuel_type?: string; region?: string; visibility?: 'internal' | 'external'; date_from?: string; date_to?: string }): Promise<{ prices: Array<{ fuel_type: string; region: string; vwap_usd: number; total_volume_mt: number; trade_count: number; date: string; visibility: string }>; generated_at: string }> => {
            const searchParams = new URLSearchParams();
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.product_id) searchParams.append('product_id', params.product_id);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.availability_window) searchParams.append('availability_window', params.availability_window);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.region) searchParams.append('region', params.region);
            if (params?.visibility) searchParams.append('visibility', params.visibility);
            if (params?.date_from) searchParams.append('date_from', params.date_from);
            if (params?.date_to) searchParams.append('date_to', params.date_to);
            const query = searchParams.toString();
            return fetchApi(`/prices/reference${query ? `?${query}` : ''}`);
        },
    },

    trades: {
        initiate: async (data: { order_id: string; quantity_mt: number }) => {
            return fetchApi('/trades/', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
        },
        // Backward-compatible: returns array
        myTrades: async () => {
            const res = await fetchApi('/trades/my', { headers: getHeaders() });
            return res.items ?? res;
        },
        // Paginated: returns { items, total, skip, limit }
        myTradesPaged: async (params?: { skip?: number; limit?: number }): Promise<PaginatedResult<any>> => {
            const searchParams = new URLSearchParams();
            searchParams.append('skip', String(params?.skip ?? 0));
            searchParams.append('limit', String(params?.limit ?? 20));
            return fetchApi(`/trades/my?${searchParams.toString()}`, { headers: getHeaders() });
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

    producers: {
        list: async (params?: {
            fuel_type?: string;
            country?: string;
            status?: string;
            cod_year_min?: number;
            cod_year_max?: number;
        }): Promise<import('../types').ProducerProject[]> => {
            const searchParams = new URLSearchParams();
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.country) searchParams.append('country', params.country);
            if (params?.status) searchParams.append('status', params.status);
            if (params?.cod_year_min) searchParams.append('cod_year_min', String(params.cod_year_min));
            if (params?.cod_year_max) searchParams.append('cod_year_max', String(params.cod_year_max));
            const query = searchParams.toString();
            return fetchApi(`/producers${query ? `?${query}` : ''}`);
        },
    },

    availability: {
        list: async (params?: { fuel_type?: string }): Promise<import('../types').PortFuelAvailability[]> => {
            const searchParams = new URLSearchParams();
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            const query = searchParams.toString();
            return fetchApi(`/availability${query ? `?${query}` : ''}`);
        },
    },

    demand: {
        signals: async (params?: { fuel_type?: string; region?: string }): Promise<any[]> => {
            const searchParams = new URLSearchParams();
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.region) searchParams.append('region', params.region);
            const query = searchParams.toString();
            return fetchApi(`/demand${query ? `?${query}` : ''}`);
        },
    },

    matchmaking: {
        suggestions: async (): Promise<import('../types').MatchSuggestion[]> => {
            return fetchApi('/matchmaking/suggestions', { headers: getHeaders() });
        },
        dismiss: async (suggestionId: string) => {
            return fetchApi(`/matchmaking/suggestions/${suggestionId}/dismiss`, {
                method: 'PATCH',
                headers: getHeaders(),
            });
        },
    },

    admin: {
        overview: async () => {
            return fetchApi('/admin/analytics/overview', { headers: getHeaders() });
        },
        users: async (query?: string) => {
            return fetchApi(`/admin/analytics/users${query ? `?${query}` : ''}`, { headers: getHeaders() });
        },
        approveUser: async (userId: string) => {
            return fetchApi(`/auth/approve/${userId}`, {
                method: 'PUT',
                headers: getHeaders(),
            });
        },
        rejectUser: async (userId: string) => {
            return fetchApi(`/admin/analytics/users/${userId}/reject`, {
                method: 'PUT',
                headers: getHeaders(),
            });
        },
        daily: async (days: number = 30) => {
            return fetchApi(`/admin/analytics/daily?days=${days}`, { headers: getHeaders() });
        },
        productUsage: async (days: ProductUsagePeriod): Promise<ProductUsageResponse> => {
            const data = await fetchApi(`/admin/analytics/product-usage?days=${days}`, { headers: getHeaders() });
            return mapProductUsageResponse(data);
        },
        auditLogs: async (params?: { action?: string; limit?: number }) => {
            const searchParams = new URLSearchParams();
            if (params?.action) searchParams.append('action', params.action);
            if (params?.limit) searchParams.append('limit', String(params.limit));
            const query = searchParams.toString();
            return fetchApi(`/admin/audit-logs${query ? `?${query}` : ''}`, { headers: getHeaders() });
        },
        commissionSummary: async () => {
            return fetchApi('/orders/admin/commissions/summary', { headers: getHeaders() });
        },
    },

    curves: {
        forward: async (params: { product_id: string; delivery_point_id?: string }): Promise<import('../types').ForwardCurveResponse> => {
            const searchParams = new URLSearchParams();
            searchParams.append('product_id', params.product_id);
            if (params.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            return fetchApi(`/curves/forward?${searchParams.toString()}`);
        },
        board: async (params?: { availability_window?: string; focus_market_product?: string; focus_delivery_point_id?: string }): Promise<import('../types').ForwardCurveBoardResponse> => {
            const searchParams = new URLSearchParams();
            if (params?.availability_window) searchParams.append('availability_window', params.availability_window);
            if (params?.focus_market_product) searchParams.append('focus_market_product', params.focus_market_product);
            if (params?.focus_delivery_point_id) searchParams.append('focus_delivery_point_id', params.focus_delivery_point_id);
            const query = searchParams.toString();
            return fetchApi(`/curves/forward/board${query ? `?${query}` : ''}`);
        },
        table: async (params?: { windows?: string[] }): Promise<import('../types').ForwardCurveTableResponse> => {
            const searchParams = new URLSearchParams();
            params?.windows?.forEach(window => {
                if (window) searchParams.append('windows', window);
            });
            const query = searchParams.toString();
            return fetchApi(`/curves/forward/table${query ? `?${query}` : ''}`);
        },
        slice: async (params: {
            market_product: string;
            delivery_point_id: string;
            availability_window: string;
        }): Promise<import('../types').ForwardCurveSliceResponse> => {
            const searchParams = new URLSearchParams();
            searchParams.append('market_product', params.market_product);
            searchParams.append('delivery_point_id', params.delivery_point_id);
            searchParams.append('availability_window', params.availability_window);
            return fetchApi(`/curves/forward/slice?${searchParams.toString()}`);
        },
        exportCsvUrl: (product_id: string, delivery_point_id?: string): string => {
            const searchParams = new URLSearchParams();
            searchParams.append('product_id', product_id);
            if (delivery_point_id) searchParams.append('delivery_point_id', delivery_point_id);
            searchParams.append('format', 'csv');
            return `${API_URL}/curves/forward/export?${searchParams.toString()}`;
        },
    },

    alerts: {
        list: async (): Promise<import('../types').PriceAlert[]> => {
            return fetchApi('/alerts', { headers: getHeaders() });
        },
        create: async (data: {
            product_id: string;
            delivery_point_id?: string;
            direction: 'above' | 'below';
            threshold_usd: number;
        }): Promise<import('../types').PriceAlert> => {
            return fetchApi('/alerts', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
        },
        delete: async (alertId: string): Promise<void> => {
            const res = await fetchWithTimeout(`${API_URL}/alerts/${alertId}`, {
                method: 'DELETE',
                headers: getHeaders(),
            }, 30000);
            if (!res.ok) throw new Error(await res.text() || 'Failed to delete alert');
        },
    },

    subscriptions: {
        me: async (): Promise<import('../types').Subscription> => {
            return fetchApi('/subscriptions/me', { headers: getHeaders() });
        },
    },

    fleetIntelligence: {
        get: async (): Promise<{ entries: Array<{ fuel: string; ordered_vessels: number; delivered_vessels: number; avg_consumption_mt: number; color: string }>; last_updated: string; sources: string[] }> => {
            return fetchApi('/fleet-intelligence', { headers: getHeaders() });
        },
    },

    rfq: {
        create: async (data: { product_id: string; delivery_point_id?: string; quantity_mt: number; target_price_per_mt?: number; availability_window?: string; notes?: string; is_anonymous?: boolean; expires_in_hours?: number }) => {
            return fetchApi('/rfq', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        },
        list: async (params?: { status?: string; skip?: number; limit?: number }) => {
            const sp = new URLSearchParams();
            if (params?.status) sp.append('status', params.status);
            sp.append('skip', String(params?.skip ?? 0));
            sp.append('limit', String(params?.limit ?? 20));
            return fetchApi(`/rfq?${sp.toString()}`, { headers: getHeaders() });
        },
        get: async (id: string) => fetchApi(`/rfq/${id}`, { headers: getHeaders() }),
        quote: async (rfqId: string, data: { price_per_mt_usd: number; notes?: string }) => {
            return fetchApi(`/rfq/${rfqId}/quote`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        },
        accept: async (rfqId: string, quoteId: string) => {
            return fetchApi(`/rfq/${rfqId}/accept/${quoteId}`, { method: 'POST', headers: getHeaders() });
        },
        cancel: async (rfqId: string) => {
            return fetchApi(`/rfq/${rfqId}/cancel`, { method: 'POST', headers: getHeaders() });
        },
        decline: async (rfqId: string, quoteId: string) => {
            return fetchApi(`/rfq/${rfqId}/quotes/${quoteId}/decline`, { method: 'POST', headers: getHeaders() });
        },
        counter: async (rfqId: string, quoteId: string, data: { counter_price_per_mt: number }) => {
            return fetchApi(`/rfq/${rfqId}/quotes/${quoteId}/counter`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        },
        revise: async (rfqId: string, quoteId: string, data: { price_per_mt_usd: number }) => {
            return fetchApi(`/rfq/${rfqId}/quotes/${quoteId}`, { method: 'PATCH', headers: getHeaders(), body: JSON.stringify(data) });
        },
        withdraw: async (rfqId: string, quoteId: string) => {
            return fetchApi(`/rfq/${rfqId}/quotes/${quoteId}/withdraw`, { method: 'POST', headers: getHeaders() });
        },
        sellerAccept: async (rfqId: string, quoteId: string) => {
            return fetchApi(`/rfq/${rfqId}/quotes/${quoteId}/seller-accept`, { method: 'POST', headers: getHeaders() });
        },
    },

    tradeTape: {
        list: async (params?: { fuel_type?: string; market_product?: string; delivery_point_id?: string; region?: string; availability_window?: string; limit?: number; skip?: number }) => {
            const sp = new URLSearchParams();
            if (params?.fuel_type) sp.append('fuel_type', params.fuel_type);
            if (params?.market_product) sp.append('market_product', params.market_product);
            if (params?.delivery_point_id) sp.append('delivery_point_id', params.delivery_point_id);
            if (params?.region) sp.append('region', params.region);
            if (params?.availability_window) sp.append('availability_window', params.availability_window);
            sp.append('limit', String(params?.limit ?? 20));
            sp.append('skip', String(params?.skip ?? 0));
            return fetchApi(`/trade-tape?${sp.toString()}`);
        },
    },

    watchlists: {
        list: async () => fetchApi('/watchlists', { headers: getHeaders() }),
        getRadar: async (): Promise<import('../types').WatchlistSummary> => {
            return fetchApi('/watchlists/me', { headers: getHeaders() });
        },
        create: async (name: string) => fetchApi('/watchlists', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name }) }),
        createSliceTarget: async (watchlistId: string, data: { market_product_code: MarketProduct; delivery_point_id: string; availability_window_code: string }): Promise<import('../types').WatchlistTarget> => {
            return fetchApi(`/watchlists/${watchlistId}/targets`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ target_type: 'SLICE', ...data }),
            });
        },
        createPinTarget: async (watchlistId: string, orderId: string): Promise<import('../types').WatchlistTarget> => {
            return fetchApi(`/watchlists/${watchlistId}/targets`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ target_type: 'PIN', order_id: orderId }),
            });
        },
        removeTarget: async (watchlistId: string, targetId: string) => {
            return fetchApi(`/watchlists/${watchlistId}/targets/${targetId}`, { method: 'DELETE', headers: getHeaders() });
        },
        listEvents: async (watchlistId: string, params?: { cursor?: string; limit?: number }): Promise<import('../types').WatchlistEventsPage> => {
            const sp = new URLSearchParams();
            if (params?.cursor) sp.append('cursor', params.cursor);
            sp.append('limit', String(params?.limit ?? 20));
            return fetchApi(`/watchlists/${watchlistId}/events?${sp.toString()}`, { headers: getHeaders() });
        },
        markEventRead: async (watchlistId: string, eventId: string): Promise<import('../types').WatchlistEvent> => {
            return fetchApi(`/watchlists/${watchlistId}/events/${eventId}`, { method: 'PATCH', headers: getHeaders() });
        },
        addEntry: async (watchlistId: string, data: { product_id: string; delivery_point_id?: string }) => {
            return fetchApi(`/watchlists/${watchlistId}/entries`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        },
        removeEntry: async (watchlistId: string, entryId: string) => {
            return fetchApi(`/watchlists/${watchlistId}/entries/${entryId}`, { method: 'DELETE', headers: getHeaders() });
        },
        delete: async (watchlistId: string) => {
            return fetchApi(`/watchlists/${watchlistId}`, { method: 'DELETE', headers: getHeaders() });
        },
    },

    news: {
        list: async (params?: { limit?: number; category?: string; min_relevance?: number }): Promise<any[]> => {
            const searchParams = new URLSearchParams();
            if (params?.limit) searchParams.append('limit', String(params.limit));
            if (params?.category) searchParams.append('category', params.category);
            if (params?.min_relevance) searchParams.append('min_relevance', String(params.min_relevance));
            const query = searchParams.toString();
            return fetchApi(`/news${query ? `?${query}` : ''}`);
        },
    },
};
