export type MarketSupportCapability =
  | 'MARKET_SUPPORT_LISTINGS'
  | 'MARKET_SUPPORT_AUTHORIZATIONS';

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

/**
 * The browser keeps only `id`. The remaining fields are rehydrated from the
 * server and stay in React memory for the lifetime of the attached shell.
 */
export interface MarketSupportSession {
  id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'EXITED' | string;
  version: number;
  startedAt: string;
  organization: SupportOrganization;
  actor: { id: string; name: string; email: string };
  supportReference: string;
  expiresAt: string;
  scope: string[];
}

export interface MarketSupportEntry {
  eligible: boolean;
  reason?: string | null;
  organization?: SupportOrganization;
}

export interface MarketSupportStartInput {
  organizationId: string;
  supportReference: string;
  scope: string[];
  replaceActive?: boolean;
}
