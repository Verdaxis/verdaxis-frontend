"""Local public-page smoke. All non-loopback requests are blocked or synthetic."""
import functools
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def main():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT / 'dist'))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    observations = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            for width in (390, 1440):
                context = browser.new_context(viewport={'width': width, 'height': 900}, service_workers='block')
                api_requests = []
                errors = []

                def route_request(route):
                    request = route.request
                    url = urlsplit(request.url)
                    if url.path.startswith('/api/'):
                        api_requests.append({'method': request.method, 'path': url.path})
                        if url.path == '/api/auth/refresh':
                            route.fulfill(status=401, content_type='application/json', body='{}')
                        elif url.path == '/api/orderbook/aggregated' or url.path.startswith('/api/catalog/'):
                            route.fulfill(status=200, content_type='application/json', body='[]')
                        elif url.path.startswith('/api/stream/'):
                            route.fulfill(status=200, content_type='text/event-stream', body=': synthetic\n\n')
                        else:
                            route.fulfill(status=404, content_type='application/json', body='{}')
                    elif url.hostname == '127.0.0.1' and url.port == server.server_port:
                        route.continue_()
                    else:
                        route.abort()

                context.route('**/*', route_request)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                for path in ('/en/', '/zh/', '/en/tools/energy-calculator/', '/en/map/producers/'):
                    page.goto(f'http://127.0.0.1:{server.server_port}{path}', wait_until='networkidle')
                    page.locator('h1').first.wait_for()
                    assert page.locator('h1').first.inner_text().strip(), path
                    assert not page.locator('[data-public-prerender]').count(), 'React did not mount'
                    assert not any('/activity' in item['path'] for item in api_requests)
                    assert not errors, errors
                    observations.append({'viewport': width, 'path': path, 'mounted': True, 'activity_requests': 0})
                context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    output = ROOT / 'work/phase0/browser-result.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(observations, indent=2) + '\n')
    print(f'{len(observations)} local public-page checks passed; zero activity calls; no external egress.')


if __name__ == '__main__':
    main()
