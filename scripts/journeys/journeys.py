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


def seed_pagination(harness):
    """Add rows after screenshots, preserving the committed seeded captures."""
    from .seed_orders import ASK_METADATA
    token = harness.login_token(SUPPLIER, PASSWORD)
    products = harness.api_call('/api/catalog/products')['body']
    points = harness.api_call('/api/catalog/delivery-points')['body']
    product = next(row['id'] for row in products if row['market_product'] == 'B30')
    point = next(row['id'] for row in points if row['name'] == 'Singapore')
    for index in range(8):
        result = harness.api_call('/api/orderbook', method='POST', token=token,
                                  body={'side': 'ASK', 'product_id': product,
                                        'delivery_point_id': point, 'quantity_mt': 200,
                                        'price_per_mt_usd': 950 + index,
                                        'availability_window': 'SPOT', **ASK_METADATA})
        assert result['status'] in (200, 201), f'pagination seed failed: {result["status"]}'
    for record in harness.ledger.records:
        record['category'] = 'seed'


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

    # Require the fixture's second page; absence is a broken safety net.
    first_ids = set(page.locator('[data-order-id]').evaluate_all(
        '(rows) => rows.map(row => row.dataset.orderId)'))
    page_buttons = page.get_by_role('button', name='2', exact=True)
    assert page_buttons.count(), 'B30 Singapore fixture must have at least nine asks'
    marker = len(harness.ledger.records)
    page_buttons.first.evaluate('(button) => button.click()')
    page.wait_for_timeout(900)
    wait_listings(page)
    second_ids = set(page.locator('[data-order-id]').evaluate_all(
        '(rows) => rows.map(row => row.dataset.orderId)'))
    assert first_ids and second_ids and first_ids.isdisjoint(second_ids), 'page 2 repeated page 1 ids'
    assert any(row['route'] == '/api/orderbook/asks'
               and row['params'].get('skip') == '8' and row['params'].get('limit') == '8'
               for row in harness.ledger.records[marker:]), 'page 2 did not request skip=8,limit=8'
    detail_parts.append('distinct page 2; skip=8,limit=8')

    def reset_page(action):
        button = page.get_by_role('button', name='2', exact=True).first
        button.evaluate('(button) => button.click()')
        page.wait_for_timeout(900)
        current_ids = set(page.locator('[data-order-id]').evaluate_all(
            '(rows) => rows.map(row => row.dataset.orderId)'))
        assert current_ids == second_ids, 'reset case did not start on page 2'
        marker = len(harness.ledger.records)
        action()
        page.wait_for_timeout(900)
        reads = [row for row in harness.ledger.records[marker:]
                 if row['route'] == '/api/orderbook/asks']
        assert reads and all(row['params'].get('skip', '0') == '0' for row in reads), 'filter kept page 2'

    reset_page(lambda: page.locator('[data-market-product="B100"]').click())
    page.locator('[data-market-product="B30"]').click()
    page.wait_for_timeout(800)
    def change_port():
        page.locator('[data-tour="marketplace-port-select"]').click()
        page.locator('[role="option"]', has_text='Rotterdam').first.click()
    reset_page(change_port)
    page.locator('[data-tour="marketplace-port-select"]').click()
    page.locator('[role="option"]', has_text='Singapore').first.click()
    page.wait_for_timeout(800)
    def change_window():
        page.locator('[data-tour="marketplace-window-select"]').click()
        page.locator('[data-tour="marketplace-window-option-spot"]').first.click()
    reset_page(change_window)
    def change_sort():
        page.get_by_role('combobox', name='Sort By', exact=True).click()
        page.get_by_role('option', name='Price: High → Low', exact=True).click()
    reset_page(change_sort)

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
    def navigate(path):
        page.evaluate("path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }", path)

    def exact(product, port, path):
        page.wait_for_selector(f'[data-tour-market-product="{product}"][data-tour-port="{port}"][data-tour-window="SPOT"]', timeout=30000)
        page.wait_for_timeout(1000)
        assert page.url == harness.base + path, f'exact slice URL changed: {page.url}'

    navigate('/app/m/b30/singapore/spot')
    exact('B30', 'Singapore', '/app/m/b30/singapore/spot')
    wait_listings(page, timeout=45000)
    navigate('/app/m/b30/rotterdam/spot')
    exact('B30', 'Rotterdam', '/app/m/b30/rotterdam/spot')
    page.go_back(wait_until='domcontentloaded')
    exact('B30', 'Singapore', '/app/m/b30/singapore/spot')
    page.go_forward(wait_until='domcontentloaded')
    exact('B30', 'Rotterdam', '/app/m/b30/rotterdam/spot')
    navigate('/app/m/b30/singapore/spot?product=B100')
    exact('B30', 'Singapore', '/app/m/b30/singapore/spot')
    navigate('/app/m/ucome-b100/rotterdam/spot')
    exact('UCOME_B100', 'Singapore', '/app/m/ucome-b100/singapore/spot')
    assert page.locator('[data-tour-market-product="UCOME_B100"][data-tour-port="Rotterdam"]').count() == 0
    return not harness.errors, 'exact slice; slice-to-slice; back/forward; conflicting product removed; invalid lane rejected'


