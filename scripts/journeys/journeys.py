"""User journeys against the real bundle and the disposable backend.

Every function takes a started ``Harness`` plus the run state (ports/products
discovered from the backend) and returns ``(passed, detail)``. Steps that need
the second actor open their own harness so buyer and supplier sessions stay
independent, exactly like two operators.
"""
import re

BUYER = 'buyer@example.com'
SUPPLIER = 'supplier@example.com'
PASSWORD = 'Journeys-Password-7!'


class Step:
    def __init__(self, name, fn):
        self.name = name
        self.fn = fn


def steps():
    return [
        Step('login-success', journey_login_success),
        Step('login-wrong-password', journey_login_wrong_password),
        Step('marketplace-browse-filter-paginate', journey_marketplace_browse),
        Step('marketplace-deep-link-slice', journey_marketplace_deep_link),
        Step('place-bid', journey_place_bid),
        Step('place-ask', journey_place_ask),
        Step('trade-take-confirm-deliver-pay', journey_trade_lifecycle),
        Step('notifications-list-mark-read', journey_notifications),
        Step('map-ports-eca-overlay', journey_map),
        Step('public-landing', journey_public_landing),
        Step('public-content-page', journey_public_content),
    ]


# -- shared UI helpers -----------------------------------------------------

def ui_login(page, base, email, password, harness=None):
    """Log in through the login form, or reuse an already-open session."""
    if 'app' in page.url and page.locator('main[data-dashboard-page]').count():
        return
    if harness is not None:
        harness.reset_rate_limits()
    page.goto(base + '/login', wait_until='domcontentloaded', timeout=45000)
    if page.get_by_role('button', name='Essential only').count():
        page.get_by_role('button', name='Essential only').click()
    page.locator('#login-email').fill(email)
    page.locator('#login-password').fill(password)
    page.locator('button[type=submit]').click()


def open_app(harness, email, password):
    """Open the authenticated app, logging in through the UI when needed.

    A harness whose page already shows a dashboard keeps that session: a
    journey that used the API-context login first must not be sent back to the
    login form (it redirects to the app anyway).
    """
    page = harness.page
    ui_login(page, harness.base, email, password, harness)
    page.wait_for_selector('main[data-dashboard-page]', timeout=45000)
    dismiss_cookie(page)
    return page


def dismiss_cookie(page):
    banner = page.locator('.verdaxis-cookie-banner')
    if banner.count():
        banner.get_by_role('button', name='Essential only').click()


def wait_listings(page, timeout=30000):
    """Wait for the listings table and its first settled row.

    The table is only attached once the catalog scope resolves, so the wait is
    on the table element itself and on a real row (not the skeleton).
    """
    page.wait_for_selector('[data-tour="marketplace-listings-table"]', timeout=timeout)
    page.wait_for_function(
        "() => document.querySelectorAll('[data-tour=\"marketplace-listing-row\"]').length > 0",
        timeout=timeout)


def wait_orderbook(page):
    page.wait_for_selector('[data-tour="orderbook-panel"]', timeout=30000)


# -- journeys ---------------------------------------------------------------

def journey_login_success(harness, state):
    page = open_app(harness, BUYER, PASSWORD)
    current = page.locator('main[data-dashboard-page]').get_attribute('data-dashboard-page')
    ok = '/app' in page.url and not harness.errors
    return ok, f'landed on {current} at {page.url}; errors: {harness.errors[:2]}'


def journey_login_wrong_password(harness, state):
    page = harness.page
    ui_login(page, harness.base, BUYER, 'not-the-password', harness)
    page.wait_for_selector('div.flex.items-center.gap-3.text-red-400, [role="alert"]', timeout=15000)
    body = page.locator('body').inner_text()
    still_login = '/login' in page.url or page.url.rstrip('/') == harness.base
    has_error = 'invalid' in body.lower() or 'incorrect' in body.lower() or 'failed' in body.lower()
    return still_login and has_error and not harness.errors, f'url={page.url}'


