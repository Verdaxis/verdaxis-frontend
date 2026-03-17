import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadNamespace } from '../i18n';

export function useNamespace(ns: string) {
  const { t, i18n } = useTranslation(ns);
  const [ready, setReady] = useState(i18n.hasResourceBundle(i18n.language, ns));

  useEffect(() => {
    if (!ready) {
      loadNamespace(ns).then(() => setReady(true));
    }
  }, [ns, ready]);

  useEffect(() => {
    const check = () => {
      if (!i18n.hasResourceBundle(i18n.language, ns)) {
        setReady(false);
        loadNamespace(ns).then(() => setReady(true));
      }
    };
    i18n.on('languageChanged', check);
    return () => { i18n.off('languageChanged', check); };
  }, [ns, i18n]);

  return { t, ready };
}