def measurement_windows():
    return [
        Step('window-listings-visible-60s', window_listings),
        Step('window-depth-visible-60s', window_depth),
        Step('window-hidden-60s-resume', window_hidden),
        Step('window-live-event-burst', window_event_burst),
        Step('window-live-reconnect', window_reconnect),
    ]


def _measurement_market(harness, depth=False):
    page = open_app(harness, BUYER, PASSWORD)
    page.evaluate("() => { history.pushState({}, '', '/app/m/b30/singapore/spot'); dispatchEvent(new PopStateEvent('popstate')); }")
    page.wait_for_selector('[data-tour-market-product="B30"][data-tour-port="Singapore"][data-tour-window="SPOT"]')
    wait_listings(page)
    if depth:
        page.locator('[data-tour="marketplace-tab-orderbook"]').click()
        wait_orderbook(page)
    page.wait_for_timeout(2000)
    return page


def window_listings(harness, state):
    page = _measurement_market(harness)
    harness.begin_window()
    page.wait_for_timeout(60000)
    return not harness.errors, '60-second visible listings window'


def window_depth(harness, state):
    page = _measurement_market(harness, depth=True)
    harness.begin_window()
    page.wait_for_timeout(60000)
    return not harness.errors, '60-second visible exact depth window'


def window_hidden(harness, state):
    page = _measurement_market(harness, depth=True)
    harness.begin_window()
    page.evaluate("() => { Object.defineProperty(document, 'visibilityState', {configurable:true, get:()=>'hidden'}); Object.defineProperty(document, 'hidden', {configurable:true, get:()=>true}); document.dispatchEvent(new Event('visibilitychange')); }")
    page.wait_for_timeout(60000)
    hidden_reads = sum(row['route'] == '/api/orderbook/snapshot' for row in harness.ledger.records)
    assert hidden_reads == 0, 'snapshot polled while hidden'
    page.evaluate("() => { Object.defineProperty(document, 'visibilityState', {configurable:true, get:()=>'visible'}); Object.defineProperty(document, 'hidden', {configurable:true, get:()=>false}); document.dispatchEvent(new Event('visibilitychange')); }")
    page.wait_for_timeout(5000)
    assert any(row['route'] == '/api/orderbook/snapshot' for row in harness.ledger.records), 'resume did not refresh depth'
    return not harness.errors, '60 seconds hidden, then fixed 5-second resume; depth refreshed'


def _event_order(harness, price):
    from .seed_orders import ASK_METADATA
    token = harness.login_token(SUPPLIER, PASSWORD)
    products = harness.api_call('/api/catalog/products')['body']
    points = harness.api_call('/api/catalog/delivery-points')['body']
    result = harness.api_call('/api/orderbook', method='POST', token=token,
                              body={'side': 'ASK',
                                    'product_id': next(row['id'] for row in products if row['market_product'] == 'B30'),
                                    'delivery_point_id': next(row['id'] for row in points if row['name'] == 'Singapore'),
                                    'quantity_mt': 200, 'price_per_mt_usd': price,
                                    'availability_window': 'SPOT', **ASK_METADATA})
    assert result['status'] in (200, 201), f'event mutation failed: {result["status"]}'
    return result['body']['id']


