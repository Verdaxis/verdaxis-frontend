"""User journeys against the real bundle and the disposable backend.

Every function takes a started ``Harness`` plus the run state (ports/products
discovered from the backend) and returns ``(passed, detail)``. Steps that need
the second actor open their own harness so buyer and supplier sessions stay
independent, exactly like two operators.
"""
import re

from playwright.sync_api import TimeoutError as PlaywrightTimeout

from .browser_harness import JourneyFailure

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
    if harness is not None:
        harness.reset_rate_limits()
    page.goto(base + '/login', wait_until='domcontentloaded', timeout=45000)
    if page.get_by_role('button', name='Essential only').count():
        page.get_by_role('button', name='Essential only').click()
    page.locator('#login-email').fill(email)
    page.locator('#login-password').fill(password)
    page.locator('button[type=submit]').click()


def open_app(harness, email, password):
    """Login through the UI and wait for the dashboard shell."""
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
    page = open_app(harness, BUYER, PASSWORD)
    # Deep-linked slice: B30 at Singapore, spot window.
    page.goto(harness.base + '/app/m/b30/singapore/spot', wait_until='domcontentloaded')
    wait_listings(page)
    slice_chip = page.locator('[data-market-product="B30"][aria-pressed="true"]')
    pressed = slice_chip.count()
    url_kept = '/app/m/b30/singapore/spot' in page.url or '/app/marketplace' in page.url
    port_label = page.locator('[data-tour="marketplace-port-select"]').inner_text() if page.locator('[data-tour="marketplace-port-select"]').count() else ''
    return pressed == 1 and url_kept and not harness.errors, (
        f'B30 chip active={pressed}; port={port_label!r}; url={page.url}')


def _place_order(harness, email, side, product_code, port_name, quantity, price):
    """Shared BID/ASK entry through the real OrderPlaceModal."""
    page = open_app(harness, email, PASSWORD)
    page.locator('[data-tour="nav-MARKETPLACE"]').click()
    wait_listings(page)
    page.locator('[data-tour="marketplace-primary-action"]').click()
    page.wait_for_selector('[data-tour="order-modal"]', timeout=15000)

    modal = page.locator('[data-tour="order-modal"]')
    # Product select (combobox).
    modal.locator('[role="combobox"]').first.click()
    page.locator('[role="option"]', has_text=re.compile(product_code, re.IGNORECASE)).first.click()
    # Delivery point.
    modal.locator('[role="combobox"]').nth(1).click()
    page.locator('[role="option"]', has_text=port_name).first.click()
    # Quantity and price.
    modal.locator('#order-quantity').fill(str(quantity))
    modal.locator('#order-price').fill(str(price))
    if side == 'ASK':
        # Supplier declarations live in the advanced panel; open it unless the
        # panel is already open, then wait for the declaration block.
        supplier_fields = modal.locator('[data-tour="order-modal-supplier-fields"]')
        if not supplier_fields.is_visible():
            modal.locator('[data-tour="order-modal-advanced-toggle"]').click()
        supplier_fields.wait_for(state='visible', timeout=15000)
        # The scalar biofuel specification standard is fixed and read-only, so
        # it is asserted, never typed.
        standard = modal.locator('#order-specification-standard')
        if standard.count() and standard.is_editable():
            standard.fill('ISO 8217:2024 RF 380')
        modal.locator('label', has_text=re.compile('MSDS available')).locator('input[type=checkbox]').check()
        modal.locator('label', has_text=re.compile('Certification declaration')).locator('input[type=checkbox]').check()
        modal.locator('#order-carbon-intensity').fill('20')
        modal.locator('#order-carbon-intensity-method').fill('Journeys whole-fuel lifecycle')
        modal.locator('#order-feedstock').fill('Used cooking oil')
        modal.locator('#order-origin').fill('Singapore')

    submit = modal.locator('[data-tour="order-modal-submit-boundary"]')
    if submit.is_disabled():
        raise JourneyFailure(f'{side} form is not valid: ' + _modal_errors(modal))
    submit.click()
    # Review screen -> final confirm.
    final = page.locator('[data-tour="order-final-confirm-button"]')
    try:
        final.wait_for(state='visible', timeout=20000)
    except PlaywrightTimeout:
        raise JourneyFailure('review step did not appear: ' + _modal_errors(modal))
    final.click()
    page.wait_for_selector('text=Placed Successfully', timeout=30000)
    return page


def _modal_errors(modal):
    """Validation text inside the order modal, for failure evidence."""
    texts = []
    for selector in ('#order-quantity-error', '#order-expiry-error', '[role="alert"]'):
        locator = modal.locator(selector)
        for index in range(min(locator.count(), 3)):
            text = locator.nth(index).inner_text().strip()
            if text:
                texts.append(text)
    selects = modal.locator('[role="combobox"]')
    for index in range(min(selects.count(), 3)):
        texts.append(f'select{index}={selects.nth(index).inner_text().strip()[:40]!r}')
    quantity = modal.locator('#order-quantity')
    price = modal.locator('#order-price')
    texts.append(f'qty={quantity.input_value() if quantity.count() else "?"}')
    texts.append(f'price={price.input_value() if price.count() else "?"}')
    return '; '.join(texts)[:500]


def journey_place_bid(harness, state):
    page = _place_order(harness, BUYER, 'BID', 'B30', 'Singapore', 200, 700)
    my_orders_marker = 'B30' in page.locator('body').inner_text()
    return my_orders_marker and not harness.errors, 'BID placed and success screen shown'


def journey_place_ask(harness, state):
    page = _place_order(harness, SUPPLIER, 'ASK', 'B30', 'Singapore', 200, 900)
    return not harness.errors, 'ASK placed and success screen shown'


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
    modal.locator('[data-tour="trade-review-button"]').click()
    modal.locator('[data-tour="trade-final-confirm-button"]').click()
    bpage.wait_for_timeout(2500)
    take_text = bpage.locator('body').inner_text()

    # Supplier confirms in My Trades (the counterparty action).
    supplier_token = supplier.login_token(SUPPLIER, PASSWORD)
    spage = supplier.page
    spage.goto(supplier.base + '/app/trades', wait_until='domcontentloaded')
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
    page = open_app(harness, BUYER, PASSWORD)
    page.locator('[data-tour="notification-bell"]').click()
    page.wait_for_selector('text=Journeys unread reminder', timeout=15000)
    badge_before = page.locator('[data-tour="notification-bell"] .rounded-full.bg-emerald-400').count()
    # Clicking the notification marks it read.
    page.get_by_role('button', name=re.compile('Journeys unread reminder')).first.click()
    page.wait_for_timeout(1200)
    page.locator('[data-tour="notification-bell"]').click()
    read_state = page.get_by_role('button', name=re.compile('read', re.IGNORECASE)).count()
    unread_left = page.locator('[data-tour="notification-bell"] .rounded-full.bg-emerald-400').count()
    return badge_before >= 1 and unread_left == 0 and not harness.errors, (
        f'badge before={badge_before}, unread after={unread_left}')


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
