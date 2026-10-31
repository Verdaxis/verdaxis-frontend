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
 * Message for a failed offboarding or handover call. It never shows server
 * text: a mapped error code wins, then a clear message for refusals that mean
 * "not allowed" or "not routed" (for example while the backend switch is off),
 * then the caller's localized fallback. The raw error stays in the console.
 */
export const offboardingError = (error: unknown, t: TFunction, fallbackKey: string): string => {
  console.error(`[admin] ${fallbackKey}`, error);
  if (error instanceof ApiError && error.code) {
    const mapped = t(`errors.code.${error.code}`, { defaultValue: '' });
    if (mapped) return mapped;
  }
  if (error instanceof ApiError && error.status === 403) return t('offboard.error.forbidden');
  if (error instanceof ApiError && error.status === 404) return t('offboard.error.unavailable');
  return t(fallbackKey);
};
