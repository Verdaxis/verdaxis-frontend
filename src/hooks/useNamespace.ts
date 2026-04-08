import { useTranslation } from 'react-i18next';
import { loadNamespace } from '../i18n';

export function useNamespace(ns: string) {
  const { t, i18n } = useTranslation(ns);
  void loadNamespace(ns);
  const activeLanguage = i18n.resolvedLanguage || i18n.language;
  const ready = i18n.hasResourceBundle(activeLanguage, ns);
  return { t, ready };
}
