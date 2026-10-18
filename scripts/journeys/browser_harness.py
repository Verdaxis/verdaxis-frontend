"""Playwright helpers shared by the journey runner and the screenshot baselines.

Two rules matter for every run:

* Determinism. Mapbox tiles, styles, fonts, and Google Fonts are stubbed (or
  routed to transparent PNGs) so no run needs a token or the network. That
  includes the app's own webfonts: the committed screenshot baselines were
  captured with no webfont loaded, so `/assets/*.woff2` is stubbed too. SSE
  stream bodies cannot pass through Playwright's route proxy, so ``/stream/``
  is aborted exactly like ``phase0_gate_browser.py`` does.
* Real backend. API calls are forwarded to the disposable backend origin the
  bundle was built against (the harness takes that origin as a parameter, so
  the same code works for a loopback backend and for the live one), with
  credentialed CORS headers added so the production bundle accepts them.
"""
import json
import os
import uuid
import time
from urllib.parse import urlsplit

from .request_volume import STREAM_ROUTES, RequestLedger, StreamTracker
from .stream_relay import validate_origin

MAPBOX_HOSTS = ('api.mapbox.com', 'api.tiles.mapbox.com', 'tiles.mapbox.com',
                'fonts.mapbox.com')
FONT_HOSTS = ('fonts.googleapis.com', 'fonts.gstatic.com')

# 1x1 transparent PNG, kept for icon fallbacks during journeys.
TRANSPARENT_PNG = (b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00'
                   b'\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\n'
                   b'IDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00'
                   b'\x00\x00IEND\xaeB`\x82')

# Minimal valid JSON style: one background layer. Mapbox GL accepts it and the
# ECA/port layers install on top because BuyerMap adds sources itself.
MAPBOX_STYLE = {
    'version': 8,
    'name': 'Journeys stub',
    'sources': {},
    'layers': [{'id': 'background', 'type': 'background',
                'paint': {'background-color': '#0b1220'}}],
    'glyphs': 'https://fonts.mapbox.com/journeys-stub/{fontstack}/{range}.pbf',
}


def solid_tile_png(rgb=(11, 18, 32)):
    """1x1 PNG filled with one RGB color; upscaled by the map as the basemap."""
    import struct
    import zlib

    def chunk(tag, data):
        raw = tag + data
        return (struct.pack('>I', len(data)) + raw
                + struct.pack('>I', zlib.crc32(raw) & 0xffffffff))

    header = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header)
            + chunk(b'IDAT', zlib.compress(b'\x00' + bytes(rgb)))
            + chunk(b'IEND', b''))


class JourneyFailure(Exception):
    """One journey step failed with evidence attached."""


