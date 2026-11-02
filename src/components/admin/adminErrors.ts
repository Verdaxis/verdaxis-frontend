import type { TFunction } from 'i18next';
import { ApiError } from '../../services/api';

/**
 * Operator-safe message for a failed admin call. A mapped error code wins;
 * otherwise Chinese always shows the translated fallback, and English may show
 * the server message. The raw error stays in the console only.
 */
export const safeAdminError = (error: unknown, t: TFunction, language: string, fallbackKey: string) => {
  console.error(`[admin] ${fallbackKey}`, error);
  const fallback = t(fallbackKey);
  if (error instanceof ApiError && error.code) {
    const mapped = t(`errors.code.${error.code}`, { defaultValue: fallback });
    if (language.startsWith('zh') || mapped !== fallback) return mapped;
  }
  return language.startsWith('zh') ? fallback : error instanceof Error ? error.message : fallback;
};

/**
 * Every refusal code the offboarding and reassignment routes can send, plus the
 * one this client raises itself while an assisted workspace is active. Each has
 * a message under `offboard.errorCode.<CODE>` in every language.
 */
export const OFFBOARDING_ERROR_CODES = [
  // Sign-in and authority.
  'INVALID_CREDENTIALS',
  'AUTH_CREDENTIALS_INVALID',
  'AUTH_SESSION_REVOKED',
  'AUTH_PASSWORD_CHANGED',
  'ACCOUNT_PENDING',
  'ACCOUNT_REJECTED',
  'PASSWORD_CHANGE_REQUIRED',
  'EXECUTION_NOT_AVAILABLE',
  'ADMIN_REQUIRED',
  'FORBIDDEN',
  'MARKET_SUPPORT_MUTATION_NOT_ALLOWED',
  'MARKET_SUPPORT_MUTATION_BLOCKED',
  // The request and its target.
  'VALIDATION_FAILED',
  'BODY_TOO_LARGE',
  'USER_NOT_FOUND',
  'TRADE_NOT_FOUND',
  'ACCOUNT_NOT_MANAGEABLE',
  'ACCOUNT_STATE_INVALID',
  // Offboarding.
  'OFFBOARD_ALREADY_COMPLETED',
  'OFFBOARD_MEMBERSHIP_CHANGED',
  'OFFBOARD_PREVIEW_LIMIT',
  'MARKET_INVALIDATION_LIMIT',
  'MARKET_INVALIDATION_TRADE_FROZEN',
  // Reassignment.
  'REASSIGNMENT_STALE',
  'TRADE_NOT_REASSIGNABLE',
  'TRADE_FROZEN',
  'REASSIGNMENT_MANUAL_RESOLUTION_REQUIRED',
  'REASSIGNMENT_CURRENT_STILL_MEMBER',
  'REASSIGNMENT_REPLACEMENT_INELIGIBLE',
  // Contention and outcome.
  'MARKET_BUSY',
  'MARKET_TIMEOUT',
  'TRANSACTION_TIMEOUT',
  'TRANSACTION_RETRY_EXHAUSTED',
  'COMMIT_OUTCOME_UNKNOWN',
  'DATABASE_ERROR',
] as const;

export type OffboardingErrorCode = typeof OFFBOARDING_ERROR_CODES[number];

/**
 * Message for a failed offboarding or handover call. It never shows server
 * text: a mapped error code wins, then a clear message for refusals that mean
 * "not allowed" or "not routed" (for example while the backend switch is off),
 * then the caller's localized fallback. The raw error stays in the console.
 */
export const offboardingError = (error: unknown, t: TFunction, fallbackKey: string): string => {
  console.error(`[admin] ${fallbackKey}`, error);
  if (error instanceof ApiError && error.code) {
    const mapped = t(`offboard.errorCode.${error.code}`, { defaultValue: '' });
    if (mapped) return mapped;
  }
  if (error instanceof ApiError && error.status === 403) return t('offboard.error.forbidden');
  if (error instanceof ApiError && (error.status === 404 || error.status === 405)) return t('offboard.error.unavailable');
  return t(fallbackKey);
};
