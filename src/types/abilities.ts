/**
 * Contract for `GET /api/auth/me/abilities` (backend: docs/user-abilities.md).
 *
 * Abilities are UI hints that tell the screen what the signed-in user may do
 * and why not. Every endpoint still enforces its own rules, and per-subject
 * rules (order ownership, trade party, order state) are not in the payload.
 */

/** The only `schema_version` this client understands. Anything else is ignored. */
export const SUPPORTED_ABILITIES_SCHEMA_VERSION = 1;

/** Action ids of schema version 1. The server may add ids; unknown ids are ignored. */
export const ABILITY_IDS = [
  'place_bid_order',
  'place_ask_order',
  'amend_order',
  'cancel_order',
  'hit_ask_order',
  'hit_bid_order',
  'confirm_trade',
  'deliver_trade',
  'pay_trade',
  'manage_inventory',
  'publish_inventory',
  'create_rfq',
  'quote_rfq',
  'view_admin_analytics',
  'view_audit_log',
  'view_user_activity',
  'view_feedback',
  'manage_subscriptions',
  'manage_accounts',
  'review_kyc',
  'manage_commissions',
  'market_support_access',
  'market_support_assisted_orders',
] as const;

export type AbilityId = (typeof ABILITY_IDS)[number];

/**
 * Reason codes of schema version 1. The server may add codes, so a code that
 * is not listed here is still a valid denial (see `reasonCode` below).
 */
export const KNOWN_REASON_CODES = [
  'ADMIN_CANNOT_EXECUTE',
  'ROLE_NOT_ASSIGNED',
  'ORGANIZATION_REQUIRED',
  'ACCOUNT_NOT_APPROVED',
  'EMAIL_NOT_VERIFIED',
  'PASSWORD_CHANGE_REQUIRED',
  'KYC_REQUIRED',
  'KYC_REJECTED',
  'KYC_ORGANIZATION_MISMATCH',
  'ORGANIZATION_NOT_APPROVED',
  'BUYER_ROLE_REQUIRED',
  'SUPPLIER_ROLE_REQUIRED',
  'ADMIN_ROLE_REQUIRED',
  'ORGANIZATION_PROVENANCE_UNVERIFIED',
  'LEGACY_ADMIN_MUTATION_RETIRED',
  'MARKET_SUPPORT_DISABLED',
  'MARKET_SUPPORT_CAPABILITY_REQUIRED',
] as const;

/** One evaluated ability as the UI sees it. */
export interface Ability {
  allowed: boolean;
  /** Stable UPPER_SNAKE code when denied. Build logic on this, never on `reason`. */
  reasonCode: string | null;
  /** Short English text from the server. Wording may change; display only as a fallback. */
  reason: string | null;
}

/** Everything the server said, keyed by action id (ids the client does not know are kept). */
export type AbilityMap = ReadonlyMap<string, Ability>;

/** A denied ability with its display text already localized. */
export interface AbilityDenial {
  reasonCode: string | null;
  message: string;
}

/** Buttons that create an order, keyed by the side of the order being created. */
export const PLACE_ORDER_ABILITY: Record<'BID' | 'ASK', AbilityId> = {
  BID: 'place_bid_order',
  ASK: 'place_ask_order',
};

/** Buttons that hit an existing order, keyed by the side of the order being hit. */
export const HIT_ORDER_ABILITY: Record<'BID' | 'ASK', AbilityId> = {
  ASK: 'hit_ask_order',
  BID: 'hit_bid_order',
};

/** Pages and actions that only administrators may use. */
export const ADMIN_ABILITY_IDS: readonly AbilityId[] = [
  'view_admin_analytics',
  'view_audit_log',
  'view_user_activity',
  'view_feedback',
  'manage_subscriptions',
  'manage_accounts',
  'review_kyc',
  'manage_commissions',
];

/**
 * Market actions are judged against the signed-in account. While an assisted
 * Market Support context is active, an administrator acts for a customer
 * organization and the server judges the request against that organization,
 * so the administrator's own hints do not apply to these actions.
 */
export const MARKET_ACTION_IDS: ReadonlySet<AbilityId> = new Set<AbilityId>([
  'place_bid_order',
  'place_ask_order',
  'amend_order',
  'cancel_order',
  'hit_ask_order',
  'hit_bid_order',
  'confirm_trade',
  'deliver_trade',
  'pay_trade',
  'manage_inventory',
  'publish_inventory',
  'create_rfq',
  'quote_rfq',
]);
