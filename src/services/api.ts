import { Port, Vessel, InventoryItem, Notification, PriceDiscoveryResponse, PricingOverlayResponse, Product, DeliveryPoint, MarketProduct } from '../types';
import type { AggregatedOrderbook, MarketDemoStatus, MarketScope, MarketSourceKind } from '../types';
import {
    AcquisitionResponse,
    ActivationResponse,
    EngagementResponse,
    MarketplaceResponse,
    OverviewResponse as ProductAnalyticsOverviewResponse,
    ProductAnalyticsQueryParams,
    ReliabilityResponse,
    RetentionResponse,
} from '../types/productAnalytics';
import { reliability } from './analytics';
import { getAccessToken, getAuthGeneration, refreshAccessToken } from './authToken';
import { isBackendUnavailableStatus } from './backendAvailability';
import { API_URL } from './config';
import {
    getMarketSupportContextId,
    MARKET_SUPPORT_CONTEXT_HEADER,
} from './marketSupportContextStore';
import { cachedRead, invalidateReadCache, READ_CACHE_TTL_MS } from './readCache';
import type {
    MarketSupportCapability,
    MarketSupportEntry,
    MarketSupportSession,
    MarketSupportStartInput,
} from '../types/marketSupport';

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

/**
 * Only organization-scoped customer routes receive the context locator.
 * Admin lifecycle routes and authentication requests must never carry it.
 * This allowlist is deliberately narrow so a newly-added mutation cannot
 * become available in support mode by accident.
 */
export const isMarketSupportScopedRequest = (path: string, method = 'GET'): boolean => {
    const route = path.split('?')[0];
    if (route.startsWith('/auth/') || route.startsWith('/admin/')) return false;
    const normalizedMethod = method.toUpperCase();
    if (route === '/orderbook' && (normalizedMethod === 'GET' || normalizedMethod === 'POST')) return true;
    if (route.startsWith('/orderbook/') && normalizedMethod === 'GET') return true;
    if (route.endsWith('/cancel') && normalizedMethod === 'POST') return true;
    if (normalizedMethod === 'GET' && (
        route.startsWith('/trades/my')
        || route === '/trades/summary'
        || route.startsWith('/inventory')
        || route.startsWith('/notifications')
        || route.startsWith('/catalog')
    )) return true;
    return false;
};

const isMarketSupportLifecycleRequest = (path: string, method: string): boolean => {
    const route = path.split('?')[0];
    const normalizedMethod = method.toUpperCase();
    return normalizedMethod === 'POST'
        && (route === '/admin/market-support/contexts'
            || /^\/admin\/market-support\/contexts\/[^/]+\/exit$/.test(route));
};

export const isMarketSupportAllowedMutation = (path: string, method = 'GET'): boolean =>
    isMarketSupportScopedRequest(path, method) || isMarketSupportLifecycleRequest(path, method);

const isStateChangingGet = (path: string, method: string): boolean => {
    if (method.toUpperCase() !== 'GET') return false;
    const route = path.split('?')[0];
    return route === '/watchlists/me'
        || route === '/referrals/my-code'
        || route === '/auth/verify-email';
};

export class ApiError extends Error {
    readonly status: number;
    readonly code: string | null;
    readonly details: unknown;

