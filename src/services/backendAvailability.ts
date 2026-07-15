import { reliability } from './analytics';

export const BACKEND_UNAVAILABLE_EVENT = 'verdaxis:backend-unavailable';

export const isBackendUnavailableStatus = (status: number): boolean =>
  status === 502 || status === 503 || status === 504;

export const notifyBackendUnavailable = (reason?: string): void => {
  if (typeof window === 'undefined') return;
  // Best-effort reliability telemetry (deduplicated per session); the
  // maintenance UI event below is the product behavior and must fire even if
  // telemetry misbehaves.
  try {
    reliability.reportBackendUnavailable();
  } catch { /* telemetry never blocks the maintenance UI */ }
  window.dispatchEvent(
    new CustomEvent(BACKEND_UNAVAILABLE_EVENT, {
      detail: { reason },
    }),
  );
};
