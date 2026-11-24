import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEn from './locales/en/common.json';

export const SUPPORTED_LANGS = ['en', 'zh'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export function isSupportedLang(lang: string): lang is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

function applyDocumentLanguage(lng?: string) {
  if (typeof document === 'undefined') return;

  const normalized = lng?.split('-')[0];
  const lang = normalized && isSupportedLang(normalized) ? normalized : 'en';
  document.documentElement.lang = lang;

  try {
    localStorage.setItem('verdaxis-lang', lang);
  } catch {
    // Ignore storage failures in restricted browser contexts.
  }
}

const lazyNamespaces: Record<string, Record<string, () => Promise<any>>> = {
  en: {
    agent: () => import('./locales/en/agent.json'),
    public: () => import('./locales/en/public.json'),
    auth: () => import('./locales/en/auth.json'),
    trading: () => import('./locales/en/trading.json'),
    rfq: () => import('./locales/en/rfq.json'),
    compliance: () => import('./locales/en/compliance.json'),
    dashboard: () => import('./locales/en/dashboard.json'),
    fleet: () => import('./locales/en/fleet.json'),
    education: () => import('./locales/en/education.json'),
    admin: () => import('./locales/en/admin.json'),
    settings: () => import('./locales/en/settings.json'),
    tutorial: () => import('./locales/en/tutorial.json'),
  },
  zh: {
    agent: () => import('./locales/zh/agent.json'),
    common: () => import('./locales/zh/common.json'),
    public: () => import('./locales/zh/public.json'),
    auth: () => import('./locales/zh/auth.json'),
    trading: () => import('./locales/zh/trading.json'),
    rfq: () => import('./locales/zh/rfq.json'),
    compliance: () => import('./locales/zh/compliance.json'),
    dashboard: () => import('./locales/zh/dashboard.json'),
    fleet: () => import('./locales/zh/fleet.json'),
    education: () => import('./locales/zh/education.json'),
    admin: () => import('./locales/zh/admin.json'),
    settings: () => import('./locales/zh/settings.json'),
    tutorial: () => import('./locales/zh/tutorial.json'),
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: commonEn },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    nonExplicitSupportedLngs: true,
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
      lookupLocalStorage: 'verdaxis-lang',
      caches: ['localStorage'],
    },
  })
  .then(() => applyDocumentLanguage(i18n.language));

i18n.on('languageChanged', applyDocumentLanguage);

export function resourceLanguage(instance: typeof i18n = i18n): SupportedLang {
  return instance.language?.split('-')[0] === 'zh' ? 'zh' : 'en';
}

const requestedNamespaces = new Set(['common']);
const pendingLoads = new Map<string, Promise<void>>();

function loadLanguageNamespace(ns: string, lang: SupportedLang): Promise<void> | undefined {
  const loader = lazyNamespaces[lang]?.[ns];
  if (!loader || i18n.hasResourceBundle(lang, ns)) return;

  const key = `${lang}/${ns}`;
  const pending = pendingLoads.get(key);
  if (pending) return pending;

  const load = loader().then((mod) => {
    i18n.addResourceBundle(lang, ns, mod.default || mod, true, true);
  }).catch(() => {
    console.error(`[i18n] Failed to load ${key} translations.`);
  }).finally(() => pendingLoads.delete(key));
  pendingLoads.set(key, load);
  return load;
}

function namespaceLoads(ns: string, lang: SupportedLang) {
  const languages: SupportedLang[] = lang === 'zh' ? ['zh', 'en'] : ['en'];
  return languages.flatMap((language) => loadLanguageNamespace(ns, language) ?? []);
}

export async function loadNamespace(ns: string, lang = resourceLanguage()): Promise<void> {
  requestedNamespaces.add(ns);
  await Promise.all(namespaceLoads(ns, lang));
}

// Publish a language change only after namespaces already in use are ready.
// Direct useTranslation consumers receive the same atomic change as useNamespace.
const changeLanguage = i18n.changeLanguage.bind(i18n);
let languageRequest = 0;
i18n.changeLanguage = (language, callback) => {
  const request = ++languageRequest;
  const lang = language?.split('-')[0] === 'zh' ? 'zh' : 'en';
  const namespaces = [...requestedNamespaces];
  const loads = namespaces.flatMap((ns) => namespaceLoads(ns, lang));
  if (loads.length === 0) return changeLanguage(language, callback);

  return Promise.all(loads).then(async () => {
    // Include namespaces requested by the current page while the switch was pending.
    while (request === languageRequest && namespaces.length < requestedNamespaces.size) {
      const added = [...requestedNamespaces].slice(namespaces.length);
      namespaces.push(...added);
      await Promise.all(added.flatMap((ns) => namespaceLoads(ns, lang)));
    }
    if (request === languageRequest) return changeLanguage(language, callback);
    return i18n.t.bind(i18n);
  });
};

export default i18n;
