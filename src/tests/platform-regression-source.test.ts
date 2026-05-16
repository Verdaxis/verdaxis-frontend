import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('platform regression guards', () => {
  it('keeps the ask modal wide enough for translated metadata fields', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/components/OrderPlaceModal.tsx'), 'utf8');

    expect(source).toContain('max-w-2xl');
    expect(source).toContain('orderPlaceModal.label.specificationStandard');
    expect(source).toContain('orderPlaceModal.label.carbonIntensity');
  });

  it('hides every lightweight-charts TradingView attribution URL, including github.io', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const curveSource = readFileSync(resolve(process.cwd(), 'src/components/ForwardCurve.tsx'), 'utf8');

    expect(css).toContain('a[href*="tradingview"]');
    expect(curveSource).toContain("anchor.href?.includes('tradingview')");
    expect(curveSource).toContain('pointerEvents');
  });

  it('keeps guided tour targets aligned to existing sidebar navigation', () => {
    const tutorialSource = readFileSync(resolve(process.cwd(), 'src/components/GuidedTutorial.tsx'), 'utf8');

    expect(tutorialSource).not.toContain('nav-QUOTES');
    expect(tutorialSource).not.toContain('nav-INVENTORY');
    expect(tutorialSource).toContain('nav-COMPLIANCE');
    expect(tutorialSource).toContain('nav-WATCHLISTS');
  });
});
