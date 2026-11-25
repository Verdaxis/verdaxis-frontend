import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadNamespace, resourceLanguage } from '../i18n';

export function useNamespace(ns: string) {
  const { t, i18n } = useTranslation(ns);
  const lang = resourceLanguage(i18n);
  const request = `${lang}/${ns}`;
  const hasBundle = i18n.hasResourceBundle(lang, ns) && i18n.hasResourceBundle('en', ns);
  const [completed, setCompleted] = useState<string>();

  useEffect(() => {
    if (hasBundle) return;
    let cancelled = false;
    void loadNamespace(ns, lang).then(() => {
      if (!cancelled) setCompleted(request);
    });
    return () => { cancelled = true; };
  }, [hasBundle, lang, ns, request]);

  // Keep the English fallback usable if loading the selected bundle fails.
  return { t, ready: hasBundle || completed === request };
}
