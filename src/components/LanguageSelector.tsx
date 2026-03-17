import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { SUPPORTED_LANGS, type SupportedLang } from '../i18n';

interface LanguageSelectorProps {
  onLanguageChange?: (lang: SupportedLang) => void;
  variant?: 'light' | 'dark';
}

export default function LanguageSelector({ onLanguageChange, variant = 'dark' }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();

  const handleChange = (lang: SupportedLang) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
    } else {
      i18n.changeLanguage(lang);
    }
  };

  const textColor = variant === 'light' ? 'text-white' : 'text-slate-700 dark:text-slate-200';

  return (
    <div className="relative group">
      <button
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${textColor}`}
        aria-label="Change language"
      >
        <Globe size={16} />
        <span className="text-sm font-medium">
          {t(`lang.${i18n.language}`)}
        </span>
      </button>
      <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
        {SUPPORTED_LANGS.map((lang) => (
          <button
            key={lang}
            onClick={() => handleChange(lang)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors first:rounded-t-lg last:rounded-b-lg ${
              i18n.language === lang ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {t(`lang.${lang}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
