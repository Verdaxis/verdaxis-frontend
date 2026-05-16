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

  it('keeps authenticated API calls on the in-memory token plus refresh-cookie contract', () => {
    const apiSource = readFileSync(resolve(process.cwd(), 'src/services/api.ts'), 'utf8');
    const rfqSource = readFileSync(resolve(process.cwd(), 'src/components/RFQPanel.tsx'), 'utf8');
    const rfqAlertSource = readFileSync(resolve(process.cwd(), 'src/components/rfq/RFQOfferAlert.tsx'), 'utf8');

    expect(apiSource).toContain("from './authToken'");
    expect(apiSource).toContain("credentials: 'include'");
    expect(apiSource.match(/fetchWithTimeout\(`\$\{API_URL\}\//g) ?? []).toHaveLength(1);
    expect(apiSource).not.toContain("localStorage.getItem('token')");
    expect(apiSource).not.toContain("localStorage.getItem('refresh_token')");
    expect(apiSource).not.toContain("localStorage.setItem('token'");
    expect(rfqSource).not.toContain("localStorage.getItem('token')");
    expect(rfqAlertSource).not.toContain("localStorage.getItem('token')");
  });

  it('wires post-order guidance actions from every primary order entry point', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const commandCenterSource = readFileSync(resolve(process.cwd(), 'src/components/CommandCenter.tsx'), 'utf8');
    const marketplaceSource = readFileSync(resolve(process.cwd(), 'src/components/Marketplace.tsx'), 'utf8');

    expect(appSource).toContain('onNavigate={handleNavigate}');
    expect(commandCenterSource).toContain('onNavigate={onNavigate}');
    expect(marketplaceSource).toContain('onNavigate={onNavigate}');
  });

  it('keeps supplier demand as a signal panel instead of a marketplace alias', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const commandCenterSource = readFileSync(resolve(process.cwd(), 'src/components/CommandCenter.tsx'), 'utf8');
    const demandFeedSource = readFileSync(resolve(process.cwd(), 'src/components/SupplierDemandFeed.tsx'), 'utf8');

    expect(appSource).not.toContain("case 'DEMAND_FEED'");
    expect(appSource).toContain("page === 'ORDERBOOK' || page === 'DEMAND_FEED'");
    expect(commandCenterSource).toContain('<SupplierDemandFeed');
    expect(commandCenterSource).toContain("viewMode === 'SUPPLIER'");
    expect(demandFeedSource).toContain('api.demand.signals');
    expect(demandFeedSource).not.toContain('api.orderbook.listBids');
  });
});
