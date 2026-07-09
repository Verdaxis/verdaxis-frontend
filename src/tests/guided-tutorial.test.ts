import { describe, expect, it } from 'vitest';

import { getGuidedTutorialStepDefinitions } from '../components/GuidedTutorial';
import { buildPrimarySidebarItems } from '../components/layout/sidebarConfig';
import type { TFunction } from 'i18next';

import enTutorial from '../locales/en/tutorial.json';
import zhTutorial from '../locales/zh/tutorial.json';

function tourIdFromTarget(target: string): string | null {
  const match = target.match(/^\[data-tour="([^"]+)"\]$/);
  return match?.[1] ?? null;
}

describe('guided tutorial contract', () => {
  it.each(['BUYER', 'SUPPLIER'] as const)('has complete English and Chinese copy for every %s step', (mode) => {
    getGuidedTutorialStepDefinitions(mode).forEach((step) => {
      for (const locale of [enTutorial, zhTutorial]) {
        expect(locale[step.titleKey as keyof typeof locale]).toEqual(expect.any(String));
        expect(locale[step.contentKey as keyof typeof locale]).toEqual(expect.any(String));
      }
    });
  });

  it.each(['BUYER', 'SUPPLIER'] as const)('keeps %s routed steps aligned with sidebar navigation', (mode) => {
    const t = ((key: string) => key) as TFunction;
    const sidebarItems = buildPrimarySidebarItems(t, mode);
    const keys = new Set(sidebarItems.map((item) => item.key));

    getGuidedTutorialStepDefinitions(mode).forEach((step) => {
      const tourId = tourIdFromTarget(step.target);
      if (tourId?.startsWith('nav-')) {
        expect(keys.has(tourId.replace('nav-', ''))).toBe(true);
      }
    });
  });

  it.each(['BUYER', 'SUPPLIER'] as const)('includes the current marketplace and monitoring surfaces for %s', (mode) => {
    const targets = getGuidedTutorialStepDefinitions(mode).map((step) => step.target);

    [
      '[data-tour="marketplace-primary-action"]',
      '[data-tour="marketplace-tab-orderbook"]',
      '[data-tour="marketplace-orderbook-panel"]',
      '[data-tour="forward-curve-chart"]',
      '[data-tour="forward-market-matrix-header"]',
      '[data-tour="forward-latest-signals"]',
      '[data-tour="nav-WATCHLISTS"]',
      '[data-tour="nav-ANALYTICS"]',
      '[data-tour="nav-TRADES"]',
    ].forEach((target) => {
      expect(targets).toContain(target);
    });
  });

  it('uses current product language for the externally promoted tour', () => {
    const enText = Object.values(enTutorial).join(' ').toLowerCase();

    for (const phrase of ['bid', 'ask', 'orderbook', 'forward curve']) {
      expect(enText).toContain(phrase);
    }

    expect(enText).not.toContain('inquire');
    expect(enText).not.toContain('inventory levels');
    expect(enText).not.toContain('revenue performance');
    expect(enText).not.toContain('price crossings');
  });
});
