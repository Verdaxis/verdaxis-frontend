export const BACKEND_UNAVAILABLE_EVENT = 'verdaxis:backend-unavailable';

export const isBackendUnavailableStatus = (status: number): boolean =>
  status === 502 || status === 503 || status === 504;

export const notifyBackendUnavailable = (reason?: string): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(BACKEND_UNAVAILABLE_EVENT, {
      detail: { reason },
    }),
  );
};
