import { API_URL } from './config';
import { isBackendUnavailableStatus } from './backendAvailability';

export type RefreshOutcome =
  | { status: 'success'; token: string }
  | { status: 'denied' }
  | { status: 'unavailable' };

let accessToken: string | null = null;
let inFlight: Promise<RefreshOutcome> | null = null;

function purgeLegacyStoredTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  sessionStorage.removeItem('token');
}

function getAccessTokenFromResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('access_token' in data)) {
    return null;
  }

  const token = data.access_token;
  return typeof token === 'string' ? token : null;
}

purgeLegacyStoredTokens();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAccessToken(): void {
  accessToken = null;
  purgeLegacyStoredTokens();
}

export function refreshSession(): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;

  inFlight = (async (): Promise<RefreshOutcome> => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const token = getAccessTokenFromResponse(await res.json());
        // A malformed success body is a server fault, not a revoked
        // session — keep any still-valid in-memory token.
        if (!token) return { status: 'unavailable' };
        setAccessToken(token);
        return { status: 'success', token };
      }

      // Transient gateway/server outage: the refresh cookie may still be
      // good and the in-memory access token may still be valid, so do
      // not clear anything.
      if (isBackendUnavailableStatus(res.status)) return { status: 'unavailable' };

      // Definitive rejection — the session is gone.
      clearAccessToken();
      return { status: 'denied' };
    } catch {
      return { status: 'unavailable' };
    }
  })();

  return inFlight.finally(() => {
    inFlight = null;
  });
}

export async function refreshAccessToken(): Promise<string | null> {
  const outcome = await refreshSession();
  return outcome.status === 'success' ? outcome.token : null;
}
