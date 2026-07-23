import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import type {
  MarketSupportEntry,
  MarketSupportSession,
  MarketSupportStartInput,
  SupportPrincipal,
  SupportOrganization,
} from '../types/marketSupport';
import {
  broadcastMarketSupportInvalidation,
  broadcastMarketSupportReplacement,
  clearMarketSupportContextId,
  getMarketSupportContextId,
  setMarketSupportContextId,
} from '../services/marketSupportContextStore';

interface MarketSupportContextValue {
  context: MarketSupportSession | null;
  isLoading: boolean;
  error: string | null;
  isActive: boolean;
  start: (input: MarketSupportStartInput) => Promise<MarketSupportSession>;
  enter: (input: MarketSupportStartInput) => Promise<MarketSupportSession>;
  resume: () => Promise<MarketSupportSession | null>;
  exit: () => Promise<void>;
  invalidate: (reason?: string, notify?: boolean) => void;
  canMutate: (mutation: string) => boolean;
}

const EMPTY_CONTEXT: MarketSupportContextValue = {
  context: null,
  isLoading: false,
  error: null,
  isActive: false,
  start: async () => { throw new Error('Market Support context is not available'); },
  enter: async () => { throw new Error('Market Support context is not available'); },
  resume: async () => null,
  exit: async () => undefined,
  invalidate: () => undefined,
  canMutate: () => true,
};

const MarketSupportContextState = createContext<MarketSupportContextValue>(EMPTY_CONTEXT);

const asRecord = (value: unknown): Record<string, any> => (
  value && typeof value === 'object' ? value as Record<string, any> : {}
);

const principal = (value: unknown): SupportPrincipal => {
  const item = asRecord(value);
  return {
    id: String(item.id ?? item.user_id ?? item.principal_id ?? ''),
    name: String(item.name ?? item.email ?? 'Unknown supplier'),
    email: String(item.email ?? ''),
  };
};

const organization = (value: unknown): SupportOrganization => {
  const item = asRecord(value);
  return {
    id: String(item.id ?? item.organization_id ?? ''),
    name: String(item.name ?? item.organization_name ?? 'Organization'),
    domain: item.domain == null ? null : String(item.domain),
    type: String(item.type ?? 'REAL'),
  };
};

export const normalizeMarketSupportSession = (value: unknown, actorFallback?: { id?: string; first_name?: string; last_name?: string; email?: string } | null): MarketSupportSession => {
  const envelope = asRecord(value);
  const raw = asRecord(envelope.context ?? envelope.session ?? value);
  const actorRaw = asRecord(raw.actor ?? raw.admin ?? raw.admin_user ?? raw.created_by ?? actorFallback);
  const accountable = raw.accountable_principal ?? raw.accountablePrincipal ?? raw.accountable_user ?? raw.principal;
  return {
    id: String(raw.id ?? raw.context_id ?? ''),
    status: String(raw.status ?? 'ACTIVE').toUpperCase(),
    version: Number(raw.version ?? raw.context_version ?? 0),
    startedAt: String(raw.started_at ?? raw.startedAt ?? raw.created_at ?? ''),
    organization: organization(raw.organization ?? raw.effective_organization),
    accountablePrincipal: principal(accountable),
    actor: {
      id: String(actorRaw.id ?? actorRaw.user_id ?? raw.actor_user_id ?? ''),
      name: String(actorRaw.name ?? ([actorRaw.first_name, actorRaw.last_name].filter(Boolean).join(' ') || actorRaw.email || 'Administrator')),
      email: String(actorRaw.email ?? ''),
    },
    supportReference: String(raw.support_reference ?? raw.supportReference ?? raw.case_reference ?? ''),
    expiresAt: String(raw.expires_at ?? raw.expiresAt ?? ''),
    scope: Array.isArray(raw.scope ?? raw.allowed_actions ?? raw.actions ?? raw.scopes)
      ? (raw.scope ?? raw.allowed_actions ?? raw.actions ?? raw.scopes).map(String)
      : ['ASK_CREATE', 'ASK_CANCEL'],
  };
};