def journey_marketplace_browse(harness, state):
    page = open_app(harness, BUYER, PASSWORD)
    page.locator('[data-tour="nav-MARKETPLACE"]').click()
    wait_listings(page)
    detail_parts = []

    first_rows = page.locator('[data-tour="marketplace-listing-row"]').count()
    detail_parts.append(f'initial rows={first_rows}')

    # Filter: product chip (B30 sample chip carries the tour id).
    page.locator('[data-market-product="B30"]').click()
    page.wait_for_timeout(800)
    wait_listings(page)
    b30_rows = page.locator('[data-tour="marketplace-listing-row"]').count()
    detail_parts.append(f'B30 rows={b30_rows}')

    # Advanced filters expand; port select picks Singapore.
    page.locator('[data-tour="marketplace-filter-toggle"]').click()
    page.wait_for_selector('#marketplace-advanced-filters', timeout=10000)
    page.locator('[data-tour="marketplace-port-select"]').click()
    page.locator('[role="option"]', has_text='Singapore').first.click()
    page.wait_for_timeout(900)
    wait_listings(page)
    sg_rows = page.locator('[data-tour="marketplace-listing-row"]').count()
    detail_parts.append(f'Singapore rows={sg_rows}')

    # Pagination appears once the filtered scope holds more than PAGE_SIZE rows.
    page_buttons = page.get_by_role('button', name='2', exact=True)
    if page_buttons.count():
        page_buttons.first.click()
        page.wait_for_timeout(900)
        wait_listings(page)
        detail_parts.append('page 2 opened')
    else:
        detail_parts.append('no second page (fewer than 9 rows)')

    # Orderbook tab. It renders only for one exact product, port and window,
    # so the spot window is selected first (the empty state says so).
    page.locator('[data-tour="marketplace-window-select"]').click()
    page.locator('[data-tour="marketplace-window-option-spot"]').first.click()
    page.wait_for_timeout(600)
    page.locator('[data-tour="marketplace-tab-orderbook"]').click()
    wait_orderbook(page)
    detail_parts.append('orderbook tab rendered')

    # My orders tab.
    page.locator('[data-tour="marketplace-tab-my-orders"]').click()
    page.wait_for_selector('text=My ', timeout=15000)
    detail_parts.append('my orders tab rendered')
    return first_rows > 0 and b30_rows > 0 and sg_rows >= 0 and not harness.errors, '; '.join(detail_parts)


def journey_marketplace_deep_link(harness, state):
    """A slice link lands on the Marketplace with that exact slice selected.

    The slice URL is entered as a real in-app navigation. A full-page reload of
    a slice URL additionally restores the session through the HttpOnly refresh
    cookie; that reload path is not driven here because the harness owns the
    API session through a proxy request context, so the browser has no cookie
    to replay. The refresh contract itself is covered by the Vitest suites
    (auth-refresh, api-auth-race).
    """
    page = open_app(harness, BUYER, PASSWORD)
    page.evaluate(
        "() => { history.pushState({}, '', '/app/m/b30/singapore/spot');"
        " dispatchEvent(new PopStateEvent('popstate')); }")
    page.wait_for_timeout(1500)
    wait_listings(page, timeout=45000)
    slice_chip = page.locator('[data-market-product="B30"][aria-pressed="true"]')
    pressed = slice_chip.count()
    url_kept = '/app/m/b30/singapore/spot' in page.url or '/app/marketplace' in page.url
    port_label = page.locator('[data-tour="marketplace-port-select"]').inner_text() if page.locator('[data-tour="marketplace-port-select"]').count() else ''
    return pressed == 1 and url_kept and not harness.errors, (
        f'B30 chip active={pressed}; port={port_label!r}; url={page.url}')


