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
    const sidebarSource = readFileSync(resolve(process.cwd(), 'src/components/layout/sidebarConfig.ts'), 'utf8');

    expect(tutorialSource).not.toContain('nav-TERMINAL');
    expect(tutorialSource).not.toContain('nav-COMPLIANCE');
    expect(tutorialSource).not.toContain('nav-QUOTES');
    expect(tutorialSource).not.toContain('nav-INVENTORY');
    expect(tutorialSource).toContain('nav-FORWARD_CURVE');
    expect(tutorialSource).toContain('nav-WATCHLISTS');
    expect(sidebarSource).toContain("key: 'FORWARD_CURVE'");
  });

  it('keeps trade tape status 24-hour and history-scoped instead of market-hours based', () => {
    const tradeTapeSource = readFileSync(resolve(process.cwd(), 'src/components/TradeTape.tsx'), 'utf8');
    const forwardSource = readFileSync(resolve(process.cwd(), 'src/components/ForwardCurveWorkspace.tsx'), 'utf8');
    const marketActivitySource = readFileSync(resolve(process.cwd(), 'src/utils/marketActivity.ts'), 'utf8');
    const tradingEn = readFileSync(resolve(process.cwd(), 'src/locales/en/trading.json'), 'utf8');

    expect(tradeTapeSource).toContain("t('tradeTape.status.deliveryPointHistory')");
    expect(tradeTapeSource).toContain("t('tradeTape.status.regionHistory')");
    expect(tradeTapeSource).toContain('Clock3');
    expect(tradeTapeSource).toContain('MarketActivityBadge');
    expect(marketActivitySource).toContain('Demo activity seeded for platform preview');
    expect(tradeTapeSource).not.toContain('setMarketOpen');
    expect(tradeTapeSource).not.toContain('market_hours');
    expect(tradeTapeSource).not.toContain('tradeTape.market.open');
    expect(tradeTapeSource).not.toContain('tradeTape.market.closed');
    expect(forwardSource).toContain("t('tradeTape.status.deliveryPointHistory')");
    expect(forwardSource).toContain("t('tradeTape.emptyMarketContext')");
    expect(forwardSource).toContain('describeMarketActivity');
    expect(forwardSource).not.toContain('Live · 7D history');
    expect(tradingEn).toContain('"tradeTape.empty": "No confirmed trades in the last 7 days"');
    expect(tradingEn).toContain('"tradeTape.emptyMarketContext": "No confirmed trades in the last 7 days for this selected market context."');
    expect(tradingEn).toContain('"tradeTape.status.deliveryPointHistory"');
    expect(tradingEn).toContain('"tradeTape.status.regionHistory"');
    expect(tradingEn).not.toContain('tradeTape.market.open');
    expect(tradingEn).not.toContain('tradeTape.market.closed');
  });

  it('keeps trade tape filtering aligned with the documented OpenAPI contract', () => {
    const openapi = JSON.parse(readFileSync(resolve(process.cwd(), 'openapi.json'), 'utf8'));
    const parameters = openapi.paths['/api/trade-tape'].get.parameters.map((param: { name: string }) => param.name);

    expect(parameters).toEqual(expect.arrayContaining([
      'fuel_type',
      'market_product',
      'delivery_point_id',
      'region',
      'availability_window',
      'skip',
      'limit',
    ]));
  });

  it('keeps reference price date filtering aligned with the documented OpenAPI contract', () => {
    const openapi = JSON.parse(readFileSync(resolve(process.cwd(), 'openapi.json'), 'utf8'));
    const parameters = Object.fromEntries(
      openapi.paths['/api/prices/reference'].get.parameters.map((param: { name: string; deprecated?: boolean }) => [param.name, param])
    ) as Record<string, { deprecated?: boolean }>;

    expect(parameters.date_from).toBeDefined();
    expect(parameters.date_to).toBeDefined();
    expect(parameters.from?.deprecated).toBe(true);
    expect(parameters.to?.deprecated).toBe(true);
  });

  it('keeps interactive guided tour anchors wired to current market surfaces', () => {
    const tutorialSource = readFileSync(resolve(process.cwd(), 'src/components/GuidedTutorial.tsx'), 'utf8');
    const marketplaceSource = readFileSync(resolve(process.cwd(), 'src/components/Marketplace.tsx'), 'utf8');
    const orderbookSource = readFileSync(resolve(process.cwd(), 'src/components/OrderBook.tsx'), 'utf8');
    const orderModalSource = readFileSync(resolve(process.cwd(), 'src/components/OrderPlaceModal.tsx'), 'utf8');
    const forwardSource = readFileSync(resolve(process.cwd(), 'src/components/ForwardCurveWorkspace.tsx'), 'utf8');

    [
      'marketplace-primary-action',
      'marketplace-tab-orderbook',
      'marketplace-market-scope',
      'trade-modal',
      'trade-review-button',
      'trade-final-confirm-button',
    ].forEach((anchor) => {
      expect(tutorialSource).toContain(anchor);
      expect(marketplaceSource).toContain(anchor);
    });

    expect(marketplaceSource).toContain('marketplace-orderbook-panel');
    expect(orderbookSource).toContain('orderbook-actionable-level');
    expect(orderModalSource).toContain('order-modal-submit-boundary');
    expect(orderModalSource).toContain('order-modal-cancel');
    expect(orderModalSource).toContain('order-modal-close');
    expect(orderModalSource).toContain('max-h-[100dvh] sm:max-h-[85dvh]');
    expect(orderModalSource).not.toContain('h-[100dvh] sm:h-[85dvh]');
    expect(orderModalSource).toContain('className="min-h-0 flex flex-col bg-white dark:bg-slate-800"');
    expect(orderModalSource).toContain('className="flex-1 overflow-y-auto p-4 space-y-3"');
    expect(forwardSource).toContain('forward-curve-chart');
    expect(forwardSource).toContain('forward-open-marketplace');
    expect(forwardSource).toContain('forward-expand-period');
    expect(forwardSource).toContain('data-tour="forward-period-detail"');
    expect(forwardSource).toContain('aria-pressed={Boolean(selected)}');
    expect(forwardSource).toContain('Benchmark Source');
    expect(forwardSource).toContain('Single-Period Drilldown');
    expect(forwardSource).toContain('Signal Readiness');
    expect(forwardSource).toContain('No indications feed connected yet');
    expect(forwardSource).toContain('No stems feed connected yet');
    expect(forwardSource).toContain('No model-derived fair-value band yet');
    expect(forwardSource).toContain('marketSliceKey');
    expect(forwardSource).toContain('tradeDataSliceKey');
    expect(forwardSource).toContain('depthReadyForSelected');
    expect(tutorialSource).toContain('target: \'[data-tour="order-modal-submit-boundary"]\', titleKey: \'buyer.15.title\', contentKey: \'buyer.15.content\', placement: \'left\'');
    expect(tutorialSource).toContain('target: \'[data-tour="order-modal-submit-boundary"]\', titleKey: \'supplier.16.title\', contentKey: \'supplier.16.content\', placement: \'left\'');
  });

  it('keeps exact-slice requirements visible in the marketplace UI, not only in tour copy', () => {
    const marketplaceSource = readFileSync(resolve(process.cwd(), 'src/components/Marketplace.tsx'), 'utf8');
    const tutorialSource = readFileSync(resolve(process.cwd(), 'src/components/GuidedTutorial.tsx'), 'utf8');
    const tradingEn = readFileSync(resolve(process.cwd(), 'src/locales/en/trading.json'), 'utf8');
    const tutorialEn = readFileSync(resolve(process.cwd(), 'src/locales/en/tutorial.json'), 'utf8');

    expect(marketplaceSource).toContain('data-tour="marketplace-market-scope"');
    expect(marketplaceSource).toContain('orderbookSliceRequirements.map');
    expect(marketplaceSource).toContain("t('marketScope.title')");
    expect(tutorialSource).toContain('marketplace-market-scope');
    expect(tradingEn).toContain('"marketScope.title": "Market Scope"');
    expect(tutorialEn).not.toContain('If the checklist is visible');
  });

  it('keeps Marketplace filters pinned while only the lower market pane scrolls', () => {
    const marketplaceSource = readFileSync(resolve(process.cwd(), 'src/components/Marketplace.tsx'), 'utf8');

    expect(marketplaceSource).toContain('h-full min-h-0 flex flex-col overflow-hidden');
    expect(marketplaceSource).toContain('flex-none max-h-[50%] overflow-y-auto overscroll-contain');
    expect(marketplaceSource).toContain('flex-1 min-h-0 px-4 lg:px-10 pb-4');
    expect(marketplaceSource).toContain('flex h-full min-h-0 flex-col rounded-xl');
    expect(marketplaceSource).toContain('min-h-0 flex-1 overflow-auto');
    expect(marketplaceSource).toContain('flex-none border-t border-slate-200');
    expect(marketplaceSource).toContain('const PAGE_SIZE = 8');
    expect(marketplaceSource).not.toContain('h-full flex flex-col overflow-y-auto md:overflow-hidden');
    expect(marketplaceSource).not.toContain('md:flex-1 overflow-auto px-4 lg:px-10 pb-6');
    expect(marketplaceSource).toContain('min-w-[980px] border-collapse text-sm');
  });

  it('keeps click-driven tutorial steps navigable instead of trapping users', () => {
    const tutorialSource = readFileSync(resolve(process.cwd(), 'src/components/GuidedTutorial.tsx'), 'utf8');
    const tutorialEn = readFileSync(resolve(process.cwd(), 'src/locales/en/tutorial.json'), 'utf8');

    expect(tutorialSource).toContain('tooltipComponent={GuidedTooltip}');
    expect(tutorialSource).toContain('clickTargetToContinue');
    expect(tutorialSource).toContain('skipStepLabel');
    expect(tutorialSource).toContain('onSkipStep');
    expect(tutorialSource).toContain('clickActiveTarget');
    expect(tutorialSource).toContain('closeModalBeforeBackIfNeeded');
    expect(tutorialSource).toContain('scrollTargetIntoView');
    expect(tutorialSource).toContain("target.scrollIntoView({ block: 'center'");
    expect(tutorialSource).toContain('getScrollableAncestor');
    expect(tutorialSource).toContain('targetInsideViewport');
    expect(tutorialSource).toContain('targetInsideParent');
    expect(tutorialSource).toContain('disableScrolling');
    expect(tutorialSource).toContain('disableScrollParentFix');
    expect(tutorialSource).toContain('resolveViewportAwarePlacement');
    expect(tutorialSource).toContain('getPlacementCandidates');
    expect(tutorialSource).toContain('placementFitsViewport');
    expect(tutorialSource).toContain("width: 'min(360px, calc(100vw - 32px))'");
    expect(tutorialSource).toContain("window.addEventListener('resize', refreshPlacement)");
    expect(tutorialSource).toContain("window.addEventListener('scroll', refreshPlacement, true)");
    expect(tutorialSource).not.toContain('scrollToFirstStep');
    expect(tutorialSource).toContain('getTutorialSurface');
    expect(tutorialSource).toContain('clickIfPresent');
    expect(tutorialSource).toContain("hideCloseButton: true");
    expect(tutorialSource).not.toContain('closeProps');
    expect(tutorialSource).toContain("navigationDirection.current === 'backward' ? index - 1 : index + 1");
    expect(tutorialSource).toContain('order-modal-close');
    expect(tutorialSource).toContain('trade-modal-close');
    expect(tutorialSource).toContain("window.setTimeout(() => advanceTo(previousIndex), CLICK_ADVANCE_DELAY_MS)");
    expect(tutorialSource).not.toContain('hideFooter: clickStep');
    expect(tutorialSource).toContain('requiredSelector?: string');
    expect(tutorialSource).toContain('fallbackClickSelector?: string');
    expect(tutorialSource).toContain('missingTargetFallbackOffset?: number');
    expect(tutorialSource).toContain('definition.requiredSelector ? undefined : finish');
    expect(tutorialSource).toContain('advanceTo(Math.max(0, index - 1))');
    expect(tutorialSource).toContain('!definition.requiredSelector && !definition.waitForSelector');
    expect(tutorialSource).toContain('definition.fallbackClickSelector && clickIfPresent(definition.fallbackClickSelector)');
    expect(tutorialSource).toContain('waitForTarget(selector, () => clickIfPresent(selector))');
    expect(tutorialSource).toContain('advanceTo(index + definition.missingTargetFallbackOffset)');
    expect(tutorialEn).toContain('Click the highlighted control to continue');
    expect(tutorialEn).toContain('"locale.skipStep": "Skip Step"');
  });

  it('keeps forward curve tutorial steps inside the terminal viewport', () => {
    const tutorialSource = readFileSync(resolve(process.cwd(), 'src/components/GuidedTutorial.tsx'), 'utf8');
    const forwardSource = readFileSync(resolve(process.cwd(), 'src/components/ForwardCurveWorkspace.tsx'), 'utf8');

    expect(forwardSource).toContain('data-tour="forward-market-matrix-header"');
    expect(tutorialSource).toContain('target: \'[data-tour="forward-market-matrix-header"]\', titleKey: \'buyer.19.title\', contentKey: \'buyer.19.content\', placement: \'bottom-start\'');
    expect(tutorialSource).toContain('target: \'[data-tour="forward-market-matrix-header"]\', titleKey: \'supplier.20.title\', contentKey: \'supplier.20.content\', placement: \'bottom-start\'');
    expect(tutorialSource).not.toContain('target: \'[data-tour="forward-market-matrix"]\', titleKey: \'buyer.19.title\'');
    expect(tutorialSource).not.toContain('target: \'[data-tour="forward-market-matrix"]\', titleKey: \'supplier.20.title\'');
  });

  it('keeps stale intelligence map education and legacy ticker labels out of active map surfaces', () => {
    const intelligencePanelSource = readFileSync(resolve(process.cwd(), 'src/components/map/IntelligencePanel.tsx'), 'utf8');
    const tickerSource = readFileSync(resolve(process.cwd(), 'src/components/map/MarketWatchTicker.tsx'), 'utf8');

    expect(intelligencePanelSource).not.toContain('Education');
    expect(intelligencePanelSource).not.toContain('FuelEU & EU ETS Basics');
    expect(intelligencePanelSource).not.toContain('Alternative Fuel Guide');
    expect(tickerSource).not.toContain('Methanol (ARA)');
    expect(tickerSource).not.toContain('Biofuel (ARA)');
    expect(tickerSource).not.toContain('Ammonia (AG)');
    expect(tickerSource).toContain('MARKET_WATCH_PREFERENCES_KEY');
    expect(tickerSource).toContain('ACTIVE_MARKETPLACE_PRODUCT_OPTIONS');
    expect(tickerSource).toContain('api.catalog.deliveryPoints');
    expect(tickerSource).toContain('getCatalogDeliveryPointId');
    expect(tickerSource).toContain('api.prices.getSummaries');
    expect(tickerSource).toContain('delivery_point_id: deliveryPointId');
    expect(tickerSource).not.toContain('delivery_point_id: port.id');
    expect(tickerSource).not.toContain('fetchLiveMarketData');
    expect(tickerSource).not.toContain('region: port.name');
    expect(tickerSource).toContain("status: 'REFERENCE'");
    expect(tickerSource).toContain("status: 'UNAVAILABLE'");
  });

  it('keeps the Intelligence Map ticker clickable above the map canvas while preserving side-panel precedence', () => {
    const buyerMapSource = readFileSync(resolve(process.cwd(), 'src/components/BuyerMap.tsx'), 'utf8');
    const tickerSource = readFileSync(resolve(process.cwd(), 'src/components/map/MarketWatchTicker.tsx'), 'utf8');
    const intelligencePanelSource = readFileSync(resolve(process.cwd(), 'src/components/map/IntelligencePanel.tsx'), 'utf8');

    expect(buyerMapSource).toContain('flex-1 relative z-0');
    expect(buyerMapSource).toContain('pointer-events-auto absolute left-6 top-20 z-[9]');
    expect(buyerMapSource).toContain("isPanelOpen ? 'right-80 mr-6 max-w-none' : 'right-6 max-w-[calc(100%-3rem)]'");
    expect(buyerMapSource).not.toContain('pointer-events-auto absolute left-6 top-20 z-[8]');
    expect(buyerMapSource).not.toContain('pointer-events-auto absolute left-6 top-20 z-[20]');
    expect(buyerMapSource).not.toContain('pointer-events-auto absolute left-6 top-20 z-[9] max-w-[calc(100%-3rem)]');
    expect(tickerSource).toContain('w-[min(calc(100vw-3rem),520px)] max-w-full');
    expect(intelligencePanelSource).toContain('shadow-xl z-10 flex flex-col');
  });

  it('keeps marketplace benchmark labels framed as references instead of live liquidity', () => {
    const benchmarkSource = readFileSync(resolve(process.cwd(), 'src/components/trading/BenchmarkPriceBlock.tsx'), 'utf8');

    expect(benchmarkSource).toContain('Benchmark ref $');
    expect(benchmarkSource).toContain('No benchmark reference');
    expect(benchmarkSource).not.toMatch(/live benchmark/i);
  });

  it('keeps the Intelligence Map compliance estimator local, indicative, and non-certifying', () => {
    const estimatorSource = readFileSync(resolve(process.cwd(), 'src/components/map/ComplianceEstimatorCard.tsx'), 'utf8');
    const estimatorModelSource = readFileSync(resolve(process.cwd(), 'src/utils/complianceEstimator.ts'), 'utf8');
    const dashboardEn = readFileSync(resolve(process.cwd(), 'src/locales/en/dashboard.json'), 'utf8');

    expect(estimatorSource).toContain('estimateCompliancePlanning');
    expect(estimatorSource).toContain('verdaxis_marketplace_delivery_point_id');
    expect(estimatorSource).not.toContain('api.');
    expect(estimatorSource).not.toContain('fetch(');
    expect(estimatorModelSource.toLowerCase()).toContain('energy-weighted');
    expect(dashboardEn).toContain('Indicative planning estimate only');
    expect(dashboardEn).toContain('Not a compliance filing or legal determination');
    [
      'non-compliant',
      'certified savings',
      'tax due',
      'penalty avoided',
      'filing-ready',
    ].forEach((phrase) => {
      expect(estimatorSource.toLowerCase()).not.toContain(phrase);
      expect(dashboardEn.toLowerCase()).not.toContain(phrase);
    });
  });

  it('does not label listing-derived Intelligence Map prices as confirmed trades', () => {
    const buyerMapSource = readFileSync(resolve(process.cwd(), 'src/components/BuyerMap.tsx'), 'utf8');
    const mapLegendSource = readFileSync(resolve(process.cwd(), 'src/components/map/MapLegend.tsx'), 'utf8');
    const dashboardEn = readFileSync(resolve(process.cwd(), 'src/locales/en/dashboard.json'), 'utf8');

    expect(buyerMapSource).toContain('Recent listing indications');
    expect(buyerMapSource).toContain("t('buyerMap.referenceSpot')");
    expect(buyerMapSource).toContain("t('buyerMap.benchmarkReference')");
    expect(buyerMapSource).toContain("t('buyerMap.noOpenListingIndications')");
    expect(mapLegendSource).toContain("t('mapLegend.recentListings')");
    expect(dashboardEn).toContain('"lastDone": "Recent Listings"');
    expect(dashboardEn).toContain('Recent Listings — latest open listing indication');
    expect(buyerMapSource).not.toContain('Last Done: derive from listings');
    expect(buyerMapSource).not.toContain('most recent trade price');
  });

  it('labels global Intelligence Panel forward curves as indicative product references', () => {
    const intelligencePanelSource = readFileSync(resolve(process.cwd(), 'src/components/map/IntelligencePanel.tsx'), 'utf8');
    const dashboardEn = readFileSync(resolve(process.cwd(), 'src/locales/en/dashboard.json'), 'utf8');

    expect(intelligencePanelSource).toContain("t('intelligencePanel.indicativeForwardReferences')");
    expect(intelligencePanelSource).toContain("t(`intelligencePanel.${item.sourceKey}`)");
    expect(intelligencePanelSource).toContain("t('intelligencePanel.noDeliveryPointFilter')");
    expect(intelligencePanelSource).toContain("t('intelligencePanel.spotReference')");
    expect(dashboardEn).toContain('Indicative Forward References');
    expect(dashboardEn).toContain('Product-level reference');
    expect(dashboardEn).toContain('no selected delivery point filter');
    expect(dashboardEn).toContain('Spot ref');
  });

  it('anchors the orderbook tutorial step to a stable panel while advancing on executable levels', () => {
    const tutorialSource = readFileSync(resolve(process.cwd(), 'src/components/GuidedTutorial.tsx'), 'utf8');
    const tutorialEn = readFileSync(resolve(process.cwd(), 'src/locales/en/tutorial.json'), 'utf8');

    expect(tutorialSource).toContain('target: \'[data-tour="marketplace-orderbook-panel"]\', titleKey: \'buyer.7.title\'');
    expect(tutorialSource).toContain('target: \'[data-tour="marketplace-orderbook-panel"]\', titleKey: \'supplier.7.title\'');
    expect(tutorialSource).toContain('advanceOnSelector: \'[data-tour="orderbook-actionable-level"]\', waitForSelector: \'[data-tour="trade-modal"]\'');
    expect(tutorialSource).toContain('missingTargetFallbackOffset: 5');
    expect(tutorialEn).toContain('If there is no clickable ask in this slice');
    expect(tutorialEn).toContain('If there is no clickable bid in this slice');
  });

  it('guides users through exact market slice selection before the orderbook trade step', () => {
    const tutorialSource = readFileSync(resolve(process.cwd(), 'src/components/GuidedTutorial.tsx'), 'utf8');
    const marketplaceSource = readFileSync(resolve(process.cwd(), 'src/components/Marketplace.tsx'), 'utf8');
    const selectSource = readFileSync(resolve(process.cwd(), 'src/components/ui/VerdaxisSelect.tsx'), 'utf8');
    const tutorialEn = readFileSync(resolve(process.cwd(), 'src/locales/en/tutorial.json'), 'utf8');

    [
      'marketplace-product-sample',
      'marketplace-port-select',
      'marketplace-port-option-singapore',
      'marketplace-window-select',
      'marketplace-window-option-spot',
    ].forEach((anchor) => {
      expect(tutorialSource).toContain(anchor);
      expect(marketplaceSource).toContain(anchor);
    });

    expect(selectSource).toContain('tourId?: string');
    expect(selectSource).toContain('triggerTourId?: string');
    expect(selectSource).toContain('data-tour={triggerTourId}');
    expect(selectSource).toContain('data-tour={option.tourId}');
    expect(selectSource).toContain('z-[12000]');
    expect(marketplaceSource).toContain('data-tour-market-product={marketProduct === ALL_MARKET_PRODUCTS ?');
    expect(marketplaceSource).toContain('data-tour-port={resolvedPort}');
    expect(marketplaceSource).toContain('data-tour-window={availability}');
    expect(marketplaceSource).toContain('data-tour-tab={marketTab}');
    expect(marketplaceSource).toContain('data-market-product={productCode}');
    expect(marketplaceSource).toContain('aria-pressed={isActive}');
    expect(marketplaceSource).toContain('aria-expanded={filtersExpanded}');
    expect(marketplaceSource).toContain('triggerTourId="marketplace-port-select"');
    expect(marketplaceSource).toContain('triggerTourId="marketplace-window-select"');
    expect(marketplaceSource).toContain("tourId: port.name === 'Singapore' ? 'marketplace-port-option-singapore' : undefined");
    expect(marketplaceSource).toContain("tourId: option.value === SPOT_WINDOW ? 'marketplace-window-option-spot' : undefined");
    expect(tutorialSource).toContain("const TUTORIAL_SAMPLE_PRODUCT = 'BIO_METHANOL'");
    expect(tutorialSource).toContain("const TUTORIAL_SAMPLE_PORT = 'Singapore'");
    expect(tutorialSource).toContain("const TUTORIAL_SAMPLE_WINDOW = 'SPOT'");
    expect(tutorialSource).toContain('TUTORIAL_SAMPLE_PRODUCT_PORT_SELECTOR');
    expect(tutorialSource).toContain('target: \'[data-tour="marketplace-port-select"]\', titleKey: \'buyer.slicePort.title\', contentKey: \'buyer.slicePort.content\', placement: \'right\'');
    expect(tutorialSource).toContain('target: \'[data-tour="marketplace-window-select"]\', titleKey: \'buyer.sliceWindow.title\', contentKey: \'buyer.sliceWindow.content\', placement: \'right\'');
    expect(tutorialSource).toContain('target: \'[data-tour="marketplace-port-select"]\', titleKey: \'supplier.slicePort.title\', contentKey: \'supplier.slicePort.content\', placement: \'right\'');
    expect(tutorialSource).toContain('target: \'[data-tour="marketplace-window-select"]\', titleKey: \'supplier.sliceWindow.title\', contentKey: \'supplier.sliceWindow.content\', placement: \'right\'');
    expect(tutorialSource).toContain('fallbackClickSelector: \'[data-tour="marketplace-port-select"]\'');
    expect(tutorialSource).toContain('fallbackClickSelector: \'[data-tour="marketplace-window-select"]\'');
    expect(tutorialSource).not.toContain("target: '[data-tour=\"marketplace-port-option-singapore\"]'");
    expect(tutorialSource).not.toContain("target: '[data-tour=\"marketplace-window-option-spot\"]'");
    expect(tutorialSource).toContain('requiredSelector: TUTORIAL_SAMPLE_SLICE_SELECTOR');
    expect(tutorialSource).toContain('requiredSelector: `${TUTORIAL_SAMPLE_SLICE_SELECTOR}[data-tour-tab="orderbook"]`');
    expect(tutorialEn).toContain('If another port is selected, use Skip Step');
    expect(tutorialEn).toContain('If another window is selected, use Skip Step');
  });

  it('keeps click-to-advance tour targets limited to actionable controls', () => {
    const tutorialSource = readFileSync(resolve(process.cwd(), 'src/components/GuidedTutorial.tsx'), 'utf8');
    const clickTargets = [...tutorialSource.matchAll(/advanceOnSelector: '\[data-tour="([^"]+)"\]'/g)]
      .map((match) => match[1]);
    const allowedActionTargets = new Set([
      'nav-MAP',
      'nav-MARKETPLACE',
      'marketplace-product-sample',
      'marketplace-filter-toggle',
      'marketplace-port-select',
      'marketplace-port-option-singapore',
      'marketplace-window-select',
      'marketplace-window-option-spot',
      'marketplace-tab-orderbook',
      'orderbook-actionable-level',
      'trade-review-button',
      'trade-modal-close',
      'marketplace-primary-action',
      'order-modal-advanced-toggle',
      'order-modal-close',
      'nav-FORWARD_CURVE',
      'forward-open-marketplace',
      'nav-WATCHLISTS',
      'nav-ANALYTICS',
      'nav-TRADES',
    ]);

    expect(clickTargets.length).toBeGreaterThan(0);
    expect(clickTargets.every((target) => allowedActionTargets.has(target))).toBe(true);
    expect(clickTargets).not.toContain('order-modal-cancel');
    expect(clickTargets).not.toContain('order-modal-submit-boundary');
    expect(clickTargets).not.toContain('marketplace-orderbook-panel');
  });
});
