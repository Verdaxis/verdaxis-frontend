import { API_URL } from './config';
import { isBackendUnavailableStatus } from './backendAvailability';

export type RefreshOutcome =
  | { status: 'success'; token: string }
  | { status: 'denied' }
  | { status: 'unavailable' }
  | { status: 'superseded' };

let accessToken: string | null = null;
let inFlight: Promise<RefreshOutcome> | null = null;
let authGeneration = 0;

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

export function getAuthGeneration(): number {
  return authGeneration;
}

export function setAccessToken(token: string | null): void {
  if (token === accessToken) return;
  accessToken = token;
  authGeneration += 1;
  // A replacement starts a new session epoch. Let a new caller refresh
  // immediately while the old request finishes and observes the new epoch.
  inFlight = null;
}

export function clearAccessToken(): void {
  accessToken = null;
  authGeneration += 1;
  inFlight = null;
  purgeLegacyStoredTokens();
}

export function refreshSession(): Promise<RefreshOutcome> {
  if (inFlight) return inFlight;

  const requestGeneration = authGeneration;
  const request = (async (): Promise<RefreshOutcome> => {
    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(15000),
      });
      if (requestGeneration !== authGeneration) return { status: 'superseded' };

      if (res.ok) {
        const token = getAccessTokenFromResponse(await res.json());
        if (requestGeneration !== authGeneration) return { status: 'superseded' };
        // A malformed success body is a server fault, not a revoked
        // session — keep any still-valid in-memory token.
        if (!token) return { status: 'unavailable' };
        // Refresh rotation is the same session. Do not advance the session
        // generation or detach a newer caller's refresh request.
        accessToken = token;
        return { status: 'success', token };
      }

      // Transient gateway/server outage: the refresh cookie may still be
      // good and the in-memory access token may still be valid, so do
      // not clear anything.
      if (isBackendUnavailableStatus(res.status)) return { status: 'unavailable' };

      // Definitive rejection — the session is gone.
      if (requestGeneration !== authGeneration) return { status: 'superseded' };
      clearAccessToken();
      return { status: 'denied' };
    } catch {
      if (requestGeneration !== authGeneration) return { status: 'superseded' };
      return { status: 'unavailable' };
    }
  })();
  let trackedRequest: Promise<RefreshOutcome>;
  trackedRequest = request.finally(() => {
    if (inFlight === trackedRequest) inFlight = null;
  });
  inFlight = trackedRequest;
  return trackedRequest;
}

export async function refreshAccessToken(): Promise<string | null> {
  const outcome = await refreshSession();
  return outcome.status === 'success' ? outcome.token : null;
}
