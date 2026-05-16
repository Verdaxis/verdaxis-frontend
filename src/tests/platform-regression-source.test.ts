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

  it('keeps platform navigation from blanking the app shell while lazy screens load', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(appSource).toContain('useTransition');
    expect(appSource).toContain('startPageTransition(() => setCurrentPage(page))');
    expect(appSource).toContain('const DashboardContentLoading');
    expect(appSource).toContain('<Suspense fallback={<DashboardContentLoading />}>');
    expect(appSource).toContain('<Suspense fallback={null}>');
  });

  it('keeps dashboard navigation timing instrumented for dogfood and monitoring', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const headerSource = readFileSync(resolve(process.cwd(), 'src/components/layout/Header.tsx'), 'utf8');
    const layoutSource = readFileSync(resolve(process.cwd(), 'src/components/Layout.tsx'), 'utf8');
    const perfSource = readFileSync(resolve(process.cwd(), 'src/utils/navigationPerformance.ts'), 'utf8');
    const packageJson = readFileSync(resolve(process.cwd(), 'package.json'), 'utf8');

    expect(appSource).toContain('recordDashboardNavigationStart(currentPage, page, viewMode)');
    expect(appSource).toContain('<DashboardContentReady page={currentPage} viewMode={viewMode}>');
    expect(headerSource).toContain('data-tour="mobile-menu"');
    expect(layoutSource).toContain('data-dashboard-page={currentPage}');
    expect(perfSource).toContain('route commit timing');
    expect(perfSource).toContain("'verdaxis:dashboard-navigation'");
    expect(perfSource).toContain('__VERDAXIS_NAV_METRICS__');
    expect(perfSource).toContain('performance.measure');
    expect(packageJson).toContain('"smoke:navigation:setup"');
    expect(packageJson).toContain('"smoke:navigation": "python3 scripts/smoke_navigation.py"');
  });

  it('keeps navigation smoke measuring page-specific usability markers, not only React commit', () => {
    const scriptSource = readFileSync(resolve(process.cwd(), 'scripts/smoke_navigation.py'), 'utf8');
    const mapSource = readFileSync(resolve(process.cwd(), 'src/components/BuyerMap.tsx'), 'utf8');
    const marketplaceSource = readFileSync(resolve(process.cwd(), 'src/components/Marketplace.tsx'), 'utf8');
    const terminalSource = readFileSync(resolve(process.cwd(), 'src/components/MarketTerminal.tsx'), 'utf8');
    const curveSource = readFileSync(resolve(process.cwd(), 'src/components/ForwardCurve.tsx'), 'utf8');

    expect(scriptSource).toContain('def wait_for_usable');
    expect(scriptSource).toContain("data-navigation-ready='FORWARD_CURVE'");
    expect(scriptSource).toContain('"routeCommitMs"');
    expect(scriptSource).toContain('"durationMs": round(float(completed_at - started_at), 1)');
    expect(scriptSource).toContain('page.goto(f"{base_url}/login"');
    expect(mapSource).toContain("data-navigation-ready={mapLoaded ? 'MAP' : undefined}");
    expect(marketplaceSource).toContain("data-navigation-ready={!loading ? 'MARKETPLACE' : undefined}");
    expect(terminalSource).toContain("data-navigation-ready={!loading ? 'TERMINAL' : undefined}");
    expect(curveSource).toContain("data-navigation-ready={isNavigationReady ? 'FORWARD_CURVE' : undefined}");
  });

  it('keeps global dashboard prefetch focused on activation, not heavy map and chart chunks', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
    const globalPrefetch = appSource.slice(
      appSource.indexOf('const prefetchActivationScreens'),
      appSource.indexOf('const schedulePlatformPrefetch')
    );

    expect(globalPrefetch).toContain("import('./components/Marketplace')");
    expect(globalPrefetch).toContain("import('./components/OrderPlaceModal')");
    expect(globalPrefetch).not.toContain("import('./components/BuyerMap')");
    expect(globalPrefetch).not.toContain("import('./components/MarketTerminal')");
    expect(globalPrefetch).not.toContain("import('./components/ForwardCurve')");
    expect(appSource).toContain("case 'MAP':");
    expect(appSource).toContain("case 'TERMINAL':");
  });

  it('keeps unrelated map and chart vendors split by the surfaces that use them', () => {
    const viteConfig = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');
    const packageJson = readFileSync(resolve(process.cwd(), 'package.json'), 'utf8');

    expect(viteConfig).toContain("'vendor-lightweight-charts': ['lightweight-charts']");
    expect(viteConfig).toContain("'vendor-recharts': ['recharts']");
    expect(viteConfig).toContain("'vendor-maplibre': ['maplibre-gl']");
    expect(viteConfig).toContain("'vendor-leaflet': ['leaflet', 'react-leaflet']");
    expect(viteConfig).not.toContain("'vendor-charts': ['lightweight-charts', 'recharts']");
    expect(viteConfig).not.toContain("'vendor-maps': ['maplibre-gl', 'leaflet', 'react-leaflet']");
    expect(packageJson).toContain('"build:check": "node scripts/check-build-artifacts.mjs"');
    expect(packageJson).toContain('npm run build:prod && npm run build:check');
  });
});
