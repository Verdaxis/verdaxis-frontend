import { useEffect } from 'react';
import { Outlet, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isSupportedLang } from '../../i18n';

export default function PublicLanguageWrapper() {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  useEffect(() => {
    if (lang && isSupportedLang(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  if (!lang || !isSupportedLang(lang)) {
    return <Navigate to="/en/" replace />;
  }

  return <Outlet />;
}
