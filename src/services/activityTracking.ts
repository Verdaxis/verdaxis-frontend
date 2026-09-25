import { MARKET_PRODUCTS, type MarketProduct } from '../types';
import { normalizeAvailabilityWindow } from '../utils/availabilityWindow';
import { api } from './api';
import { getAuthGeneration } from './authToken';

export const ACTIVITY_CONSENT_VERSION = 2 as const;

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
  consent_version: typeof ACTIVITY_CONSENT_VERSION;
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
  send: (batch: ActivityBatch) => void | Promise<unknown>;
  createId?: () => string;
  setTimer?: typeof window.setTimeout;
  clearTimer?: typeof window.clearTimeout;
  flushDelayMs?: number;
  getSessionEpoch?: () => unknown;
}

const MAX_BATCH_SIZE = 50;
const DEFAULT_FLUSH_DELAY_MS = 250;
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
  const getSessionEpoch = options.getSessionEpoch ?? (() => null);
  const queue: ActivityEvent[] = [];
  const lastSignature = new Map<ActivityAction, string>();
  let identity: string | null = null;
  let consentGranted = false;
  let sessionEpoch: unknown = null;
  let timer: number | null = null;

  const clear = () => {
    queue.length = 0;
    lastSignature.clear();
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const flush = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (!identity || !consentGranted || queue.length === 0) return;
    if (getSessionEpoch() !== sessionEpoch) {
      clear();
      return;
    }
    const events = queue.splice(0, MAX_BATCH_SIZE);
    try {
      void Promise.resolve(options.send({
        consent_version: ACTIVITY_CONSENT_VERSION,
        events,
      })).catch(() => undefined);
    } catch {
      // Activity telemetry must never affect product behavior.
    }
    if (queue.length > 0) timer = setTimer(flush, flushDelayMs);
  };

  const enqueue = (action: ActivityAction, details: ActivityDetails) => {
    if (!identity || !consentGranted) return;
    if (getSessionEpoch() !== sessionEpoch) {
      clear();
      return;
    }
    const event = sanitizeActivity(action, details, createId);
    if (!event) return;
    const signature = eventSignature(event);
    if (lastSignature.get(action) === signature) return;
    lastSignature.set(action, signature);
    queue.push(event);
    if (queue.length >= MAX_BATCH_SIZE) flush();
    else if (timer === null) timer = setTimer(flush, flushDelayMs);
  };

  return {
    setSession(nextIdentity: string | null, nextConsent: boolean) {
      const nextSessionEpoch = nextIdentity && nextConsent ? getSessionEpoch() : null;
      if (
        identity !== nextIdentity
        || consentGranted !== nextConsent
        || sessionEpoch !== nextSessionEpoch
      ) clear();
      identity = nextIdentity;
      consentGranted = Boolean(nextIdentity && nextConsent);
      sessionEpoch = consentGranted ? nextSessionEpoch : null;
    },
    clear,
    flush,
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