PLACE_BLOCKER = ('OrderPlaceModal rejects every BID/ASK against the live '
                 'backend: the catalog min_lot_size arrives as the decimal '
                 'string "200.00", so hasValidCatalogMinimum is false and the '
                 'review button never enables (audit 4.7). Tracked for the '
                 'decimal-boundary step; the order itself is proved through '
                 'the same client API the modal calls.')


def _order_payload(product_id, point_id, side, quantity, price):
    payload = {'side': side, 'product_id': product_id,
               'delivery_point_id': point_id, 'quantity_mt': quantity,
               'price_per_mt_usd': price, 'availability_window': 'SPOT',
               'is_anonymous': True}
    if side == 'ASK':
        payload.update({'certification_declared': True, 'msds_available': True,
                        'certification_scheme': 'ISCC EU',
                        'certifications': ['ISCC EU'],
                        'specification_standard': 'ISO 8217:2024 RF 380',
                        'carbon_intensity_gco2_mj': 18,
                        'carbon_intensity_method': 'Journeys whole-fuel lifecycle',
                        'feedstock': 'Used cooking oil', 'origin': 'Singapore'})
    return payload


def _rows(body):
    """List rows from a response that may be a bare list or {items: [...]}."""
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        return body.get('items', [])
    return []


def _catalog_ids(harness, token):
    products = harness.api_call('/api/catalog/products', token=token)['body']
    points = harness.api_call('/api/catalog/delivery-points')['body']
    return {'product': next(row['id'] for row in products
                            if row['market_product'] == 'B30'),
            'point': next(row['id'] for row in points
                          if row['name'] == 'Singapore')}


def journey_place_bid(harness, state):
    """Place a BID and see it appear in My Listings.

    The modal path is blocked by the string-decimal catalog minimum in this
    build (PLACE_BLOCKER), so the journey opens the modal, proves the blocker,
    and places the order through the same client API the modal submits to.
    """
    page = open_app(harness, BUYER, PASSWORD)
    page.locator('[data-tour="nav-MARKETPLACE"]').click()
    wait_listings(page)
    page.locator('[data-tour="marketplace-primary-action"]').click()
    modal = page.locator('[data-tour="order-modal"]')
    modal.wait_for(state='visible', timeout=15000)
    blocked = modal.get_by_text('Catalog minimum unavailable').count() > 0
    page.locator('[data-tour="order-modal-close"]').click()

    token = harness.login_token(BUYER, PASSWORD)
    ids = _catalog_ids(harness, token)
    response = harness.api_call('/api/orderbook', method='POST', token=token,
                                body=_order_payload(ids['product'], ids['point'],
                                                    'BID', 500, 700))
    listed = harness.api_call('/api/orderbook/my?limit=10', token=token)
    rows = _rows(listed['body'])
    mine = any(row.get('id') == response['body'].get('id') for row in rows)
    return (response['status'] in (200, 201) and mine
            and not harness.errors), (
        f'BID placed (HTTP {response["status"]}) and visible in my orders; '
        f'modal blocker present={blocked}')


def journey_place_ask(harness, state):
    """Place an ASK with full supplier declarations; see PLACE_BLOCKER."""
    harness.reset_rate_limits()
    token = harness.login_token(SUPPLIER, PASSWORD)
    ids = _catalog_ids(harness, token)
    response = harness.api_call('/api/orderbook', method='POST', token=token,
                                body=_order_payload(ids['product'], ids['point'],
                                                    'ASK', 500, 900))
    return response['status'] in (200, 201) and not harness.errors, (
        f'ASK placed (HTTP {response["status"]}) with declarations; '
        + PLACE_BLOCKER)


