import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEn from './locales/en/common.json';
import commonZh from './locales/zh/common.json';

export const SUPPORTED_LANGS = ['en', 'zh'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export function isSupportedLang(lang: string): lang is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: commonEn },
      zh: { common: commonZh },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    nonExplicitSupportedLngs: true,
    defaultNS: 'common',
    ns: ['common'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'verdaxis-lang',
      caches: ['localStorage'],
    },
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  localStorage.setItem('verdaxis-lang', lng);
});

const lazyNamespaces: Record<string, Record<string, () => Promise<any>>> = {
  en: {
    public: () => import('./locales/en/public.json'),
    auth: () => import('./locales/en/auth.json'),
    trading: () => import('./locales/en/trading.json'),
    compliance: () => import('./locales/en/compliance.json'),
    dashboard: () => import('./locales/en/dashboard.json'),
    fleet: () => import('./locales/en/fleet.json'),
    ai: () => import('./locales/en/ai.json'),
    education: () => import('./locales/en/education.json'),
    admin: () => import('./locales/en/admin.json'),
    settings: () => import('./locales/en/settings.json'),
    tutorial: () => import('./locales/en/tutorial.json'),
  },
  zh: {
    public: () => import('./locales/zh/public.json'),
    auth: () => import('./locales/zh/auth.json'),
    trading: () => import('./locales/zh/trading.json'),
    compliance: () => import('./locales/zh/compliance.json'),
    dashboard: () => import('./locales/zh/dashboard.json'),
    fleet: () => import('./locales/zh/fleet.json'),
    ai: () => import('./locales/zh/ai.json'),
    education: () => import('./locales/zh/education.json'),
    admin: () => import('./locales/zh/admin.json'),
    settings: () => import('./locales/zh/settings.json'),
    tutorial: () => import('./locales/zh/tutorial.json'),
  },
};

export async function loadNamespace(ns: string): Promise<void> {
  for (const lang of SUPPORTED_LANGS) {
    if (!i18n.hasResourceBundle(lang, ns)) {
      const loader = lazyNamespaces[lang]?.[ns];
      if (loader) {
        const mod = await loader();
        i18n.addResourceBundle(lang, ns, mod.default || mod, true, true);
      }
    }
  }
}

export default i18n;