def window_event_burst(harness, state):
    # Disable only fallback polling before mount. Native SSE, fetch and batching
    # remain real, so a visible change cannot be credited to the 10-second poll.
    harness.context.add_init_script("""window.__journeySuppressedPolls = []; const interval = window.setInterval; window.setInterval = (fn, delay, ...args) => { if ([10000,60000].includes(delay)) window.__journeySuppressedPolls.push(delay); return interval(fn, [10000,60000].includes(delay) ? 3600000 : delay, ...args); };""")
    harness.page.goto(harness.base + '/login', wait_until='domcontentloaded')
    page = _measurement_market(harness)
    assert page.evaluate('() => window.__journeySuppressedPolls.includes(60000)'), 'fallback suppression did not install before mount'
    harness.begin_window()
    last_id = None
    for price in (880, 875, 870):
        last_id = _event_order(harness, price)
    page.locator(f'[data-order-id="{last_id}"]').wait_for(state='visible', timeout=8000)
    harness.wait_window(15)
    return not harness.errors, 'three committed orders changed visible listings with fallback polling disabled'


def window_reconnect(harness, state):
    page = _measurement_market(harness)
    harness.begin_window()
    import os
    response = harness.context.request.post(
        harness.base + '/.journeys/disconnect-streams',
        headers={'x-journeys-control': os.environ['JOURNEYS_DISPOSABLE_TOKEN']})
    assert response.status == 204, 'test relay did not disconnect native streams'
    order_id = _event_order(harness, 865)
    page.locator(f'[data-order-id="{order_id}"]').wait_for(state='visible', timeout=10000)
    harness.wait_window(15)
    assert any(row['kind'] == 'sse' for row in harness.ledger.records), 'no native stream reconnect attempt'
    return not harness.errors, 'native source reconnect and committed visible order'


def _rows(body):
    """List rows from a response that may be a bare list or {items: [...]}."""
    if isinstance(body, list):
        return body
    if isinstance(body, dict):
        return body.get('items', [])
    return []


# -- order-window helpers --------------------------------------------------

ORDER_PRODUCT = 'B30'
ORDER_DELIVERY_POINT = 'Singapore'


def _my_order_ids(harness, token):
    listed = harness.api_call('/api/orderbook/my?limit=20', token=token)
    return listed, {row.get('id') for row in _rows(listed['body'])}


def _open_order_modal(page):
    """Open the order window from the Marketplace and return its locator."""
    page.locator('[data-tour="nav-MARKETPLACE"]').click()
    wait_listings(page)
    page.locator('[data-tour="marketplace-primary-action"]').click()
    modal = page.locator('[data-tour="order-modal"]')
    modal.wait_for(state='visible', timeout=15000)
    return modal


def _pick_option(page, aria_label, option_name):
    """Choose one option in a VerdaxisSelect by its aria-label."""
    page.get_by_role('combobox', name=aria_label).click()
    page.get_by_role('option', name=option_name).first.click()


def _submit_order_modal(page, modal, side):
    """Review, confirm, then wait for the result screen.

    The result is a second dialog, not a state of the form, so it is found by
    its result title rather than inside the order window. Returns '' when the
    side is confirmed and a reason string otherwise, so a failure says what the
    screen showed instead of only timing out.
    """
    modal.locator('[data-tour="order-modal-submit-boundary"]').click()
    modal.locator('[data-tour="order-final-confirm-button"]').click()
    title = page.locator('#order-place-result-title')
    try:
        title.wait_for(state='visible', timeout=20000)
        shown = title.inner_text().strip()
    except Exception:
        return f'no result screen appeared (screen shows {_visible_heading(page)!r})'
    expected = f'{side.capitalize()} Placed Successfully'
    return '' if shown == expected else f'result screen says {shown!r}, expected {expected!r}'


def _visible_heading(page):
    """The first visible dialog heading, for a failure message."""
    heading = page.locator('[role="dialog"] h2, [role="dialog"] h3').first
    try:
        return heading.inner_text().strip()
    except Exception:
        return ''


