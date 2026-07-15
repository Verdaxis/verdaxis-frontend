import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { AnalyticsTab } from '../../../types/productAnalytics';
import { ANALYTICS_TABS } from '../../../hooks/useProductAnalyticsFilters';

// Compact underline tab rail (§1.2/§1.7): role=tablist with Left/Right/
// Home/End keyboard behavior; horizontally scrollable at narrow widths while
// keeping the active tab visible.

export const AnalyticsTabRail: React.FC<{
  active: AnalyticsTab;
  onSelect: (tab: AnalyticsTab) => void;
}> = ({ active, onSelect }) => {
  const { t } = useTranslation('admin');
  const refs = useRef<Partial<Record<AnalyticsTab, HTMLButtonElement | null>>>({});

  const focusAndSelect = useCallback(
    (tab: AnalyticsTab) => {
      onSelect(tab);
      refs.current[tab]?.focus();
      refs.current[tab]?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    },
    [onSelect],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = ANALYTICS_TABS.indexOf(active);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusAndSelect(ANALYTICS_TABS[(index + 1) % ANALYTICS_TABS.length]);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusAndSelect(ANALYTICS_TABS[(index - 1 + ANALYTICS_TABS.length) % ANALYTICS_TABS.length]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusAndSelect(ANALYTICS_TABS[0]);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusAndSelect(ANALYTICS_TABS[ANALYTICS_TABS.length - 1]);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={t('pa.rail.label')}
      onKeyDown={onKeyDown}
      className="flex gap-1 border-b border-verdaxis-border overflow-x-auto"
    >
      {ANALYTICS_TABS.map(tab => (
        <button
          key={tab}
          ref={element => { refs.current[tab] = element; }}
          role="tab"
          id={`pa-tab-${tab}`}
          aria-selected={active === tab}
          aria-controls={`pa-panel-${tab}`}
          tabIndex={active === tab ? 0 : -1}
          onClick={() => onSelect(tab)}
          className={`whitespace-nowrap px-3.5 py-2 text-sm font-semibold border-b-2 transition-colors ${
            active === tab
              ? 'border-verdaxis text-verdaxis'
              : 'border-transparent text-verdaxis-text-muted hover:text-verdaxis-text'
          }`}
        >
          {t(`pa.tab.${tab}`)}
        </button>
      ))}
    </div>
  );
};