export const isAttachableMarketSupportSession = (session: MarketSupportSession, now = new Date()): boolean => {
  if (session.status.toUpperCase() !== 'ACTIVE') return false;
  const expiresAt = new Date(session.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
};

export class MarketSupportExitError extends Error {
  readonly localDetached = true;

  constructor(message: string) {
    super(message);
    this.name = 'MarketSupportExitError';
  }
}

const normalizeEntry = (value: unknown): MarketSupportEntry => {
  const raw = asRecord(value);
  const principals = raw.eligible_principals ?? raw.eligiblePrincipals ?? [];
  return {
    eligible: raw.eligible === true || (raw.eligible == null && principals.length > 0),
    reason: raw.reason ?? null,
    organization: raw.organization ? organization(raw.organization) : undefined,
    eligiblePrincipals: Array.isArray(principals) ? principals.map(principal) : [],
  };
};

export const MarketSupportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [context, setContext] = useState<MarketSupportSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bootstrapGeneration = useRef(0);

  const invalidate = useCallback((reason = 'invalidated', notify = false) => {
    clearMarketSupportContextId();
    setContext(null);
    if (notify) broadcastMarketSupportInvalidation(reason);
  }, []);

  const loadStoredContext = useCallback(async (generation: number) => {
    if (authLoading) return;
    const storedId = getMarketSupportContextId();
    if (!storedId || user?.role !== 'ADMIN') {
      if (generation !== bootstrapGeneration.current) return;
      clearMarketSupportContextId();
      setContext(null);
      return;
    }
    try {
      const next = normalizeMarketSupportSession(await api.marketSupport.getContext(storedId), user);
      if (generation !== bootstrapGeneration.current) return;
      if (!next.id || next.id !== storedId || !isAttachableMarketSupportSession(next)) throw new Error('Invalid Market Support context');
      setContext(next);
      setError(null);
    } catch {
      if (generation !== bootstrapGeneration.current) return;
      invalidate('expired', true);
      setError('This Market Support context has expired or is no longer available.');
    }
  }, [authLoading, invalidate, user]);

  useEffect(() => {
    const generation = ++bootstrapGeneration.current;
    setIsLoading(true);
    void loadStoredContext(generation).finally(() => {
      if (generation === bootstrapGeneration.current) setIsLoading(false);
    });
    return () => { bootstrapGeneration.current += 1; };
  }, [loadStoredContext, user?.id]);

  useEffect(() => {
    const handleInvalidation = (event: Event) => {
      const detail = (event as CustomEvent<{ contextId?: string; reason?: string }>).detail;
      if (detail?.contextId && context?.id && detail.contextId !== context.id) return;
      invalidate(detail?.reason || 'broadcast');
    };
    const handleLogout = () => invalidate('logout');
    window.addEventListener('verdaxis:market-support-context-invalidated', handleInvalidation);
    window.addEventListener('verdaxis:auth-logout', handleLogout);
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('verdaxis-market-support-context');
      channel.onmessage = (event) => {
        const contextId = typeof event.data?.contextId === 'string' ? event.data.contextId : undefined;
        if (contextId && context?.id && contextId !== context.id) return;
        invalidate(event.data?.reason || 'broadcast');
      };
    }
    return () => {
      window.removeEventListener('verdaxis:market-support-context-invalidated', handleInvalidation);
      window.removeEventListener('verdaxis:auth-logout', handleLogout);
      channel?.close();
    };
  }, [context?.id, invalidate]);

  useEffect(() => {
    if (!context?.expiresAt || !isAttachableMarketSupportSession(context)) {
      if (context) invalidate('expired');
      return;
    }
    const delay = new Date(context.expiresAt).getTime() - Date.now();
    if (delay <= 0) {
      invalidate('expired');
      return;
    }
    const timer = window.setTimeout(() => invalidate('expired', true), delay);
    return () => window.clearTimeout(timer);
  }, [context, invalidate]);

  const start = useCallback(async (input: MarketSupportStartInput) => {
    setError(null);
    const next = normalizeMarketSupportSession(await api.marketSupport.start(input), user);
    if (!next.id || !isAttachableMarketSupportSession(next)) throw new Error('Market Support did not return an active, future context');
    setMarketSupportContextId(next.id);
    setContext(next);
    if (input.replaceActive) broadcastMarketSupportReplacement();
    return next;
  }, [user]);

  const resume = useCallback(async () => {
    const activeResponse = await api.marketSupport.active();
    const next = normalizeMarketSupportSession(activeResponse, user);
    if (!next.id || !isAttachableMarketSupportSession(next)) {
      invalidate('not-found');
      return null;
    }
    setMarketSupportContextId(next.id);
    setContext(next);
    return next;
  }, [invalidate, user]);

  const exit = useCallback(async () => {
    const currentId = context?.id ?? getMarketSupportContextId();
    try {
      if (currentId) await api.marketSupport.exit(currentId);
    } catch (caught) {
      clearMarketSupportContextId();
      setContext(null);
      broadcastMarketSupportInvalidation('exit-failed', currentId ?? undefined);
      throw new MarketSupportExitError(caught instanceof Error
        ? `${caught.message} Local Market Support state was detached.`
        : 'Exit request failed. Local Market Support state was detached.');
    } finally {
      if (currentId && getMarketSupportContextId() === currentId) {
        clearMarketSupportContextId();
        setContext(null);
        broadcastMarketSupportInvalidation('exit', currentId);
      }
    }
  }, [context?.id]);

  const value = useMemo<MarketSupportContextValue>(() => ({
    context,
    isLoading,
    error,
    isActive: Boolean(context),
    start,
    enter: start,
    resume,
    exit,
    invalidate,
    canMutate: (mutation: string) => !context || context.scope.includes(mutation),
  }), [context, error, exit, invalidate, isLoading, resume, start]);

  return <MarketSupportContextState.Provider value={value}>{children}</MarketSupportContextState.Provider>;
};

export const useMarketSupport = (): MarketSupportContextValue => useContext(MarketSupportContextState);
