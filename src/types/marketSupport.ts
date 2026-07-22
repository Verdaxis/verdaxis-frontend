export type MarketSupportCapability =
  | 'MARKET_SUPPORT_LISTINGS'
  | 'MARKET_SUPPORT_AUTHORIZATIONS';

export type AuthorizationStatus = 'ACTIVE' | 'CONSUMED' | 'REVOKED';

export interface Page<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface SupportOrganization {
  id: string;
  name: string;
  domain: string | null;
  type: string;
}

export interface SupportPrincipal {
  id: string;
  email: string;
  name: string;
}

export interface AssistedOrderTerms {
  side: 'ASK';
  product_id: string;
  delivery_point_id: string;
  quantity_mt: number;
  price_per_mt_usd: number;
  availability_window: string;
  expires_at: string;
  is_anonymous: boolean;
  certifications: string[];
  certification_declared: boolean;
  certification_scheme: string;
  specification_standard: string;
  msds_available: boolean;
  carbon_intensity_gco2_mj: number;
  carbon_intensity_method?: string | null;
  feedstock: string;
  origin: string;
  off_spec: boolean;
  off_spec_notes?: string | null;
}

export interface SupportAuthorization {
  id: string;
  organization_id: string;
  accountable_user_id: string;
  status: AuthorizationStatus;
  order: AssistedOrderTerms;
  authorization_expires_at: string;
  order_expires_at: string;
  terms_digest: string;
  evidence_reference: string;
  evidence_sha256: string;
  commercial_consent_version: string;
  commercial_consent_reference: string;
  support_case_reference: string | null;
  created_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
}

export interface AssistedListing {
  order: {
    id: string;
    product_id: string;
    product_name: string;
    delivery_point_id: string;
    delivery_point_name: string;
    quantity_mt: number;
    remaining_quantity_mt: number;
    price_per_mt_usd: number;
    availability_window: string;
    status: string;
    expires_at: string;
  };
  accountable_user_id: string;
  created_by_actor_user_id: string;
  creation_method: 'MARKET_SUPPORT';
  support_authorization_id: string;
  version: number;
  etag: string;
}

export interface SupportContext {
  organization: SupportOrganization;
  eligible_principals: SupportPrincipal[];
  authorizations: SupportAuthorization[];
  listings: AssistedListing[];
}

export interface CreateAuthorizationInput {
  accountable_user_id: string;
  order: AssistedOrderTerms;
  authorization_expires_at: string;
  evidence_reference: string;
  evidence_sha256: string;
  commercial_consent_version: string;
  commercial_consent_reference: string;
  support_case_reference?: string | null;
}
