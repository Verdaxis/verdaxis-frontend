import type { ReactNode } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '../LoadingScreen';
import { isSupportedLang } from '../../i18n';

export default function PublicLanguageWrapper({ invalidLanguageElement }: { invalidLanguageElement: ReactNode }) {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();

  if (!lang || !isSupportedLang(lang)) return invalidLanguageElement;

  const currentLang = i18n.language?.split('-')[0];
  if (currentLang !== lang) {
    void i18n.changeLanguage(lang);
    return <LoadingScreen fullScreen />;
  }

  return <Outlet />;
}