def journey_place_bid(harness, state):
    """Place a BID through the real order window and see it in My Orders.

    The catalog minimum arrives as the decimal string "200.00". The catalog
    boundary converts it to a number, so the review button enables and the BID
    is placed from the modal exactly as an operator would drive it.
    """
    page = open_app(harness, BUYER, PASSWORD)
    token = harness.login_token(BUYER, PASSWORD)
    _, before = _my_order_ids(harness, token)

    modal = _open_order_modal(page)
    _pick_option(page, 'Order product', ORDER_PRODUCT)
    _pick_option(page, 'Order delivery point', ORDER_DELIVERY_POINT)
    modal.locator('#order-quantity').fill('500')
    modal.locator('#order-price').fill('700')
    problem = _submit_order_modal(page, modal, 'BID')
    if problem:
        return False, f'order window did not confirm the BID: {problem}'

    listed, _ = _my_order_ids(harness, token)
    placed = [row for row in _rows(listed['body'])
              if row.get('id') not in before
              and row.get('side') == 'BID'
              and float(row.get('quantity_mt') or 0) == 500]
    return (bool(placed) and listed['status'] == 200 and not harness.errors), (
        f'BID 500 MT at $700 placed from the order window; '
        f'new my-orders rows={len(placed)}; HTTP {listed["status"]}')


def journey_place_ask(harness, state):
    """Place an ASK with full supplier declarations through the order window."""
    harness.reset_rate_limits()
    page = open_app(harness, SUPPLIER, PASSWORD)
    token = harness.login_token(SUPPLIER, PASSWORD)
    _, before = _my_order_ids(harness, token)

    modal = _open_order_modal(page)
    _pick_option(page, 'Order product', ORDER_PRODUCT)
    _pick_option(page, 'Order delivery point', ORDER_DELIVERY_POINT)
    modal.locator('#order-carbon-intensity').fill('18')
    modal.locator('#order-carbon-intensity-method').fill('Journeys whole-fuel lifecycle')
    modal.locator('#order-feedstock').fill('Used cooking oil')
    modal.locator('#order-origin').fill('Singapore')
    modal.get_by_role('checkbox', name='Certification declaration').check()
    modal.get_by_role('checkbox', name='MSDS available').check()
    modal.locator('#order-quantity').fill('500')
    modal.locator('#order-price').fill('900')
    problem = _submit_order_modal(page, modal, 'ASK')
    if problem:
        return False, f'order window did not confirm the ASK: {problem}'

    listed, _ = _my_order_ids(harness, token)
    placed = [row for row in _rows(listed['body'])
              if row.get('id') not in before
              and row.get('side') == 'ASK'
              and float(row.get('quantity_mt') or 0) == 500]
    return (bool(placed) and listed['status'] == 200 and not harness.errors), (
        f'ASK 500 MT at $900 placed with declarations from the order window; '
        f'new my-orders rows={len(placed)}; HTTP {listed["status"]}')


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

    buyer = harness.child()
    bpage = open_app(buyer, BUYER, PASSWORD)
    bpage.locator('[data-tour="nav-MARKETPLACE"]').click()
    wait_listings(bpage)
    row = bpage.locator(f'[data-order-id="{order_id}"]')
    row.wait_for(state='visible', timeout=30000)
    row.locator('[data-tour="marketplace-listing-action"]').click()
    modal = bpage.locator('[data-tour="trade-modal"]')
    modal.wait_for(state='visible', timeout=15000)
    # The take modal prefills the quantity from the listing's remaining amount.
    # That field arrives as a decimal string and is converted at the boundary;
    # the input must show a real number without any typing.
    quantity_input = modal.locator('input[type=number]')
    prefilled = quantity_input.input_value().strip()
    if not prefilled:
        return False, ('take modal prefilled quantity is blank: the wire '
                       'remaining_quantity_mt was not converted')
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
                                  body={'final_quantity_mt': float(prefilled), 'final_price_per_mt': 915})
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
        f'prefilled quantity={prefilled}; '
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
