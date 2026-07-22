import type { OrderBookOrder } from '../types';
import { getAccessToken, refreshAccessToken } from './authToken';
import { API_URL } from './config';

export type AdminCapability =
  | 'MARKET_SUPPORT_LISTINGS'
  | 'MARKET_SUPPORT_AUTHORIZATIONS';

export type SupportAuthorizationScope =
  | 'PUBLISH_POST_ONLY_EXECUTABLE_ORDER'
  | 'EDIT_SUPPORT_MANAGED_ORDER'
  | 'CANCEL_SUPPORT_MANAGED_ORDER';

export interface MarketSupportOrganization {
  id: string;
  name: string;
  domain: string | null;
  type: string;
  verification_status: string;
  provenance: string;
}

export interface MarketSupportPrincipal {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  eligible: boolean;
}

export interface SupportAuthorization {
  id: string;
  organization_id: string;
  authorized_contact_name: string;
  authorized_contact_email: string;
  evidence_reference: string;
  support_case_reference: string | null;
  scopes: SupportAuthorizationScope[];
  valid_from: string;
  valid_until: string;
  status: 'ACTIVE' | 'REVOKED';
  allowed_side: string;
  product_id: string | null;
  delivery_point_id: string | null;
  min_price_per_mt_usd: number | string | null;
  max_price_per_mt_usd: number | string | null;
  max_quantity_mt_per_order: number | string;
  max_total_open_quantity_mt: number | string;
  max_order_ttl_hours: number;
  max_uses: number | null;
  uses_count: number;
  created_by_admin_user_id: string;
  created_at: string;
  revoked_at: string | null;
  revoked_by_admin_user_id: string | null;
  revocation_reason: string | null;
  usable_by_current_admin: boolean;
}

export interface AssistedOrderAttribution {
  organization_id: string;
  accountable_user_id: string;
  created_by_admin_user_id: string;
  support_authorization_id: string;
  submission_method: 'VERDAXIS_ASSISTED';
  support_version: number;
  management_authority: 'SUPPORT_MANDATE' | 'CUSTOMER_DIRECT';
  customer_adopted_at: string | null;
  customer_adopted_by_user_id: string | null;
  last_action_actor_user_id: string;
  last_action_reason_code: string;
  support_case_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketSupportOrderView {
  order: OrderBookOrder;
  attribution: AssistedOrderAttribution | null;
  order_updated_at: string;
  support_manageable: boolean;
}

export interface MarketSupportContext {
  organization: MarketSupportOrganization;
  capabilities: AdminCapability[];
  eligible_principals: MarketSupportPrincipal[];
  active_authorizations: SupportAuthorization[];
  orders: MarketSupportOrderView[];
}

export interface SupportOrderInput {
  side: 'ASK';
  product_id: string;
  delivery_point_id: string;
  quantity_mt: number;
  price_per_mt_usd: number;
  availability_window: string;
  expires_at: string;
  is_anonymous: true;
  certifications: string[];
  certification_declared: true;
  certification_scheme: string;
  specification_standard: string;
  msds_available: boolean;
  carbon_intensity_gco2_mj: number;
  feedstock: string;
  origin: string;
}

export interface AssistedOrderActionBase {
  accountable_user_id: string;
  support_authorization_id: string;
  reason_code: string;
  support_case_reference?: string | null;
}

export interface AssistedOrderPreviewRequest extends AssistedOrderActionBase {
  order: SupportOrderInput;
}

export interface AssistedOrderCreateRequest extends AssistedOrderPreviewRequest {
  acknowledge_executable_resting_order: true;
}

export interface AssistedOrderUpdateRequest extends AssistedOrderActionBase {
  expected_support_version: number;
  expected_order_updated_at: string;
  changes: Record<string, unknown>;
  acknowledge_executable_resting_order: true;
}

export interface AssistedOrderCancelRequest extends AssistedOrderActionBase {
  expected_support_version: number;
  expected_order_updated_at: string;
}

export interface PostOnlyPreview {
  valid: boolean;
  would_cross: boolean;
  indeterminate: boolean;
  best_executable_opposing_price_per_mt_usd: number | string | null;
  similar_open_order_count: number;
  warnings: string[];
}

export interface AssistedOrderResponse {
  order: OrderBookOrder;
  attribution: AssistedOrderAttribution;
  order_updated_at: string;
}

export interface SupportAuthorizationCreateRequest {
  authorized_contact_name: string;
  authorized_contact_email: string;
  evidence_reference: string;
  support_case_reference?: string | null;
  scopes: SupportAuthorizationScope[];
  valid_from: string;
  valid_until: string;
  product_id?: string | null;
  delivery_point_id?: string | null;
  min_price_per_mt_usd?: number | null;
  max_price_per_mt_usd?: number | null;
  max_quantity_mt_per_order: number;
  max_total_open_quantity_mt: number;
  max_order_ttl_hours: number;
  max_uses?: number | null;
}

function authHeaders(token = getAccessToken()): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

function messageFromError(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object' || !('detail' in payload)) return fallback;
  const detail = payload.detail;
  if (typeof detail === 'string') return detail;
  if (detail && typeof detail === 'object' && 'message' in detail && typeof detail.message === 'string') {
    return detail.message;
  }
  return fallback;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const execute = (token?: string | null) => fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: (() => {
      const headers = authHeaders(token);
      new Headers(options.headers).forEach((value, key) => headers.set(key, value));
      return headers;
    })(),
  });

  let response = await execute();
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) response = await execute(refreshed);
  }

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // The status text remains a safe fallback for non-JSON gateway errors.
    }
    throw new Error(messageFromError(payload, response.statusText || 'Request failed'));
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function normalizeOrder(order: OrderBookOrder): OrderBookOrder {
  return {
    ...order,
    quantity_mt: Number(order.quantity_mt),
    remaining_quantity_mt: Number(order.remaining_quantity_mt),
    price_per_mt_usd: Number(order.price_per_mt_usd),
  };
}