    constructor(message: string, status: number, code: string | null = null, details?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export class MarketSupportContextChangedError extends Error {
    readonly code = 'MARKET_SUPPORT_CONTEXT_CHANGED';

    constructor() {
        super('The assisted workspace changed while refreshing. The request was not retried.');
        this.name = 'AbortError';
    }
}

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

const handleResponse = async (res: Response, contextId?: string | null) => {
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
        let errorJson: any = null;
        try {
            errorJson = JSON.parse(errorText);
        } catch {
            // Plain-text errors are still represented as typed ApiErrors below.
        }
        const detail = errorJson?.detail;
        const structuredDetail = detail && typeof detail === 'object' ? detail : errorJson;
        const code = typeof structuredDetail?.code === 'string' ? structuredDetail.code : null;
        const validationMessage = Array.isArray(detail)
            ? detail.map(item => typeof item?.msg === 'string' ? item.msg : '').filter(Boolean).join(' ')
            : '';
        const message = typeof detail === 'string'
            ? detail
            : validationMessage || structuredDetail?.message || errorJson?.message || errorText || res.statusText;
        if (code && /MARKET_SUPPORT_CONTEXT_(INVALID|EXPIRED|NOT_FOUND)|CONTEXT_(INVALID|EXPIRED|NOT_FOUND)/.test(code)) {
            window.dispatchEvent(new CustomEvent('verdaxis:market-support-context-invalidated', {
                detail: { reason: 'expired', code, status: res.status, ...(contextId ? { contextId } : {}) },
            }));
        }
        throw new ApiError(message, res.status, code, structuredDetail);
    }
    if (res.status === 204 || res.status === 205) return undefined;
    return res.json();
};

// Fetch with timeout to prevent indefinite loading spinners.
// An abort initiated by the CALLER re-throws as a recognizable AbortError so
// stale-request cancellation never renders an error state; only the internal
// timeout produces the user-facing timeout message. Listeners and timers are
// always removed.
const fetchWithTimeout = (url: string, options?: RequestInit, timeoutMs = 15000): Promise<Response> => {
    const controller = new AbortController();
    const externalSignal = options?.signal;
    let timedOut = false;
    const abortFromExternalSignal = () => controller.abort();
    if (externalSignal?.aborted) controller.abort();
    externalSignal?.addEventListener('abort', abortFromExternalSignal);
    const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .catch((err) => {
            if (err instanceof DOMException && err.name === 'AbortError') {
                if (externalSignal?.aborted && !timedOut) throw err;
                throw new Error('Request timed out. Please try again.');
            }
            if (err?.name === 'AbortError') {
                if (externalSignal?.aborted && !timedOut) throw err;
                throw new Error('Request timed out. Please try again.');
            }
            throw err;
        })
        .finally(() => {
            clearTimeout(timeout);
            externalSignal?.removeEventListener('abort', abortFromExternalSignal);
        });
};

export const isAbortError = (error: unknown): boolean =>
    error instanceof DOMException
        ? error.name === 'AbortError'
        : (error as { name?: string } | null)?.name === 'AbortError';

// Helper to fetch from API and handle response
const fetchApi = async (path: string, options?: RequestInit) => {
    // Mutations get a longer timeout (30s) since they must not be silently dropped
    const isMutation = options?.method && options.method !== 'GET';
    const timeout = isMutation ? 30000 : 15000;
    const url = `${API_URL}${path}`;
    const initialHeaders = withAuthHeader(options?.headers);
    const contextId = getMarketSupportContextId();
    const method = options?.method || 'GET';
    if (
        contextId
        && (
            isStateChangingGet(path, method)
            || (method.toUpperCase() !== 'GET' && !isMarketSupportAllowedMutation(path, method))
        )
    ) {
        throw new ApiError('This action is unavailable while acting for a supplier organization.', 403, 'MARKET_SUPPORT_MUTATION_BLOCKED');
    }
    if (contextId && isMarketSupportScopedRequest(path, options?.method || 'GET')) {
        initialHeaders.set(MARKET_SUPPORT_CONTEXT_HEADER, contextId);
    }
    const initialOptions: RequestInit = {
        ...options,
        headers: initialHeaders,
    };
    const requestGeneration = getAuthGeneration();

    let res: Response;
    try {
        res = await fetchWithTimeout(url, initialOptions, timeout);
    } catch (error) {
        // Best-effort, deduplicated telemetry; the caller's error handling
        // and the maintenance UI behavior are unchanged. Caller-initiated
        // aborts are control flow, not failures.
        if (!isAbortError(error)) reliability.reportFrontendError('network');
        throw error;
    }
    if (requestGeneration !== getAuthGeneration()) {
        throw new DOMException('Authentication session changed', 'AbortError');
    }
    if (isBackendUnavailableStatus(res.status)) {
        reliability.reportBackendUnavailable();
    }

    if (contextId && (
        res.status === 410
        || res.headers.get('X-Verdaxis-Market-Support-Context-Expired') === 'true'
    )) {
        window.dispatchEvent(new CustomEvent('verdaxis:market-support-context-invalidated', {
            detail: { reason: 'expired', contextId },
        }));
    }

    if (res.status === 401 && !shouldSkipRefresh(path)) {
        const refreshedToken = await refreshAccessToken();
        if (requestGeneration !== getAuthGeneration()) {
            throw new DOMException('Authentication session changed', 'AbortError');
        }
        if (refreshedToken) {
            if (getMarketSupportContextId() !== contextId) {
                throw new MarketSupportContextChangedError();
            }
            const retryOptions: RequestInit = {
                ...options,
                headers: withAuthHeader(options?.headers, refreshedToken),
            };
            if (contextId && isMarketSupportScopedRequest(path, options?.method || 'GET')) {
                (retryOptions.headers as Headers).set(MARKET_SUPPORT_CONTEXT_HEADER, contextId);
            }
            res = await fetchWithTimeout(url, retryOptions, timeout);
            if (contextId && (
                res.status === 410
                || res.headers.get('X-Verdaxis-Market-Support-Context-Expired') === 'true'
            )) {
                window.dispatchEvent(new CustomEvent('verdaxis:market-support-context-invalidated', {
                    detail: { reason: 'expired', status: res.status, contextId },
                }));
            }
        }
    }

    const responseBody = await handleResponse(res, contextId);
    if (requestGeneration !== getAuthGeneration()) {
        throw new DOMException('Authentication session changed', 'AbortError');
    }
    return responseBody;
};

type ReadCacheOptions = { force?: boolean };

const readApi = <T = any>(
    resourceKey: string,
    path: string,
    freshness: keyof typeof READ_CACHE_TTL_MS,
    scope: 'public' | 'private' = 'private',
    options?: RequestInit,
    cacheOptions?: ReadCacheOptions,
): Promise<T> => cachedRead(
    resourceKey,
    scope,
    READ_CACHE_TTL_MS[freshness],
    () => fetchApi(path, options) as Promise<T>,
    cacheOptions?.force,
);

const invalidateMarketReads = () => invalidateReadCache('orderbook:', 'prices:', 'curves:', 'watchlists:');
const invalidateTradeReads = () => invalidateReadCache('trades:');
const invalidateTradeTransitionReads = () => invalidateReadCache('trades:', 'watchlists:');
const invalidateWatchlistReads = () => invalidateReadCache('watchlists:');
const invalidateTradeExecutionReads = () => invalidateReadCache('orderbook:', 'prices:', 'curves:', 'watchlists:', 'trades:');

const mutateApi = async <T = any>(invalidate: () => void, path: string, options: RequestInit): Promise<T> => {
    invalidate();
    try {
        return await fetchApi(path, options) as T;
    } finally {
        invalidate();
    }
};

// Paginated response shape from backend
export interface PaginatedResult<T> {
    items: T[];
    total: number;
    skip: number;
    limit: number;
}

export interface TradeSummary {
    total_count: number;
    action_required_count: number;
    awaiting_counterparty_count: number;
    confirmed_count: number;
}

export interface OrderbookProductCounts {
    counts: Record<MarketProduct, number>;
    total: number;
}

export interface MapRecentAsk {
    product_id: string;
    product_name: string;
    market_product: MarketProduct | string;
    fuel_type: string;
    delivery_point_id: string;
    delivery_point_name: string;
    region: string;
    price_per_mt_usd: number | string;
    remaining_quantity_mt: number | string;
    created_at: string;
    evidence_class: string;
    source_kind: MarketSourceKind;
    scope: MarketScope;
    demo_status: MarketDemoStatus;
}

export interface MapOrderbookSummary {
    groups: AggregatedOrderbook[];
    recent_asks: MapRecentAsk[];
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


// Product Analytics query serialization: defaults are omitted so cache keys
// and URLs stay canonical.
const productAnalyticsSearch = (query: ProductAnalyticsQueryParams): string => {
    const params = new URLSearchParams();
    params.set('start', query.start);
    params.set('end', query.end);
    if (query.compare === false) params.set('compare', 'false');
    if (query.audience && query.audience !== 'ALL') params.set('audience', query.audience);
    if (query.activity && query.activity !== 'LIVE') params.set('activity', query.activity);
    if (query.product_id) params.set('product_id', query.product_id);
    if (query.delivery_point_id) params.set('delivery_point_id', query.delivery_point_id);
    if (query.availability_window) params.set('availability_window', query.availability_window);
    return params.toString();
};

const productAnalyticsTab = <T>(tab: string) =>
    (query: ProductAnalyticsQueryParams, signal?: AbortSignal): Promise<T> =>
        fetchApi(
            `/admin/analytics/product-analytics/${tab}?${productAnalyticsSearch(query)}`,
            { signal },
        ) as Promise<T>;

export interface AdminFeedbackEntry {
    id: string;
    created_at: string;
    message: string;
    page: string | null;
    user_email: string | null;
    user_name: string | null;
    org_name: string | null;
}

export interface AdminFeedbackResponse {
    items: AdminFeedbackEntry[];
    total: number;
}

export interface OnboardingAttentionItem {
    email: string;
    name: string | null;
    role: string | null;
    stage: string;
    since: string;
    organization_name: string | null;
    last_login: string | null;
}

export interface OnboardingAttentionResponse {
    items: OnboardingAttentionItem[];
    generated_at: string;
}

export interface AdminInvitationOrganization {
    id: string;
    name: string;
    domain: string | null;
    type: string;
    provenance: 'REAL' | 'UNKNOWN';
}

interface AdminInvitationBaseInput {
    email: string;
    first_name: string;
    last_name: string | null;
    role: 'BUYER' | 'SUPPLIER';
}

export type AdminInvitationOrganizationType =
    | 'SHIPPING_LINE'
    | 'SHIP_MANAGER'
    | 'FUEL_BUYER'
    | 'CHARTERER'
    | 'FUEL_SUPPLIER';

export interface AdminInvitationNewOrganization {
    name: string;
    type: AdminInvitationOrganizationType;
    country_code: string;
    tax_id: string | null;
}

export type AdminInvitationInput = AdminInvitationBaseInput & (
    | { organization_id: string; new_organization?: never }
    | { organization_id?: never; new_organization: AdminInvitationNewOrganization }
);

export interface AdminInvitationResponse {
    user_id: string;
    email: string;
    role: 'BUYER' | 'SUPPLIER';
    organization_name: string;
    organization_created: boolean;
    acceptance_url: string;
    expires_at: string;
    reissued: boolean;
}

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
            return cachedRead('ports:list', 'public', READ_CACHE_TTL_MS.reference, async () => {
                const res = await fetchWithTimeout(`${API_URL}/ports`, { headers: getHeaders() });
                const data = await handleResponse(res);
                return data.map(mapPortResponse);
            });
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