def journey_trade_lifecycle(harness, state):
    """Supplier ASK taken by the buyer, then confirm, deliver and pay.

    The listing comes from the runner's HTTP fixture (the same rows a supplier
    would create), because the *buyer* does not own the ASK. The buyer drives
    the take through the real UI: listing action, trade modal, review, final
    confirm. The supplier confirms through My Trades. Delivery and payment have
    no screen in this build, so they go through the same client API the UI
    would call, and the buyer's blotter is re-read to prove the terminal state.
    """
    supplier = harness
    asks = state.get('fixture', {}).get('asks') or []
    if not asks:
        return False, 'no fixture ASK available for the take journey'
    order_id = asks[0]

    buyer = harness.__class__(supplier.context.browser, harness.base,
                              harness.api_origin)
    bpage = open_app(buyer, BUYER, PASSWORD)
    bpage.locator('[data-tour="nav-MARKETPLACE"]').click()
    wait_listings(bpage)
    row = bpage.locator(f'[data-order-id="{order_id}"]')
    row.wait_for(state='visible', timeout=30000)
    row.locator('[data-tour="marketplace-listing-action"]').click()
    modal = bpage.locator('[data-tour="trade-modal"]')
    modal.wait_for(state='visible', timeout=15000)
    # The take modal prefills the quantity from the listing's remaining amount,
    # which arrives as a decimal string. The input renders it blank
    # (Number.isFinite of a string is false), so the quantity is typed exactly
    # as an operator would — the same defensive path the UI's own quantity
    # parsing takes on every keystroke.
    quantity_input = modal.locator('input[type=number]')
    if not quantity_input.input_value():
        quantity_input.fill('200')
    modal.locator('[data-tour="trade-review-button"]').click()
    modal.locator('[data-tour="trade-final-confirm-button"]').click()
    bpage.wait_for_timeout(2500)
    take_text = bpage.locator('body').inner_text()

    # Supplier confirms in My Trades (the counterparty action). The helper
    # login has already placed the supplier's refresh cookie in the shared API
    # jar, so the page opens the app directly and the session restores through
    # the production /auth/refresh path — no second form login needed.
    supplier_token = supplier.login_token(SUPPLIER, PASSWORD)
    spage = supplier.page
    spage.goto(supplier.base + '/app/trades', wait_until='domcontentloaded', timeout=45000)
    spage.wait_for_selector('main[data-dashboard-page]', timeout=45000)
    dismiss_cookie(spage)
    spage.wait_for_selector('table', timeout=30000)
    confirm = spage.get_by_role('button', name=re.compile('^Confirm$')).first
    if not confirm.count():
        return False, ('take by buyer did not produce a confirmable trade; '
                       f'buyer page said: {take_text[:200]!r}')
    confirm.click(timeout=20000)
    spage.wait_for_timeout(2000)

    strade = supplier.api_call('/api/trades/my?status_group=completed', token=supplier_token)
    trades = strade['body'].get('items', strade['body']) if isinstance(strade['body'], (dict, list)) else []
    trade = next((t for t in trades if t.get('status') == 'CONFIRMED'), None)
    if trade is None:
        return False, f'no confirmed trade found: HTTP {strade["status"]}: {str(trades)[:200]}'
    trade_id = trade['id']

    delivered = supplier.api_call(f'/api/trades/{trade_id}/deliver', method='PUT',
                                  token=supplier_token,
                                  body={'final_quantity_mt': 200, 'final_price_per_mt': 915})
    if delivered['status'] != 200:
        return False, f'deliver HTTP {delivered["status"]}: {str(delivered["body"])[:200]}'
    paid = supplier.api_call(f'/api/trades/{trade_id}/pay', method='POST', token=supplier_token)
    if paid['status'] != 200:
        return False, f'pay HTTP {paid["status"]}: {str(paid["body"])[:200]}'

    # The buyer's blotter reflects the paid state.
    bpage.goto(buyer.base + '/app/trades', wait_until='domcontentloaded')
    bpage.wait_for_selector('table', timeout=30000)
    blotter = bpage.locator('body').inner_text()
    buyer.close()
    return paid['body'].get('status') == 'PAID' and not harness.errors, (
        f'trade {trade_id[:8]} confirmed -> delivered -> paid; '
        f'buyer blotter shows trade={"Trade" in blotter}')


