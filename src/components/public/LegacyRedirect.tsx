import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isSupportedLang } from '../../i18n';

export default function LegacyRedirect() {
  const { i18n } = useTranslation();
  const { pathname, search, hash } = useLocation();
  const detected = i18n.language?.split('-')[0] || 'en';
  const lang = isSupportedLang(detected) ? detected : 'en';
  return <Navigate to={`/${lang}${pathname}${search}${hash}`} replace />;
}
