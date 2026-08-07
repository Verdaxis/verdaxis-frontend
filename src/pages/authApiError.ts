import type { TFunction } from 'i18next';

type ErrorPayload = {
  code?: unknown;
  message?: unknown;
  detail?: unknown;
};

const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value : null;
const ERROR_CODE_ALIASES: Record<string, string> = {
  'Email already registered': 'REGISTRATION_CONFLICT',
};

export function formatLocalizedAuthError(
  payload: unknown,
  t: TFunction,
  fallbackKey: string,
): string {
  const outer = payload && typeof payload === 'object' ? payload as ErrorPayload : {};
  const detail = outer.detail && typeof outer.detail === 'object' ? outer.detail as ErrorPayload : {};
  const message = text(detail.message) ?? text(outer.message) ?? text(outer.detail) ?? text(payload);
  const code = text(detail.code) ?? text(outer.code) ?? (message ? ERROR_CODE_ALIASES[message] : undefined);
  const fallback = t(fallbackKey);
  const isZh = document.documentElement.lang.startsWith('zh');

  if (code) {
    const mapped = t(`errors.code.${code}`, { defaultValue: fallback });
    if (isZh || mapped !== fallback) return mapped;
  }
  return isZh ? fallback : message ?? fallback;
}

export function localizedAuthError(
  payload: unknown,
  t: TFunction,
  fallbackKey: string,
  context: string,
): string {
  console.error(`[auth] ${context}`, payload);
  return formatLocalizedAuthError(payload, t, fallbackKey);
}