function normalizeOrderResponse(response: AssistedOrderResponse): AssistedOrderResponse {
  return { ...response, order: normalizeOrder(response.order) };
}

function key(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const marketSupportApi = {
  capabilities: (): Promise<AdminCapability[]> =>
    request('/admin/market-support/capabilities'),

  searchOrganizations: (query: string): Promise<MarketSupportOrganization[]> =>
    request(`/admin/market-support/organizations?query=${encodeURIComponent(query)}`),

  context: async (organizationId: string): Promise<MarketSupportContext> => {
    const response = await request<MarketSupportContext>(
      `/admin/market-support/organizations/${organizationId}/context`,
    );
    return {
      ...response,
      orders: response.orders.map((item) => ({ ...item, order: normalizeOrder(item.order) })),
    };
  },

  preview: (organizationId: string, body: AssistedOrderPreviewRequest): Promise<PostOnlyPreview> =>
    request(`/admin/market-support/organizations/${organizationId}/orders/preview`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  create: async (
    organizationId: string,
    body: AssistedOrderCreateRequest,
    idempotencyKey = key(),
  ): Promise<AssistedOrderResponse> => normalizeOrderResponse(await request(
    `/admin/market-support/organizations/${organizationId}/orders`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    },
  )),

  update: async (
    organizationId: string,
    orderId: string,
    body: AssistedOrderUpdateRequest,
    idempotencyKey = key(),
  ): Promise<AssistedOrderResponse> => normalizeOrderResponse(await request(
    `/admin/market-support/organizations/${organizationId}/orders/${orderId}`,
    {
      method: 'PATCH',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    },
  )),

  cancel: async (
    organizationId: string,
    orderId: string,
    body: AssistedOrderCancelRequest,
    idempotencyKey = key(),
  ): Promise<AssistedOrderResponse> => normalizeOrderResponse(await request(
    `/admin/market-support/organizations/${organizationId}/orders/${orderId}/cancel`,
    {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    },
  )),

  createAuthorization: (
    organizationId: string,
    body: SupportAuthorizationCreateRequest,
  ): Promise<SupportAuthorization> => request(
    `/admin/market-support/organizations/${organizationId}/authorizations`,
    { method: 'POST', body: JSON.stringify(body) },
  ),

  revokeAuthorization: (
    organizationId: string,
    authorizationId: string,
    reason: string,
  ): Promise<SupportAuthorization> => request(
    `/admin/market-support/organizations/${organizationId}/authorizations/${authorizationId}/revoke`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  ),
};
