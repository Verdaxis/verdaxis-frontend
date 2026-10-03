import { MARKET_PRODUCTS, type MarketProduct } from '../types';
import { normalizeAvailabilityWindow } from '../utils/availabilityWindow';
import { api } from './api';
import { getAuthGeneration } from './authToken';
import type { ActivityDeliveryResult } from '../types/activity';

export type ActivityAction = 'page_view' | 'market_view' | 'market_filter';

export interface ActivityEvent {
  id: string;
  action: ActivityAction;
  page: ActivityPage;
  market_product?: MarketProduct;
  delivery_point_id?: string;
  availability_window?: string;
}

export interface ActivityBatch {
  events: ActivityEvent[];
}

export const ACTIVITY_PAGES = [
  'home',
  'map',
  'marketplace',
  'curve',
  'watchlist',
  'analytics',
  'trades',
  'quotes',
  'compliance',
  'training',
  'settings',
  'admin',
] as const;

export type ActivityPage = typeof ACTIVITY_PAGES[number];

export interface ActivityDetails {
  page: string;
  marketProduct?: string | null;
  deliveryPointId?: string | null;
  availabilityWindow?: string | null;
}

interface ActivityTrackerOptions {
  send: (batch: ActivityBatch) => ActivityDeliveryResult | void | Promise<ActivityDeliveryResult | void>;
  createId?: () => string;
  setTimer?: typeof window.setTimeout;
  clearTimer?: typeof window.clearTimeout;
  flushDelayMs?: number;
  retryDelayMs?: number;
  maxDeliveryAttempts?: number;
  maxEventAgeMs?: number;
  maxBufferedEvents?: number;
  now?: () => number;
  getSessionEpoch?: () => unknown;
}

export interface ActivityDeliveryStats {
  accepted: number;
  rejected: number;
  retried: number;
  dropped: number;
  pending: number;
}

interface BufferedActivityEvent {
  event: ActivityEvent;
  queuedAt: number;
}

const MAX_BATCH_SIZE = 50;
const DEFAULT_FLUSH_DELAY_MS = 250;
const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_MAX_DELIVERY_ATTEMPTS = 3;
const DEFAULT_MAX_EVENT_AGE_MS = 30_000;
const DEFAULT_MAX_BUFFERED_EVENTS = 200;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WINDOW_PATTERN = /^(?:SPOT|\d{4}-(?:0[1-9]|1[0-2])|\d{4}-Q[1-4]|\d{4}-CAL)$/;
const activityPages = new Set<string>(ACTIVITY_PAGES);
const marketProducts = new Set<string>(MARKET_PRODUCTS);

export const activityPageFromPath = (pathname: string): ActivityPage | null => {
  if (pathname.includes('?') || pathname.includes('#')) return null;
  if (pathname === '/app' || pathname === '/app/') return null;
  if (pathname.startsWith('/app/admin')) return 'admin';
  if (pathname.startsWith('/app/m/')) return 'marketplace';
  const slug = pathname.split('/')[2] ?? '';
  return activityPages.has(slug) ? slug as ActivityPage : null;
};

const sanitizeActivity = (
  action: ActivityAction,
  details: ActivityDetails,
  createId: () => string,
): ActivityEvent | null => {
  if (!activityPages.has(details.page)) return null;

  const marketProduct = details.marketProduct && marketProducts.has(details.marketProduct)
    ? details.marketProduct as MarketProduct
    : undefined;
  const deliveryPointId = details.deliveryPointId && UUID_PATTERN.test(details.deliveryPointId)
    ? details.deliveryPointId
    : undefined;
  const normalizedWindow = details.availabilityWindow
    ? normalizeAvailabilityWindow(details.availabilityWindow)
    : undefined;
  const availabilityWindow = normalizedWindow && WINDOW_PATTERN.test(normalizedWindow)
    ? normalizedWindow
    : undefined;

  // A page-only market_filter means the user cleared the bounded selection.
  if (action === 'market_view' && !marketProduct && !deliveryPointId && !availabilityWindow) return null;

  return {
    id: createId(),
    action,
    page: details.page as ActivityPage,
    ...(marketProduct ? { market_product: marketProduct } : {}),
    ...(deliveryPointId ? { delivery_point_id: deliveryPointId } : {}),
    ...(availabilityWindow ? { availability_window: availabilityWindow } : {}),
  };
};

const eventSignature = ({ id: _id, ...event }: ActivityEvent) => JSON.stringify(event);

