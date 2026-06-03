import { Outlet, useParams, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isSupportedLang } from '../../i18n';

export default function PublicLanguageWrapper() {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  if (!lang || !isSupportedLang(lang)) {
    return <Navigate to="/en/" replace />;
  }

  const currentLang = i18n.language?.split('-')[0];
  if (currentLang !== lang) {
    void i18n.changeLanguage(lang);
    return null;
  }

  return <Outlet />;
}
