import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { TOUR_DEFINITIONS } from '../components/GuidedTutorial';
import { buildPrimarySidebarItems } from '../components/layout/sidebarConfig';

import enTutorial from '../locales/en/tutorial.json';
import zhTutorial from '../locales/zh/tutorial.json';

const componentSource = [
  'src/components/CommandCenter.tsx',
  'src/components/Marketplace.tsx',
  'src/components/MarketTerminal.tsx',
  'src/components/watchlist/MarketRadarPanel.tsx',
].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8')).join('\n');

function tourIdFromTarget(target: string): string | null {
  const match = target.match(/^\[data-tour="([^"]+)"\]$/);
  return match?.[1] ?? null;
}

describe('guided tutorial contract', () => {
  it('has complete English and Chinese copy for every buyer and supplier step', () => {
    for (const [mode, definitions] of Object.entries(TOUR_DEFINITIONS)) {
      const prefix = mode === 'BUYER' ? 'buyer' : 'supplier';

      definitions.forEach((_, index) => {
        for (const locale of [enTutorial, zhTutorial]) {
          expect(locale[`${prefix}.${index}.title` as keyof typeof locale]).toEqual(expect.any(String));
          expect(locale[`${prefix}.${index}.content` as keyof typeof locale]).toEqual(expect.any(String));
        }
      });
    }
  });

  it('targets real enterprise action surfaces instead of only sidebar navigation', () => {
    const requiredTourIds = [
      'command-center-primary-action',
      'market-radar-panel',
      'marketplace-primary-action',
      'marketplace-orderbook-tab',
      'marketplace-orderbook-surface',
      'terminal-header',
      'terminal-forward-curve',
      'terminal-activity-feed',
      'terminal-price-alerts',
    ];

    for (const tourId of requiredTourIds) {
      expect(componentSource).toContain(`data-tour="${tourId}"`);
    }

    for (const definitions of Object.values(TOUR_DEFINITIONS)) {
      expect(definitions.some((step) => step.target === '[data-tour="command-center-primary-action"]')).toBe(true);
      expect(definitions.some((step) => step.target === '[data-tour="market-radar-panel"]')).toBe(true);
      expect(definitions.some((step) => step.target === '[data-tour="marketplace-primary-action"]')).toBe(true);
      expect(definitions.some((step) => step.target === '[data-tour="marketplace-orderbook-surface"]')).toBe(true);
      expect(definitions.find((step) => step.target === '[data-tour="marketplace-orderbook-surface"]')?.activateTarget)
        .toBe('[data-tour="marketplace-orderbook-tab"]');
    }
  });

  it('keeps routed steps aligned with sidebar navigation and terminal in-page sequencing', () => {
    const t = ((key: string) => key) as any;

    for (const [mode, definitions] of Object.entries(TOUR_DEFINITIONS)) {
      const sidebarItems = buildPrimarySidebarItems(t, mode as 'BUYER' | 'SUPPLIER');
      const pages = new Set(sidebarItems.map((item) => item.page));
      const keys = new Set(sidebarItems.map((item) => item.key));

      definitions.forEach((step) => {
        if (step.route) {
          expect(pages.has(step.route)).toBe(true);
        }

        const tourId = tourIdFromTarget(step.target);
        if (tourId?.startsWith('nav-')) {
          expect(keys.has(tourId.replace('nav-', ''))).toBe(true);
        }
      });

      const terminalRouteIndex = definitions.findIndex((step) => step.route === 'TERMINAL');
      const terminalInPageIndexes = ['terminal-forward-curve', 'terminal-activity-feed', 'terminal-price-alerts']
        .map((tourId) => definitions.findIndex((step) => step.target === `[data-tour="${tourId}"]`));

      expect(terminalRouteIndex).toBeGreaterThan(0);
      for (const index of terminalInPageIndexes) {
        expect(index).toBeGreaterThan(terminalRouteIndex);
        expect(definitions[index].route).toBeUndefined();
      }
    }
  });

  it('uses current product language for the externally promoted tour', () => {
    const enText = Object.values(enTutorial).join(' ');

    for (const phrase of ['Market Terminal', 'Market Radar', 'bid', 'ask', 'orderbook', 'indicative']) {
      expect(enText).toContain(phrase);
    }

    expect(enText).not.toContain('Inquire');
    expect(enText).not.toContain('inventory levels');
    expect(enText).not.toContain('revenue performance');
    expect(enText).not.toContain('price crossings');
  });
});
