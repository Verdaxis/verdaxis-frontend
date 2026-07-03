import { Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { isSupportedLang } from '../../i18n';

export default function LanguageRedirect() {
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();

  // Affiliate-style referral links land on the root (/?ref=CODE). Stash the
  // code so RegisterPage can attribute the signup even though the visitor
  // browses the marketing pages first (Sprint 3 item 14).
  const refCode = searchParams.get('ref');
  if (refCode) {
    sessionStorage.setItem('verdaxis_ref_code', refCode);
  }

  const detected = i18n.language?.split('-')[0] || 'en';
  const lang = isSupportedLang(detected) ? detected : 'en';
  return <Navigate to={`/${lang}/`} replace />;
}
