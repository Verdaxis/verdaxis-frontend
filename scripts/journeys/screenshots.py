"""Screenshot baselines: the same-look gate for the refactor.

Screens are captured at a fixed viewport with animations disabled, fonts
stubbed, Mapbox tiles replaced by a solid color, and every time-varying label
frozen (the order book's snapshot age, clock ticks, notification times). A
baseline set lives in ``scripts/journeys/baselines/``; ``compare`` fails on
any pixel difference above the tolerance.
"""
import argparse
import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

from .browser_harness import Harness
from .png_diff import diff_ratio

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BASELINES = Path(__file__).resolve().parent / 'baselines'
VIEWPORT = {'width': 1440, 'height': 1000}
TOLERANCE = 0.002  # 0.2% of pixels may differ
BUYER = 'buyer@example.com'
SUPPLIER = 'supplier@example.com'
ADMIN = 'admin@example.com'
PASSWORD = 'Journeys-Password-7!'

# Frozen wall clock: every Date read returns the same instant, so "updated Ns
# ago", countdowns, notification times and the order book's snapshot age render
# identically. The instant is captured when the page loads, not hard-coded:
# a fixed past instant would make every freshly minted JWT look expired and the
# auth context would log straight back out. performance.now() is deliberately
# left alone because React 19 schedules work from it.
FREEZE_CLOCK = """
(() => {
    const FROZEN = Date.now();
    const RealDate = Date;
    class FrozenDate extends RealDate {
        constructor(...args) { args.length ? super(...args) : super(FROZEN); }
        static now() { return FROZEN; }
    }
    window.Date = FrozenDate;
})();
"""


class ScreenshotHarness(Harness):
    """Journey harness with deterministic-timing additions."""

    def __init__(self, browser, base, api, theme='dark'):
        tile = (11, 18, 32) if theme == 'dark' else (222, 228, 236)
        super().__init__(browser, base, api, viewport=VIEWPORT, tile_color=tile)
        self.theme = theme
        self.context.add_init_script(FREEZE_CLOCK)
        # Pre-dismiss the cookie banner and fix the theme before React mounts,
        # so neither the banner nor a theme flip is part of any baseline.
        self.context.add_init_script(
            f"try {{ localStorage.setItem('theme', '{theme}'); }} catch (e) {{}}"
            "try { localStorage.setItem('verdaxis:cookie-preferences',"
            " JSON.stringify({version: 1, optionalAnalytics: false})); } catch (e) {}")


def baseline_dir():
    """Where baselines live.

    The committed set is ``scripts/journeys/baselines``. Recording writes to
    whatever ``JOURNEYS_BASELINES_DIR`` names instead, because the test host's
    lane wrapper resets the working tree (untracked files included) at the
    start of every call: a recorded image written into the checkout would be
    deleted before it could be retrieved. The runner points that variable at
    the mounted run directory.
    """
    import os
    override = os.environ.get('JOURNEYS_BASELINES_DIR')
    return Path(override) if override else DEFAULT_BASELINES


def capture(browser, base, api, shot, api_tokens=None):
    """Capture one named screen; returns the PNG bytes."""
    theme = shot.get('theme', 'dark')
    harness = ScreenshotHarness(browser, base, api, theme=theme)
    page = harness.page
    try:
        if shot['kind'] == 'public':
            page.goto(base + shot['path'], wait_until='networkidle', timeout=45000)
        else:
            email = {'admin': ADMIN, 'supplier': SUPPLIER}.get(shot.get('actor', 'buyer'), BUYER)
            from .journeys import open_app
            page = open_app(harness, email, PASSWORD)
            page.goto(base + shot['path'], wait_until='networkidle', timeout=45000)
            if shot.get('tab') == 'orderbook':
                # The order book renders only for one exact product, port and
                # window, so the B30 chip and the spot window are picked before
                # the tab opens.
                page.locator('[data-market-product="B30"]').click()
                page.wait_for_timeout(800)
                page.locator('[data-tour="marketplace-filter-toggle"]').click()
                page.wait_for_selector('#marketplace-advanced-filters', timeout=10000)
                page.locator('[data-tour="marketplace-port-select"]').click()
                page.locator('[role="option"]', has_text='Singapore').first.click()
                page.wait_for_timeout(800)
                page.locator('[data-tour="marketplace-window-select"]').click()
                page.locator('[data-tour="marketplace-window-option-spot"]').first.click()
                page.wait_for_timeout(600)
                page.locator('[data-tour="marketplace-tab-orderbook"]').click()
                page.wait_for_selector('[data-tour="orderbook-panel"]', timeout=30000)
        # Let React settle, then take the shot with animations disabled.
        page.wait_for_timeout(shot.get('settle', 2500))
        png = page.screenshot(full_page=shot.get('full_page', False), animations='disabled')
        return png
    finally:
        harness.close()


