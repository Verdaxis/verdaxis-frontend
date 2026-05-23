import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isSupportedLang, loadNamespace } from '../i18n';

function resourceLanguage(i18n: ReturnType<typeof useTranslation>['i18n']): string {
  const resolved = i18n.resolvedLanguage?.split('-')[0];
  if (resolved && isSupportedLang(resolved)) return resolved;

  const current = i18n.language?.split('-')[0];
  if (current && isSupportedLang(current)) return current;

  return 'en';
}

export function useNamespace(ns: string) {
  const { t, i18n } = useTranslation(ns);
  const [ready, setReady] = useState(i18n.hasResourceBundle(resourceLanguage(i18n), ns));

  useEffect(() => {
    let cancelled = false;
    const hasBundle = i18n.hasResourceBundle(resourceLanguage(i18n), ns);
    setReady(hasBundle);

    if (!hasBundle) {
      loadNamespace(ns).then(() => {
        if (!cancelled) setReady(true);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [ns, i18n, i18n.language]);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      if (!i18n.hasResourceBundle(resourceLanguage(i18n), ns)) {
        setReady(false);
        loadNamespace(ns).then(() => {
          if (!cancelled) setReady(true);
        });
      } else {
        setReady(true);
      }
    };
    i18n.on('languageChanged', check);
    return () => {
      cancelled = true;
      i18n.off('languageChanged', check);
    };
  }, [ns, i18n]);

  return { t, ready };
}
