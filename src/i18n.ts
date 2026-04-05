import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const SUPPORTED_LANGS = ['en', 'zh'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export function isSupportedLang(lang: string): lang is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lang);
}

type NamespaceResources = Record<string, Record<string, unknown>>;

const localeModules = import.meta.glob('./locales/*/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;

const resources = Object.entries(localeModules).reduce<NamespaceResources>((acc, [path, mod]) => {
  const match = path.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) {
    return acc;
  }

  const [, lang, namespace] = match;
  acc[lang] ??= {};
  acc[lang][namespace] = mod.default;
  return acc;
}, {});

const namespaces = Array.from(
  new Set(
    Object.values(resources).flatMap((langResources) => Object.keys(langResources))
  )
);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: namespaces,
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'verdaxis-lang',
      caches: ['localStorage'],
    },
});

i18n.on('languageChanged', (lng) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('verdaxis-lang', lng);
  }
});

export async function loadNamespace(ns: string): Promise<void> {
  void ns;
}

export default i18n;
