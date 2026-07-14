export type AnalyticsRole = 'BUYER' | 'SUPPLIER' | 'ADMIN';
export type AnalyticsViewMode = 'BUYER' | 'SUPPLIER';
export type AnalyticsLanguage = 'en' | 'zh';
type MarketSide = 'BID' | 'ASK';
type DemoStatus = 'LIVE' | 'DEMO' | 'REFERENCE' | 'MIXED' | 'UNKNOWN';
type LandingCta = 'pilot' | 'how_it_works' | 'register' | 'register_interest';
type LandingCtaPlacement = 'hero' | 'calculator' | 'landing_bottom' | 'pilot_sidebar' | 'pilot_bottom';

export interface AnalyticsEventMap {
  landing_cta_clicked: { cta: LandingCta; placement: LandingCtaPlacement; language: AnalyticsLanguage };
  energy_calculator_started: { language: AnalyticsLanguage };
  energy_calculator_completed: { language: AnalyticsLanguage; fuel?: string; port?: string };
  public_language_changed: { from: AnalyticsLanguage; to: AnalyticsLanguage };
  signup_started: { entry_point: string; language: AnalyticsLanguage };
  signup_role_selected: { role: Exclude<AnalyticsRole, 'ADMIN'> };
  signup_submitted: { role: Exclude<AnalyticsRole, 'ADMIN'>; organization_path: string };
  signup_organization_required: { role: Exclude<AnalyticsRole, 'ADMIN'> };
  signup_organization_submitted: { role: Exclude<AnalyticsRole, 'ADMIN'>; organization_type: string; country: string };
  login_submitted: undefined;
  login_succeeded: { role: AnalyticsRole };
  login_failed: { reason_category: 'invalid_credentials' | 'account_state' | 'network' | 'server' | 'unknown' };
  platform_navigation: { destination: string; view_mode: AnalyticsViewMode };
  market_slice_selected: { product: string; delivery_point: string; window: string };
  listing_opened: { product: string; delivery_point: string; window: string; side: MarketSide; demo_status: DemoStatus };
  order_form_opened: { product: string; delivery_point: string; window: string; side: MarketSide };
  order_form_submitted: { product: string; delivery_point: string; window: string; side: MarketSide };
  trade_confirmation_opened: { side: MarketSide; demo_status: DemoStatus };
  tutorial_started: { role: AnalyticsRole };
  tutorial_step_completed: { step: string; role: AnalyticsRole };
  tutorial_step_skipped: { step: string; role: AnalyticsRole };
  tutorial_completed: { role: AnalyticsRole };
  estimator_opened: undefined;
  estimator_completed: { port: string; fuel: string };
}

export interface AnalyticsIdentity {
  userId: string;
  role?: AnalyticsRole | null;
  organizationType?: string | null;
  viewMode?: AnalyticsViewMode | null;
  language?: AnalyticsLanguage | null;
}

interface UmamiClient {
  track: ((event: string, data?: Record<string, string>) => void) | ((payload: { url: string }) => void);
  identify?: (id: string, data?: Record<string, string>) => void;
}
interface AnalyticsWindow extends Window { umami?: UmamiClient }
interface AnalyticsOptions { host?: string; websiteId?: string; environment?: string; document?: Document; window?: AnalyticsWindow }
type QueuedOperation = (client: UmamiClient) => void;
type Validator = (value: unknown) => value is string;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;
const PATH_TOKEN_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const oneOf = <T extends string>(values: readonly T[]): Validator =>
  (value: unknown): value is string => typeof value === 'string' && values.includes(value as T);
const token: Validator = (value): value is string => typeof value === 'string' && TOKEN_PATTERN.test(value);
const pathToken: Validator = (value): value is string => typeof value === 'string' && PATH_TOKEN_PATTERN.test(value);
const role = oneOf(['BUYER', 'SUPPLIER', 'ADMIN'] as const);
const tradingRole = oneOf(['BUYER', 'SUPPLIER'] as const);
const language = oneOf(['en', 'zh'] as const);
const side = oneOf(['BID', 'ASK'] as const);
const demoStatus = oneOf(['LIVE', 'DEMO', 'REFERENCE', 'MIXED', 'UNKNOWN'] as const);
const landingCta = oneOf(['pilot', 'how_it_works', 'register', 'register_interest'] as const);
const landingCtaPlacement = oneOf(['hero', 'calculator', 'landing_bottom', 'pilot_sidebar', 'pilot_bottom'] as const);