    productAnalytics: {
        overview: productAnalyticsTab<ProductAnalyticsOverviewResponse>('overview'),
        acquisition: productAnalyticsTab<AcquisitionResponse>('acquisition'),
        activation: productAnalyticsTab<ActivationResponse>('activation'),
        engagement: productAnalyticsTab<EngagementResponse>('engagement'),
        marketplace: productAnalyticsTab<MarketplaceResponse>('marketplace'),
        retention: productAnalyticsTab<RetentionResponse>('retention'),
        reliability: productAnalyticsTab<ReliabilityResponse>('reliability'),
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
        products: async (cacheOptions?: ReadCacheOptions): Promise<Product[]> => {
            return readApi('catalog:products', '/catalog/products', 'reference', 'private', { headers: getHeaders() }, cacheOptions);
        },
        deliveryPoints: async (cacheOptions?: ReadCacheOptions): Promise<DeliveryPoint[]> => {
            return readApi('catalog:delivery-points', '/catalog/delivery-points', 'reference', 'private', { headers: getHeaders() }, cacheOptions);
        },
    },

    orderbook: {
        listWithCI: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; side?: string }, cacheOptions?: ReadCacheOptions) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.side) searchParams.append('side', params.side);
            const query = searchParams.toString();
            const path = `/orderbook/with-ci${query ? `?${query}` : ''}`;
            return readApi(`orderbook:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
        list: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; side?: string; availability?: string }, cacheOptions?: ReadCacheOptions) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.side) searchParams.append('side', params.side);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            const query = searchParams.toString();
            const path = `/orderbook${query ? `?${query}` : ''}`;
            return readApi(`orderbook:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
        // Backward-compatible: returns array (extracts .items from paginated response)
        listBids: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; availability?: string }, cacheOptions?: ReadCacheOptions) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            searchParams.append('limit', '100');
            const path = `/orderbook/bids?${searchParams.toString()}`;
            const res: any = await readApi(`orderbook:${path}`, path, 'market', 'private', undefined, cacheOptions);
            return res.items ?? res;
        },
        // Paginated: returns { items, total, skip, limit }
        listBidsPaged: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; availability?: string; sort_by?: 'price_asc' | 'price_desc' | 'quantity_desc' | 'newest'; skip?: number; limit?: number }, cacheOptions?: ReadCacheOptions): Promise<PaginatedResult<any>> => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
            searchParams.append('skip', String(params?.skip ?? 0));
            searchParams.append('limit', String(params?.limit ?? 20));
            const path = `/orderbook/bids?${searchParams.toString()}`;
            return readApi(`orderbook:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
        // Backward-compatible: returns array
        listAsks: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; availability?: string }, cacheOptions?: ReadCacheOptions) => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            searchParams.append('limit', '100');
            const path = `/orderbook/asks?${searchParams.toString()}`;
            const res: any = await readApi(`orderbook:${path}`, path, 'market', 'private', undefined, cacheOptions);
            return res.items ?? res;
        },
        // Paginated: returns { items, total, skip, limit }
        listAsksPaged: async (params?: { region?: string; delivery_point_id?: string; fuel_type?: string; market_product?: string; availability?: string; sort_by?: 'price_asc' | 'price_desc' | 'quantity_desc' | 'newest'; skip?: number; limit?: number }, cacheOptions?: ReadCacheOptions): Promise<PaginatedResult<any>> => {
            const searchParams = new URLSearchParams();
            if (params?.region) searchParams.append('region', params.region);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.availability) searchParams.append('availability_window', params.availability);
            if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
            searchParams.append('skip', String(params?.skip ?? 0));
            searchParams.append('limit', String(params?.limit ?? 20));
            const path = `/orderbook/asks?${searchParams.toString()}`;
            return readApi(`orderbook:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
        myOrders: async (cacheOptions?: ReadCacheOptions) => {
            const response: any = await readApi('orderbook:my', '/orderbook/my', 'private', 'private', { headers: getHeaders() }, cacheOptions);
            return response.items ?? response;
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
        } & { idempotency_key?: string }) => {
            const { idempotency_key: idempotencyKey, ...requestData } = data;
            return mutateApi(invalidateTradeExecutionReads, '/orderbook', {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
                },
                body: JSON.stringify(requestData),
            });
        },
        update: async (id: string, data: any) => {
            return mutateApi(invalidateTradeExecutionReads, `/orderbook/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
        },
        cancel: async (id: string, options?: { reason?: string; etag?: string }) => {
            if (getMarketSupportContextId() && !options?.etag) {
                throw new ApiError(
                    'A current listing version is required before cancelling in the assisted workspace.',
                    428,
                    'MARKET_SUPPORT_ETAG_REQUIRED',
                );
            }
            return mutateApi(invalidateMarketReads, `/orderbook/${id}/cancel`, {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    ...(options?.etag ? { 'If-Match': options.etag } : {}),
                },
                body: JSON.stringify({ reason: options?.reason?.trim() || 'User requested cancellation' }),
            });
        },
        aggregated: async (cacheOptions?: ReadCacheOptions): Promise<AggregatedOrderbook[]> => {
            return readApi('orderbook:aggregated', '/orderbook/aggregated', 'market', 'private', undefined, cacheOptions);
        },
        regions: async () => {
            return readApi('orderbook:regions', '/orderbook/regions', 'reference');
        },
        fuelTypes: async () => {
            return readApi('orderbook:fuel-types', '/orderbook/fuel-types', 'reference');
        },
        productCounts: async (params: {
            side: 'ASK' | 'BID';
            delivery_point_id?: string;
            region?: string;
            availability_window?: string;
            include_off_spec?: boolean;
        }, cacheOptions?: ReadCacheOptions): Promise<OrderbookProductCounts> => {
            const searchParams = new URLSearchParams({ side: params.side });
            if (params.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params.region) searchParams.append('region', params.region);
            if (params.availability_window) searchParams.append('availability_window', params.availability_window);
            if (params.include_off_spec !== undefined) searchParams.append('include_off_spec', String(params.include_off_spec));
            const path = `/orderbook/product-counts?${searchParams.toString()}`;
            return readApi(`orderbook:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
        mapSummary: async (cacheOptions?: ReadCacheOptions): Promise<MapOrderbookSummary> => {
            const path = '/orderbook/map-summary';
            return readApi(`orderbook:${path}`, path, 'market', 'public', undefined, cacheOptions);
        },
    },

    prices: {
        getSummaries: async (params?: { market_product?: string; product_id?: string; delivery_point_id?: string; availability_window?: string; fuel_type?: string; region?: string; hours?: number }, cacheOptions?: ReadCacheOptions): Promise<PriceDiscoveryResponse> => {
            const searchParams = new URLSearchParams();
            if (params?.market_product) searchParams.append('market_product', params.market_product);
            if (params?.product_id) searchParams.append('product_id', params.product_id);
            if (params?.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            if (params?.availability_window) searchParams.append('availability_window', params.availability_window);
            if (params?.fuel_type) searchParams.append('fuel_type', params.fuel_type);
            if (params?.region) searchParams.append('region', params.region);
            if (params?.hours) searchParams.append('hours', String(params.hours));
            const query = searchParams.toString();
            const path = `/prices${query ? `?${query}` : ''}`;
            return readApi(`prices:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
        getReference: async (params?: { market_product?: string; product_id?: string; delivery_point_id?: string; availability_window?: string; fuel_type?: string; region?: string; visibility?: 'internal' | 'external'; date_from?: string; date_to?: string }, cacheOptions?: ReadCacheOptions): Promise<{ prices: Array<{ fuel_type: string; region: string; vwap_usd: number; total_volume_mt: number; trade_count: number; date: string; visibility: string }>; generated_at: string }> => {
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
            const path = `/prices/reference${query ? `?${query}` : ''}`;
            return readApi(`prices:${path}`, path, 'reference', 'private', undefined, cacheOptions);
        },
    },

    trades: {
        initiate: async (data: { order_id: string; quantity_mt: number } & { idempotency_key?: string }) => {
            const { idempotency_key: idempotencyKey, ...requestData } = data;
            return mutateApi(invalidateTradeExecutionReads, '/trades/', {
                method: 'POST',
                headers: {
                    ...getHeaders(),
                    ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
                },
                body: JSON.stringify(requestData),
            });
        },
        // Backward-compatible: returns array
        myTrades: async (cacheOptions?: ReadCacheOptions) => {
            const res: any = await readApi('trades:my', '/trades/my', 'private', 'private', { headers: getHeaders() }, cacheOptions);
            return res.items ?? res;
        },
        summary: async (cacheOptions?: ReadCacheOptions): Promise<TradeSummary> => {
            return readApi('trades:summary', '/trades/summary', 'private', 'private', { headers: getHeaders() }, cacheOptions);
        },
        // Paginated: returns { items, total, skip, limit }
        myTradesPaged: async (params?: {
            skip?: number;
            limit?: number;
            action_required?: boolean;
            status_group?: 'all' | 'active' | 'completed';
        }, cacheOptions?: ReadCacheOptions): Promise<PaginatedResult<any>> => {
            const searchParams = new URLSearchParams();
            searchParams.append('skip', String(params?.skip ?? 0));
            searchParams.append('limit', String(params?.limit ?? 20));
            if (params?.action_required !== undefined) {
                searchParams.append('action_required', String(params.action_required));
            }
            if (params?.status_group) {
                searchParams.append('status_group', params.status_group);
            }
            const path = `/trades/my?${searchParams.toString()}`;
            return readApi(`trades:${path}`, path, 'private', 'private', { headers: getHeaders() }, cacheOptions);
        },
        confirm: async (tradeId: string) => {
            return mutateApi(invalidateTradeExecutionReads, `/trades/${tradeId}/confirm`, {
                method: 'PUT',
                headers: getHeaders(),
            });
        },
        decline: async (tradeId: string) => {
            return mutateApi(invalidateTradeExecutionReads, `/trades/${tradeId}/decline`, {
                method: 'PUT',
                headers: getHeaders(),
            });
        },
        deliver: async (tradeId: string, data: { final_quantity_mt: number; final_price_per_mt: number }) => {
            return mutateApi(invalidateTradeTransitionReads, `/trades/${tradeId}/deliver`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
        },
        pay: async (tradeId: string) => {
            return mutateApi(invalidateTradeTransitionReads, `/trades/${tradeId}/pay`, {
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

    admin: {
        overview: async () => {
            return fetchApi('/admin/analytics/overview', { headers: getHeaders() });
        },
        users: async (query?: string) => {
            return fetchApi(`/admin/analytics/users${query ? `?${query}` : ''}`, { headers: getHeaders() });
        },
        invitationOrganizations: async (): Promise<{ items: AdminInvitationOrganization[] }> => {
            return fetchApi('/auth/admin/invitations/organizations', { headers: getHeaders() });
        },
        createInvitation: async (input: AdminInvitationInput): Promise<AdminInvitationResponse> => {
            return fetchApi('/auth/admin/invitations', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(input),
            });
        },
        reviewQueue: async (limit: number = 100) => {
            return fetchApi(`/auth/admin/review-queue?limit=${limit}`, { headers: getHeaders() });
        },
        reviewCase: async (userId: string) => {
            return fetchApi(`/auth/admin/review-queue/${userId}`, { headers: getHeaders() });
        },
        resendVerification: async (email: string) => {
            return fetchApi('/auth/resend-verification-email', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ email }),
            });
        },
        approveUser: async (userId: string) => {
            return fetchApi(`/auth/approve/${userId}`, {
                method: 'PUT',
                headers: getHeaders(),
            });
        },
        approveOrganization: async (organizationId: string) => {
            return fetchApi(`/auth/organization/${organizationId}/approve`, {
                method: 'PUT',
                headers: getHeaders(),
            });
        },
        approveOrganizationJoin: async (requestId: string) => {
            return fetchApi(`/auth/organization-joins/${requestId}/approve`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ review_note: 'Approved through admin onboarding review.' }),
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
        feedback: async (limit: number = 100, offset: number = 0): Promise<AdminFeedbackResponse> => {
            return fetchApi(`/admin/feedback?limit=${limit}&offset=${offset}`, { headers: getHeaders() });
        },
        onboardingAttention: async (): Promise<OnboardingAttentionResponse> => {
            return fetchApi('/admin/onboarding-attention', { headers: getHeaders() });
        },
    },
    feedback: {
        submit: async (message: string, page?: string | null) => {
            return fetchApi('/feedback', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ message, page: page ?? null }),
            });
        },
    },

    marketSupport: {
        capabilities: (): Promise<MarketSupportCapability[]> =>
            fetchApi('/admin/market-support/capabilities'),
        entry: async (organizationId: string): Promise<MarketSupportEntry> => {
            const raw = await fetchApi(`/admin/market-support/organizations/${organizationId}/entry`) as any;
            return {
                eligible: raw?.eligible === true,
                reason: raw?.reason ?? null,
                organization: raw?.organization,
            };
        },
        start: (input: MarketSupportStartInput): Promise<MarketSupportSession> => {
            return mutateApi(() => invalidateReadCache(), '/admin/market-support/contexts', {
                method: 'POST',
                body: JSON.stringify({
                    organization_id: input.organizationId,
                    support_reference: input.supportReference,
                    confirm_replacement: input.replaceActive ?? false,
                }),
            });
        },
        active: (): Promise<MarketSupportSession | null> =>
            fetchApi('/admin/market-support/contexts/active'),
        getContext: (contextId: string): Promise<MarketSupportSession> =>
            fetchApi(`/admin/market-support/contexts/${contextId}`),
        exit: (contextId: string): Promise<void> => {
            return mutateApi(() => invalidateReadCache(), `/admin/market-support/contexts/${contextId}/exit`, { method: 'POST' });
        },
    },

    curves: {
        forward: async (params: { product_id: string; delivery_point_id?: string }, cacheOptions?: ReadCacheOptions): Promise<import('../types').ForwardCurveResponse> => {
            const searchParams = new URLSearchParams();
            searchParams.append('product_id', params.product_id);
            if (params.delivery_point_id) searchParams.append('delivery_point_id', params.delivery_point_id);
            const path = `/curves/forward?${searchParams.toString()}`;
            return readApi(`curves:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
        board: async (params?: { availability_window?: string; focus_market_product?: string; focus_delivery_point_id?: string }, cacheOptions?: ReadCacheOptions): Promise<import('../types').ForwardCurveBoardResponse> => {
            const searchParams = new URLSearchParams();
            if (params?.availability_window) searchParams.append('availability_window', params.availability_window);
            if (params?.focus_market_product) searchParams.append('focus_market_product', params.focus_market_product);
            if (params?.focus_delivery_point_id) searchParams.append('focus_delivery_point_id', params.focus_delivery_point_id);
            const query = searchParams.toString();
            const path = `/curves/forward/board${query ? `?${query}` : ''}`;
            return readApi(`curves:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
        table: async (params?: { windows?: string[] }, cacheOptions?: ReadCacheOptions): Promise<import('../types').ForwardCurveTableResponse> => {
            const searchParams = new URLSearchParams();
            params?.windows?.forEach(window => {
                if (window) searchParams.append('windows', window);
            });
            const query = searchParams.toString();
            const path = `/curves/forward/table${query ? `?${query}` : ''}`;
            return readApi(`curves:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
        slice: async (params: {
            market_product: string;
            delivery_point_id: string;
            availability_window: string;
        }, cacheOptions?: ReadCacheOptions): Promise<import('../types').ForwardCurveSliceResponse> => {
            const searchParams = new URLSearchParams();
            searchParams.append('market_product', params.market_product);
            searchParams.append('delivery_point_id', params.delivery_point_id);
            searchParams.append('availability_window', params.availability_window);
            const path = `/curves/forward/slice?${searchParams.toString()}`;
            return readApi(`curves:${path}`, path, 'market', 'private', undefined, cacheOptions);
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
        me: async (cacheOptions?: ReadCacheOptions): Promise<import('../types').Subscription> => {
            return readApi('subscriptions:me', '/subscriptions/me', 'reference', 'private', { headers: getHeaders() }, cacheOptions);
        },
    },

    fleetIntelligence: {
        get: async (cacheOptions?: ReadCacheOptions): Promise<{ entries: Array<{ fuel: string; ordered_vessels: number; delivered_vessels: number; avg_consumption_mt: number; color: string }>; last_updated: string; sources: string[] }> => {
            return readApi('fleet-intelligence:get', '/fleet-intelligence', 'reference', 'private', { headers: getHeaders() }, cacheOptions);
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
        list: async (params?: { fuel_type?: string; market_product?: string; delivery_point_id?: string; region?: string; availability_window?: string; limit?: number; skip?: number }, cacheOptions?: ReadCacheOptions) => {
            const sp = new URLSearchParams();
            if (params?.fuel_type) sp.append('fuel_type', params.fuel_type);
            if (params?.market_product) sp.append('market_product', params.market_product);
            if (params?.delivery_point_id) sp.append('delivery_point_id', params.delivery_point_id);
            if (params?.region) sp.append('region', params.region);
            if (params?.availability_window) sp.append('availability_window', params.availability_window);
            sp.append('limit', String(params?.limit ?? 20));
            sp.append('skip', String(params?.skip ?? 0));
            const path = `/trade-tape?${sp.toString()}`;
            return readApi(`trades:${path}`, path, 'market', 'private', undefined, cacheOptions);
        },
    },

    watchlists: {
        list: async (cacheOptions?: ReadCacheOptions) => readApi('watchlists:list', '/watchlists', 'private', 'private', { headers: getHeaders() }, cacheOptions),
        getRadar: async (cacheOptions?: ReadCacheOptions): Promise<import('../types').WatchlistSummary> => {
            return readApi('watchlists:radar', '/watchlists/me', 'private', 'private', { method: 'POST', headers: getHeaders() }, cacheOptions);
        },
        create: async (name: string) => {
            return mutateApi(invalidateWatchlistReads, '/watchlists', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ name }) });
        },
        createSliceTarget: async (watchlistId: string, data: { market_product_code: MarketProduct; delivery_point_id: string; availability_window_code: string }): Promise<import('../types').WatchlistTarget> => {
            return mutateApi(invalidateWatchlistReads, `/watchlists/${watchlistId}/targets`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ target_type: 'SLICE', ...data }),
            });
        },
        createPinTarget: async (watchlistId: string, orderId: string): Promise<import('../types').WatchlistTarget> => {
            return mutateApi(invalidateWatchlistReads, `/watchlists/${watchlistId}/targets`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ target_type: 'PIN', order_id: orderId }),
            });
        },
        removeTarget: async (watchlistId: string, targetId: string) => {
            return mutateApi(invalidateWatchlistReads, `/watchlists/${watchlistId}/targets/${targetId}`, { method: 'DELETE', headers: getHeaders() });
        },
        listEvents: async (watchlistId: string, params?: { cursor?: string; limit?: number }, cacheOptions?: ReadCacheOptions): Promise<import('../types').WatchlistEventsPage> => {
            const sp = new URLSearchParams();
            if (params?.cursor) sp.append('cursor', params.cursor);
            sp.append('limit', String(params?.limit ?? 20));
            const path = `/watchlists/${watchlistId}/events?${sp.toString()}`;
            return readApi(`watchlists:${path}`, path, 'private', 'private', { headers: getHeaders() }, cacheOptions);
        },
        markEventRead: async (watchlistId: string, eventId: string): Promise<import('../types').WatchlistEvent> => {
            return mutateApi(invalidateWatchlistReads, `/watchlists/${watchlistId}/events/${eventId}`, { method: 'PATCH', headers: getHeaders() });
        },
        addEntry: async (watchlistId: string, data: { product_id: string; delivery_point_id?: string }) => {
            return mutateApi(invalidateWatchlistReads, `/watchlists/${watchlistId}/entries`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
        },
        removeEntry: async (watchlistId: string, entryId: string) => {
            return mutateApi(invalidateWatchlistReads, `/watchlists/${watchlistId}/entries/${entryId}`, { method: 'DELETE', headers: getHeaders() });
        },
        delete: async (watchlistId: string) => {
            return mutateApi(invalidateWatchlistReads, `/watchlists/${watchlistId}`, { method: 'DELETE', headers: getHeaders() });
        },
    },

    referrals: {
        getCode: async (): Promise<{ referral_code: string; referral_link: string }> => {
            return fetchApi('/referrals/my-code', { method: 'POST', headers: getHeaders() });
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