class Harness:
    """One browser context with API forwarding and external stubs installed."""

    def __init__(self, browser, base, api_origin, viewport=None, tile_color=(11, 18, 32),
                 reduced_motion=None, streams='blocked', ledger=None, category='browser', stream_tracker=None):
        # api_origin is the bundle's VITE_API_URL origin, for example
        # 'http://127.0.0.1:54321' or 'https://api.verdaxis.exchange'.
        validate_origin(api_origin)
        self.base = base
        self.api_origin = api_origin.rstrip('/')
        self.streams = streams
        self.ledger = ledger if ledger is not None else RequestLedger()
        self.category = category
        self.tracker = stream_tracker if stream_tracker is not None else StreamTracker()
        self.scope = [0, None, None, None]
        self.context_id = uuid.uuid4().hex
        self.children = []
        self.closed = False
        self.stream_maxima = {}
        self.streams_after_close = 0
        self._direct_sequence = 0
        self.requests = []
        self.errors = []
        self.console = []
        self.failed_requests = []
        self.tile_color = tile_color
        options = {
            'service_workers': 'block',
            'viewport': viewport or {'width': 1440, 'height': 1000},
            # Fixed clock inputs are per-page; the context itself stays generic.
            'device_scale_factor': 1,
        }
        if reduced_motion is not None:
            # Screenshot baselines run with the reduced-motion user setting:
            # GSAP and Lenis animate the public landing continuously, and every
            # public component honors the media query, so this is the
            # deterministic state for a same-look capture.
            options['reduced_motion'] = reduced_motion
        self.context = browser.new_context(**options)
        self.context.add_init_script("""
            Object.defineProperty(HTMLElement.prototype, 'animate', {
                value: () => ({ finished: Promise.resolve(), cancel() {}, finish() {} }),
            });
            try { HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open',''); }; } catch {}
        """)
        self.context.expose_binding('__journeyStreamEvent', self._stream_event)
        if streams == 'live':
            self.context.add_init_script("""
                (() => {
                    const NativeEventSource = window.EventSource;
                    const active = new Map();
                    let sequence = 0;
                    const maxima = {};
                    window.__journeyStreams = { active, maxima, sources: new Set() };
                    window.EventSource = class extends NativeEventSource {
                        constructor(input, options) {
                            const url = new URL(input, location.href);
                            const channel = url.pathname.split('/').pop();
                            const key = channel + ':current-context';
                            const identity = String(++sequence);
                            const notify = event => window.__journeyStreamEvent(identity, channel, event, sessionStorage.getItem('verdaxis_market_support_context_id'));
                            if (/^\\/api\\/stream\\/(orderbook|prices|trades)$/.test(url.pathname)) {
                                url.protocol = location.protocol;
                                url.host = location.host;
                            }
                            super(url.href, options);
                            window.__journeyStreams.sources.add(this);
                            let opened = false;
                            const remove = () => {
                                if (opened) active.set(key, Math.max(0, (active.get(key) || 0) - 1));
                                opened = false;
                                notify('close');
                            };
                            this.addEventListener('open', () => {
                                if (!opened) active.set(key, (active.get(key) || 0) + 1);
                                opened = true;
                                notify('open');
                                maxima[key] = Math.max(maxima[key] || 0, active.get(key));
                            });
                            this.addEventListener('error', remove);
                            const close = this.close.bind(this);
                            this.close = () => { remove(); close(); window.__journeyStreams.sources.delete(this); };
                        }
                    };
                })();
            """)
        self.context.on('request', self._record_request)
        self.context.on('requestfailed', lambda request: self.ledger.finish(request, 'failed'))
        self.context.on('requestfinished', lambda request: self.ledger.finish(request, 'finished'))
        self.page = self.context.new_page()
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.page.on('console', self._console)
        self.context.route('**/*', self._route)

    def _stream_event(self, source, identity, channel, event, support):
        scope = [*self.scope[:3], support or None]
        self.tracker.event((self.context_id, identity), channel, scope, event)

    def _record_request(self, request):
        self.ledger.record(request, request.method, request.url, category=self.category)

    def begin_window(self):
        self.ledger = RequestLedger()
        self.window_started = time.monotonic()

    def wait_window(self, seconds):
        remaining = seconds - (time.monotonic() - self.window_started)
        if remaining > 0:
            self.page.wait_for_timeout(remaining * 1000)

    def child(self):
        child = self.__class__(self.context.browser, self.base, self.api_origin,
                               streams=self.streams, ledger=self.ledger, category=self.category,
                               stream_tracker=self.tracker)
        self.children.append(child)
        return child

    def _console(self, message):
        if message.type in ('error', 'warning'):
            self.console.append(f'{message.type}: {message.text}'[:300])

    def diagnostics(self):
        """Page state, console errors, and failed requests for failure evidence."""
        try:
            body = self.page.locator('body').inner_text()[:200].replace('\n', ' ')
            url = self.page.url
        except Exception:
            body, url = '', '?'
        return (f'url={url} body={body!r} | '
                + ' | '.join(self.console[-3:] + self.failed_requests[-3:]))[:600]

    # -- routing ---------------------------------------------------------
    def _route(self, route):
        request = route.request
        parsed = urlsplit(request.url)
        host = parsed.hostname or ''
        path = parsed.path
        if request.url.startswith(self.api_origin + '/'):
            if path.startswith('/api/stream/'):
                # Infinite SSE bodies cannot pass through route.fulfill.
                route.abort()
                return
            self._forward(route, parsed)
            return
        if request.url.startswith(self.base + '/'):
            if path in STREAM_ROUTES and self.streams == 'live':
                route.continue_()
                return
            # Webfonts are stubbed exactly like the Google Fonts hosts below,
            # for the reason the module docstring gives: the committed
            # screenshot baselines were captured without any webfont loaded.
            # The app serves its own fonts from this origin (refactor step 3b),
            # so the stub has to follow them here.
            if path.endswith('.woff2'):
                route.fulfill(status=200, content_type='font/woff2', body=b'')
                return
            # Same-origin bundle assets move on to the static server. The map's
            # ECA overlay chunk arrives this way, so it is recorded as evidence.
            if 'eca' in path.lower():
                self.requests.append((request.method, path))
            route.continue_()
            return
        if host in MAPBOX_HOSTS:
            self._stub_mapbox(route, parsed)
            return
        if host in FONT_HOSTS:
            route.fulfill(status=200, content_type='font/woff2', body=b'')
            return
        self.failed_requests.append(f'{request.method} {request.url}'[:200])
        route.abort()

    def _stub_mapbox(self, route, parsed):
        path = parsed.path
        if path.endswith('.pbf') or '/fonts/' in path or '/glyphs' in path:
            route.fulfill(status=200, content_type='application/x-protobuf',
                          body=b'\x0a\x00')  # empty glyph block
        elif path.startswith('/styles/') or path.endswith('.json'):
            route.fulfill(status=200, content_type='application/json',
                          body=json.dumps(MAPBOX_STYLE))
        elif path.endswith('.png'):
            route.fulfill(status=200, content_type='image/png',
                          body=solid_tile_png(self.tile_color))
        elif path.endswith('.jpg') or path.endswith('.jpeg') or path.endswith('.webp'):
            route.fulfill(status=200, content_type='image/jpeg',
                          body=solid_tile_png(self.tile_color))
        else:
            route.fulfill(status=204, body='')

    def _forward(self, route, parsed):
        path = parsed.path
        query = ('?' + parsed.query) if parsed.query else ''
        self.requests.append((route.request.method, path))
        headers = dict(route.request.headers)
        headers.pop('host', None)
        headers.pop('origin', None)
        if path.startswith('/api/auth/'):
            # Cookie-authenticated auth transitions (refresh, logout) must carry
            # a browser Origin the backend allowlists, or it answers 403 and
            # the app logs out. The loopback origin the bundle runs on is not
            # in the test allowlist, so auth requests present the allowed
            # https://test origin; every other route forwards as-is.
            headers['origin'] = 'https://test'
        response = self.context.request.fetch(
            self.api_origin + path + query,
            method=route.request.method,
            headers=headers,
            data=route.request.post_data_buffer,
            timeout=30000,
            max_redirects=0,
        )
        if path in ('/api/auth/login', '/api/auth/me', '/api/auth/refresh') and response.ok:
            payload = response.json()
            profile = payload.get('profile') if path != '/api/auth/me' else payload
            if isinstance(profile, dict) and profile.get('id'):
                if profile['id'] != self.scope[1]:
                    self.scope[0] += 1
                self.scope[1:3] = [profile['id'], profile.get('organization_id')]
        response_headers = dict(response.headers)
        response_headers['access-control-allow-origin'] = self.base
        response_headers['access-control-allow-credentials'] = 'true'
        route.fulfill(status=response.status, headers=response_headers, body=response.body())

    # -- helpers ---------------------------------------------------------
    def api_call(self, path, method='GET', body=None, token=None,
                 form=None):
        """Direct API call through the harness's request context (real backend)."""
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        data = None
        if form is not None:
            headers['Content-Type'] = 'application/x-www-form-urlencoded'
            data = form
        elif body is not None:
            headers['Content-Type'] = 'application/json'
            data = json.dumps(body)
        self._direct_sequence += 1
        self.ledger.record((id(self), self._direct_sequence), method, path, category='assertion')
        response = self.context.request.fetch(
            self.api_origin + path, method=method, headers=headers, data=data,
            timeout=30000, max_redirects=0)
        text = response.text()
        try:
            payload = json.loads(text)
        except Exception:
            payload = {'raw': text[:200]}
        return {'status': response.status, 'body': payload}

    def reset_rate_limits(self):
        """Clear the disposable backend's rate-limit counters.

        Login allows five attempts per minute; the journey net logs in once per
        step from one address, so each session clears the counters through the
        backend's own disposable-test endpoint before it authenticates. Real
        traffic never gets this; the endpoint exists only under the disposable
        wrapper with the run's single-use token.
        """
        token = os.environ.get('JOURNEYS_DISPOSABLE_TOKEN')
        if not token:
            return
        self.context.request.post(
            self.api_origin + '/.well-known/verdaxis-disposable-test/reset-limits',
            headers={'x-disposable-token': token}, timeout=10000)

    def login_token(self, email, password):
        from urllib.parse import urlencode
        self.reset_rate_limits()
        result = self.api_call('/api/auth/login', method='POST',
                               form=urlencode({'username': email, 'password': password}))
        if result['status'] != 200:
            raise JourneyFailure(f'login failed for {email}: HTTP {result["status"]}: {result["body"]}')
        return result['body']['access_token']

    def close(self):
        if self.closed:
            return
        for child in self.children:
            child.close()
        if self.streams == 'live':
            for page in self.context.pages:
                if not page.is_closed():
                    evidence = page.evaluate("""() => {
                        const state = window.__journeyStreams;
                        if (!state) return {maxima:{}, remaining:0};
                        const maxima = {...state.maxima};
                        for (const source of [...state.sources]) source.close();
                        return {maxima, remaining:[...state.active.values()].reduce((a,b) => a+b, 0)};
                    }""")
                    for key, count in evidence['maxima'].items():
                        self.stream_maxima[key] = max(self.stream_maxima.get(key, 0), count)
                    self.streams_after_close += evidence['remaining']
        self.context.unroute_all(behavior='ignoreErrors')
        self.context.close()
        self.closed = True
        self.stream_maxima = dict(self.tracker.maxima)
        self.streams_after_close = self.tracker.active_count
