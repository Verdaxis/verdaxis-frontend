import { useEffect, type ReactNode } from 'react';
import { Outlet, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '../LoadingScreen';
import { isSupportedLang } from '../../i18n';

export default function PublicLanguageWrapper({ invalidLanguageElement }: { invalidLanguageElement: ReactNode }) {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  // Server redirects can land directly on a localized page and skip LanguageRedirect.
  useEffect(() => {
    if (!lang || !isSupportedLang(lang) || !referralCode) return;
    try {
      sessionStorage.setItem('verdaxis_ref_code', referralCode);
    } catch {
      // A blocked storage preference must not prevent public browsing.
    }
  }, [lang, referralCode]);

  if (!lang || !isSupportedLang(lang)) return invalidLanguageElement;

  const currentLang = i18n.language?.split('-')[0];
  if (currentLang !== lang) {
    void i18n.changeLanguage(lang);
    return <LoadingScreen fullScreen />;
  }

  return <Outlet />;
}
