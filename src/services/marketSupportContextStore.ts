export const MARKET_SUPPORT_CONTEXT_STORAGE_KEY = 'verdaxis_market_support_context_id';
export const MARKET_SUPPORT_CONTEXT_HEADER = 'X-Verdaxis-Market-Support-Context';

const storage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

export function getMarketSupportContextId(): string | null {
  return storage()?.getItem(MARKET_SUPPORT_CONTEXT_STORAGE_KEY) ?? null;
}

export function setMarketSupportContextId(contextId: string): void {
  const normalized = contextId.trim();
  if (!normalized) throw new Error('An assisted-workspace context id is required');
  storage()?.setItem(MARKET_SUPPORT_CONTEXT_STORAGE_KEY, normalized);
}

export function clearMarketSupportContextId(): void {
  storage()?.removeItem(MARKET_SUPPORT_CONTEXT_STORAGE_KEY);
}

export function broadcastMarketSupportInvalidation(reason = 'exit', contextId?: string): void {
  if (typeof window === 'undefined') return;
  const detail = { reason, ...(contextId ? { contextId } : {}) };
  window.dispatchEvent(new CustomEvent('verdaxis:market-support-context-invalidated', { detail }));
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('verdaxis-market-support-context');
    channel.postMessage(detail);
    channel.close();
  }
}

export function broadcastMarketSupportReplacement(): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel('verdaxis-market-support-context');
  channel.postMessage({ reason: 'replaced' });
  channel.close();
}