export const createActivityTracker = (options: ActivityTrackerOptions) => {
  const createId = options.createId ?? (() => crypto.randomUUID());
  const setTimer = options.setTimer ?? window.setTimeout.bind(window);
  const clearTimer = options.clearTimer ?? window.clearTimeout.bind(window);
  const flushDelayMs = options.flushDelayMs ?? DEFAULT_FLUSH_DELAY_MS;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const maxDeliveryAttempts = options.maxDeliveryAttempts ?? DEFAULT_MAX_DELIVERY_ATTEMPTS;
  const maxEventAgeMs = options.maxEventAgeMs ?? DEFAULT_MAX_EVENT_AGE_MS;
  const maxBufferedEvents = options.maxBufferedEvents ?? DEFAULT_MAX_BUFFERED_EVENTS;
  const now = options.now ?? Date.now;
  const getSessionEpoch = options.getSessionEpoch ?? (() => null);
  const queue: BufferedActivityEvent[] = [];
  const lastSignature = new Map<ActivityAction, string>();
  const retryTimers = new Set<number>();
  const deliveryStats = {
    accepted: 0,
    rejected: 0,
    retried: 0,
    dropped: 0,
  };
  let identity: string | null = null;
  let sessionEpoch: unknown = null;
  let timer: number | null = null;
  let bufferedEventCount = 0;
  let deliveryGeneration = 0;

  const clear = () => {
    deliveryGeneration += 1;
    deliveryStats.dropped += bufferedEventCount;
    bufferedEventCount = 0;
    queue.length = 0;
    lastSignature.clear();
    if (timer !== null) clearTimer(timer);
    for (const retryTimer of retryTimers) clearTimer(retryTimer);
    retryTimers.clear();
    timer = null;
  };

  const finishBatch = (count: number, outcome: 'accepted' | 'rejected' | 'dropped') => {
    deliveryStats[outcome] += count;
    bufferedEventCount = Math.max(0, bufferedEventCount - count);
  };

  const deliver = async (
    bufferedEvents: BufferedActivityEvent[],
    attempt: number,
    batchIdentity: string,
    batchSessionEpoch: unknown,
    generation: number,
  ) => {
    if (
      generation !== deliveryGeneration
      || identity !== batchIdentity
      || getSessionEpoch() !== batchSessionEpoch
    ) return;

    const oldestQueuedAt = Math.min(...bufferedEvents.map(item => item.queuedAt));
    if (now() - oldestQueuedAt > maxEventAgeMs) {
      finishBatch(bufferedEvents.length, 'dropped');
      return;
    }

    let outcome: ActivityDeliveryResult = 'retryable';
    try {
      const result = await options.send({ events: bufferedEvents.map(item => item.event) });
      outcome = typeof result === 'string' ? result : 'accepted';
    } catch {
      outcome = 'retryable';
    }

    if (
      generation !== deliveryGeneration
      || identity !== batchIdentity
      || getSessionEpoch() !== batchSessionEpoch
    ) return;

    if (outcome === 'accepted') {
      finishBatch(bufferedEvents.length, 'accepted');
      return;
    }
    if (outcome === 'rejected') {
      finishBatch(bufferedEvents.length, 'rejected');
      return;
    }
    if (attempt >= maxDeliveryAttempts || now() - oldestQueuedAt >= maxEventAgeMs) {
      finishBatch(bufferedEvents.length, 'dropped');
      return;
    }

    deliveryStats.retried += bufferedEvents.length;
    const delay = retryDelayMs * (2 ** (attempt - 1));
    const retryTimer = setTimer(() => {
      retryTimers.delete(retryTimer);
      void deliver(bufferedEvents, attempt + 1, batchIdentity, batchSessionEpoch, generation);
    }, delay);
    retryTimers.add(retryTimer);
  };

  const flush = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (!identity || queue.length === 0) return;
    if (getSessionEpoch() !== sessionEpoch) {
      clear();
      return;
    }
    const events = queue.splice(0, MAX_BATCH_SIZE);
    void deliver(events, 1, identity, sessionEpoch, deliveryGeneration);
    if (queue.length > 0) timer = setTimer(flush, flushDelayMs);
  };

  const enqueue = (action: ActivityAction, details: ActivityDetails) => {
    if (!identity) return;
    if (getSessionEpoch() !== sessionEpoch) {
      clear();
      return;
    }
    const event = sanitizeActivity(action, details, createId);
    if (!event) return;
    const signature = eventSignature(event);
    if (lastSignature.get(action) === signature) return;
    if (bufferedEventCount >= maxBufferedEvents) {
      deliveryStats.dropped += 1;
      return;
    }
    lastSignature.set(action, signature);
    queue.push({ event, queuedAt: now() });
    bufferedEventCount += 1;
    if (queue.length >= MAX_BATCH_SIZE) flush();
    else if (timer === null) timer = setTimer(flush, flushDelayMs);
  };

  return {
    setSession(nextIdentity: string | null) {
      const nextSessionEpoch = nextIdentity ? getSessionEpoch() : null;
      if (
        identity !== nextIdentity
        || sessionEpoch !== nextSessionEpoch
      ) clear();
      identity = nextIdentity;
      sessionEpoch = nextIdentity ? nextSessionEpoch : null;
    },
    clear,
    flush,
    getDeliveryStats(): ActivityDeliveryStats {
      return { ...deliveryStats, pending: bufferedEventCount };
    },
    trackPage(page: string) {
      enqueue('page_view', { page });
    },
    trackMarketView(details: ActivityDetails) {
      enqueue('market_view', details);
    },
    trackMarketFilter(details: ActivityDetails) {
      enqueue('market_filter', details);
    },
  };
};

export const activity = createActivityTracker({
  send: (batch) => api.activity.record(batch),
  getSessionEpoch: getAuthGeneration,
});