const EVENT_SCHEMAS: { [K in keyof AnalyticsEventMap]: Record<string, Validator> } = {
  landing_cta_clicked: { cta: landingCta, placement: landingCtaPlacement, language },
  energy_calculator_started: { language },
  energy_calculator_completed: { fuel: token, port: token, language },
  public_language_changed: { from: language, to: language },
  signup_started: { entry_point: pathToken, language },
  signup_role_selected: { role: tradingRole },
  signup_submitted: { role: tradingRole, organization_path: pathToken },
  signup_organization_required: { role: tradingRole },
  signup_organization_submitted: {
    role: tradingRole, organization_type: token,
    country: (value): value is string => typeof value === 'string' && COUNTRY_PATTERN.test(value),
  },
  login_submitted: {}, login_succeeded: { role },
  login_failed: { reason_category: oneOf(['invalid_credentials', 'account_state', 'network', 'server', 'unknown'] as const) },
  platform_navigation: { destination: pathToken, view_mode: tradingRole },
  market_slice_selected: { product: token, delivery_point: token, window: token },
  listing_opened: { product: token, delivery_point: token, window: token, side, demo_status: demoStatus },
  order_form_opened: { product: token, delivery_point: token, window: token, side },
  order_form_submitted: { product: token, delivery_point: token, window: token, side },
  trade_confirmation_opened: { side, demo_status: demoStatus },
  tutorial_started: { role }, tutorial_step_completed: { step: token, role },
  tutorial_step_skipped: { step: token, role }, tutorial_completed: { role },
  estimator_opened: {}, estimator_completed: { port: token, fuel: token },
};

const normalizeHost = (host?: string): string | null => {
  if (!host) return null;
  try {
    const url = new URL(host);
    if (!['https:', 'http:'].includes(url.protocol)) return null;
    return url.origin + url.pathname.replace(/\/$/, '');
  } catch { return null; }
};

export const normalizeAnalyticsPath = (input: string): string => {
  try {
    const path = new URL(input, 'https://verdaxis.invalid').pathname.replace(/\/{2,}/g, '/');
    return path || '/';
  } catch { return '/'; }
};

const sanitizeProperties = <K extends keyof AnalyticsEventMap>(event: K, data: AnalyticsEventMap[K] | undefined) => {
  if (!data || typeof data !== 'object') return undefined;
  const result: Record<string, string> = {};
  for (const [key, validator] of Object.entries(EVENT_SCHEMAS[event])) {
    const value = (data as Record<string, unknown>)[key];
    if (validator(value)) result[key] = value;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

export const createAnalytics = (options: AnalyticsOptions) => {
  const host = normalizeHost(options.host);
  const websiteId = options.websiteId && UUID_PATTERN.test(options.websiteId) ? options.websiteId : null;
  const doc = options.document ?? (typeof document !== 'undefined' ? document : undefined);
  const win = options.window ?? (typeof window !== 'undefined' ? window as AnalyticsWindow : undefined);
  const queue: QueuedOperation[] = [];
  let initialized = false;
  const enabled = Boolean(host && websiteId && doc && win);
  const contextProperties = (): Record<string, string> => {
    if (!options.environment || !pathToken(options.environment) || !win) return {};
    const path = win.location.pathname;
    const surface = path.startsWith('/app') ? 'platform'
      : ['/login', '/register', '/onboarding', '/create-organization', '/verify-email'].some(prefix => path.startsWith(prefix)) ? 'signup'
      : 'landing';
    return { environment: options.environment, surface };
  };

  const safelyRun = (operation: QueuedOperation) => {
    if (!enabled || !win) return;
    try {
      if (win.umami) operation(win.umami);
      else if (queue.length < 50) queue.push(operation);
    } catch { /* analytics must not affect product behavior */ }
  };
  const flush = () => {
    if (!win?.umami) return;
    while (queue.length) {
      const operation = queue.shift();
      try { operation?.(win.umami); } catch { /* isolate collector failures */ }
    }
  };

  return {
    enabled,
    initialize() {
      if (!enabled || initialized || !doc || !host || !websiteId) return;
      initialized = true;
      if (doc.querySelector('script[data-verdaxis-analytics]')) return;
      const script = doc.createElement('script');
      script.defer = true;
      script.src = `${host}/script.js`;
      script.dataset.websiteId = websiteId;
      script.dataset.autoTrack = 'false';
      script.dataset.verdaxisAnalytics = 'true';
      script.addEventListener('load', flush, { once: true });
      script.addEventListener('error', () => { queue.length = 0; }, { once: true });
      doc.head.appendChild(script);
    },
    track<K extends keyof AnalyticsEventMap>(event: K, ...args: AnalyticsEventMap[K] extends undefined ? [] : [AnalyticsEventMap[K]]) {
      const data = sanitizeProperties(event, args[0]);
      const properties = { ...contextProperties(), ...data };
      safelyRun(client => (client.track as (name: string, properties?: Record<string, string>) => void)(event, Object.keys(properties).length ? properties : undefined));
    },
    trackPage(path: string) {
      safelyRun(client => (client.track as (payload: { url: string }) => void)({ url: normalizeAnalyticsPath(path) }));
    },
    identify(identity: AnalyticsIdentity) {
      if (!UUID_PATTERN.test(identity.userId)) return;
      const data: Record<string, string> = {};
      if (identity.role && role(identity.role)) data.role = identity.role;
      if (identity.organizationType && token(identity.organizationType)) data.organization_type = identity.organizationType;
      if (identity.viewMode && tradingRole(identity.viewMode)) data.view_mode = identity.viewMode;
      if (identity.language && language(identity.language)) data.language = identity.language;
      safelyRun(client => client.identify?.(identity.userId, data));
    },
  };
};

export const analytics = createAnalytics({
  host: import.meta.env.VITE_ANALYTICS_HOST,
  websiteId: import.meta.env.VITE_ANALYTICS_WEBSITE_ID,
  environment: import.meta.env.MODE,
});