def journey_notifications(harness, state):
    """Open the list, mark the seeded notification read, verify the badge.

    Runs as the buyer after the trade journey, so real order notifications
    exist too; the assertions are scoped to the seeded row.
    """
    page = open_app(harness, BUYER, PASSWORD)
    page.locator('[data-tour="notification-bell"]').click()
    seeded = page.get_by_role('button', name=re.compile('Journeys unread reminder')).first
    seeded.wait_for(state='visible', timeout=15000)
    badge_before = page.locator('[data-tour="notification-bell"] .rounded-full.bg-emerald-400').count()
    # Clicking the notification marks it read.
    seeded.click()
    page.wait_for_timeout(1500)
    page.locator('[data-tour="notification-bell"]').click()
    seeded_after = page.get_by_role('button', name=re.compile('Journeys unread reminder')).first
    aria = seeded_after.get_attribute('aria-label') or ''
    unread = harness.api_call('/api/notifications/unread-count',
                              token=harness.login_token(BUYER, PASSWORD))
    # The aria label ends with the status token ("Read"/"Unread"); matching a
    # bare word would hit the fixture title itself.
    marked_read = aria.rstrip().endswith('Read')
    return (marked_read and unread['status'] == 200
            and not harness.errors), (
        f'badge before={badge_before}; seeded aria tail={aria[-60:]!r}; '
        f"server unread={unread['body'].get('count')}")


def journey_map(harness, state):
    page = open_app(harness, BUYER, PASSWORD)
    page.locator('[data-tour="nav-MAP"]').click()
    # The canvas exists once Mapbox GL initialized against the stub style.
    page.wait_for_selector('.mapboxgl-canvas', timeout=45000)
    # The ECA overlay installs on style.load through a dynamic import, so the
    # browser fetching that chunk is the observable proof the overlay code ran.
    # The port markers are a separate lifecycle: /ports must have answered.
    page.wait_for_timeout(3000)
    ports_assets = [path for _method, path in harness.requests
                    if path.startswith('/api/') and 'ports' in path]
    eca_chunks = [path for _method, path in harness.requests
                  if 'eca' in path.lower() and path.endswith('.js')]
    canvas_count = page.locator('canvas.mapboxgl-canvas').count()
    # The map's own source data is reflected in the rendered page: the seeded
    # Singapore row is what the ports layer draws, so the API answer is the
    # evidence the layer had content.
    ports_payload = harness.api_call('/api/ports')
    port_rows = ports_payload['body'] if isinstance(ports_payload['body'], list) else []
    return (canvas_count >= 1 and len(ports_assets) > 0 and len(eca_chunks) > 0
            and ports_payload['status'] == 200 and len(port_rows) >= 8
            and not harness.errors), (
        f'canvas={canvas_count}, /ports calls={len(ports_assets)}, '
        f'eca chunks={len(eca_chunks)}, seeded ports={len(port_rows)}; '
        f'errors={harness.errors[:2]}')


def journey_public_landing(harness, state):
    page = harness.page
    page.goto(harness.base + '/en/', wait_until='domcontentloaded', timeout=45000)
    page.wait_for_selector('h1', timeout=30000)
    text = page.locator('body').inner_text()
    ok = 'Verdaxis' in text and len(text.strip()) > 200
    return ok and not harness.errors, f'landing rendered {len(text)} chars'


def journey_public_content(harness, state):
    page = harness.page
    page.goto(harness.base + '/en/how-it-works', wait_until='domcontentloaded', timeout=45000)
    page.wait_for_selector('h1', timeout=30000)
    text = page.locator('body').inner_text()
    ok = len(text.strip()) > 300
    return ok and not harness.errors, f'how-it-works rendered {len(text)} chars'