def spec():
    """The committed screen set: name, route, actor, theme."""
    return [
        {'name': 'public-landing-light', 'kind': 'public', 'path': '/en/', 'theme': 'light'},
        {'name': 'public-how-it-works-light', 'kind': 'public', 'path': '/en/how-it-works', 'theme': 'light'},
        {'name': 'marketplace-buyer-dark', 'kind': 'app', 'path': '/app/marketplace', 'actor': 'buyer', 'theme': 'dark'},
        {'name': 'marketplace-buyer-light', 'kind': 'app', 'path': '/app/marketplace', 'actor': 'buyer', 'theme': 'light'},
        {'name': 'orderbook-buyer-dark', 'kind': 'app', 'path': '/app/marketplace', 'actor': 'buyer', 'theme': 'dark', 'tab': 'orderbook'},
        {'name': 'trades-supplier-dark', 'kind': 'app', 'path': '/app/trades', 'actor': 'supplier', 'theme': 'dark'},
        {'name': 'map-buyer-dark', 'kind': 'app', 'path': '/app/map', 'actor': 'buyer', 'theme': 'dark', 'settle': 4000},
        {'name': 'map-buyer-light', 'kind': 'app', 'path': '/app/map', 'actor': 'buyer', 'theme': 'light', 'settle': 4000},
        {'name': 'admin-users-dark', 'kind': 'app', 'path': '/app/admin', 'actor': 'admin', 'theme': 'dark', 'settle': 3500},
    ]


def run(browser, base, api, mode='compare', tolerance=TOLERANCE):
    """Record or compare every screen in the spec; returns result entries."""
    baselines = baseline_dir()
    baselines.mkdir(parents=True, exist_ok=True)
    results = []
    for shot in spec():
        try:
            png = capture(browser, base, api, shot)
        except Exception as error:  # noqa: BLE001 - one screen must not hide the rest
            results.append({'name': shot['name'], 'passed': False,
                            'error': f'{type(error).__name__}: {error}'[:300]})
            print(f"  [FAIL] {shot['name']} {type(error).__name__}: {error}"[:300])
            continue
        target = baselines / f"{shot['name']}.png"
        if mode == 'record':
            target.write_bytes(png)
            results.append({'name': shot['name'], 'recorded': True,
                            'bytes': len(png), 'path': str(target)})
            print(f"  [recorded] {shot['name']} ({len(png)} bytes) {target}")
            continue
        if not target.exists():
            results.append({'name': shot['name'], 'error': 'missing baseline', 'passed': False})
            print(f"  [MISSING] {shot['name']}")
            continue
        ratio = diff_ratio(target.read_bytes(), png)
        ok = ratio <= tolerance
        results.append({'name': shot['name'], 'diffRatio': round(ratio, 6), 'passed': ok})
        print(f"  [{'PASS' if ok else 'FAIL'}] {shot['name']} diff={ratio:.4%}")
        if not ok:
            (baselines / f"{shot['name']}.actual.png").write_bytes(png)
    (baselines / 'manifest.json').write_text(json.dumps(
        {'viewport': VIEWPORT, 'tolerance': tolerance,
         'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ'), 'results': results}, indent=2) + '\n')
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['record', 'compare'])
    parser.add_argument('--base', required=True, help='bundle origin, http://127.0.0.1:PORT')
    parser.add_argument('--api', required=True, help='disposable API origin, http://127.0.0.1:PORT')
    parser.add_argument('--tolerance', type=float, default=TOLERANCE)
    args = parser.parse_args()

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            results = run(browser, args.base, args.api, mode=args.command,
                          tolerance=args.tolerance)
        finally:
            browser.close()
    failed = [r for r in results if not r.get('passed')]
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
