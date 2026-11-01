import React from 'react';
import { Bell, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../context/AuthContext';
import { useMarketSupport } from '../../context/MarketSupportContext';
import { useTradeAlertPrompt } from '../../hooks/useTradeAlertPrompt';

const CARD_CLASS = 'absolute bottom-4 left-4 z-30 w-[min(calc(100%-2rem),20rem)] rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
const BUTTON_FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24558A] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900';

/**
 * Small card offering browser notifications to signed-in users who have not
 * turned them on. It sits at the bottom-left of the workspace (inside the
 * layout's content column, beside the sidebar), clear of the bottom-right
 * toasts and feedback button and the bottom-centre deployment notice, and
 * under the server status banner. It never takes focus.
 */
export const TradeAlertPrompt: React.FC = () => {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const { isActive: isMarketSupportActive } = useMarketSupport();
  const { visible, confirmed, turnOn, notNow } = useTradeAlertPrompt(user?.id ?? '', isMarketSupportActive);

  if (confirmed) {
    return (
      <div role="status" className={`${CARD_CLASS} flex items-center gap-2 text-sm`}>
        <Check size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        {t('tradeAlertPrompt.confirmed')}
      </div>
    );
  }

  if (!visible) return null;

  return (
    <section role="region" aria-label={t('tradeAlertPrompt.label')} className={CARD_CLASS}>
      <div className="flex items-start gap-3">
        <Bell size={18} className="mt-0.5 shrink-0 text-[#24558A] dark:text-sky-400" aria-hidden="true" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t('tradeAlertPrompt.title')}</h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{t('tradeAlertPrompt.body')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={turnOn}
              className={`rounded-md bg-[#24558A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1c4470] ${BUTTON_FOCUS}`}
            >
              {t('tradeAlertPrompt.turnOn')}
            </button>
            <button
              type="button"
              onClick={notNow}
              className={`rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 ${BUTTON_FOCUS}`}
            >
              {t('tradeAlertPrompt.notNow')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
