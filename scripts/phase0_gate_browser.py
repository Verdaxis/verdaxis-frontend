"""Real local browser checks. API traffic is forwarded, never mocked."""
import json
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright


def check_bundle(name, base, api, run):
    results = []
    def record(contract, passed, detail=''):
        results.append({'bundle': name, 'contract': contract, 'passed': bool(passed), 'detail': detail})

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(service_workers='block', viewport={'width': 1440, 'height': 1000})
        requests = []
        login_payloads = []
        activity_statuses = []
        errors = []
        def route_request(route):
            parsed = urlsplit(route.request.url)
            if parsed.hostname == 'api.verdaxis.exchange':
                # Infinite SSE bodies cannot pass through route.fulfill. REST remains real.
                if parsed.path.startswith('/api/stream/'):
                    route.abort()
                    return
                path = parsed.path + ('?' + parsed.query if parsed.query else '')
                requests.append((route.request.method, parsed.path))
                headers = dict(route.request.headers)
                headers.pop('host', None)
                headers.pop('origin', None)
                response = context.request.fetch(api + path, method=route.request.method,
                    headers=headers, data=route.request.post_data_buffer, timeout=15000, max_redirects=0)
                if '/activity' in parsed.path:
                    activity_statuses.append(response.status)
                if parsed.path == '/api/auth/login' and response.ok:
                    login_payloads.append(response.json())
                response_headers = dict(response.headers)
                response_headers['access-control-allow-origin'] = base
                response_headers['access-control-allow-credentials'] = 'true'
                route.fulfill(status=response.status, headers=response_headers, body=response.body())
            elif route.request.url.startswith(base + '/'):
                route.continue_()
            else:
                route.abort()
        context.route('**/*', route_request)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            page.goto(base + '/login?lang=en', wait_until='domcontentloaded')
            page.locator('input[type=email]').fill('buyer@example.com')
            page.locator('input[type=password]').fill('Synthetic-Gate-Password-42!')
            page.locator('button[type=submit]').click()
            page.wait_for_url('**/app/**', timeout=30000)
            record('UI login', bool(login_payloads))
            token = login_payloads[-1]['access_token']
            def call(path, method='GET', body=None):
                return page.evaluate('''async ({path, method, body, token}) => {
                    const login = path === '/auth/login';
                    const response = await fetch('https://api.verdaxis.exchange/api' + path, {
                        method, headers: {'Authorization': 'Bearer ' + token,
                            'Content-Type': login ? 'application/x-www-form-urlencoded' : 'application/json'},
                        ...(body === null ? {} : {body: login ? new URLSearchParams({username: body.email, password: body.password}).toString() : JSON.stringify(body)})
                    });
                    const text = await response.text();
                    let payload;
                    try { payload = JSON.parse(text); } catch { payload = {error: text.slice(0, 200)}; }
                    return {status: response.status, body: payload};
                }''', {'path': path, 'method': method, 'body': body, 'token': token})
            me = call('/auth/me')
            updated = call('/auth/me', 'PUT', {'first_name': 'Synthetic'})
            eligibility = {'eligible': True, 'reason': 'KYC_NOT_ENFORCED', 'grace_expires_at': None}
            record('GET/PUT profile eligibility', me['body'].get('execution_eligibility') == eligibility
                and updated['body'].get('execution_eligibility') == eligibility,
                f"GET {me['status']}; PUT {updated['status']}")
            preference = {'products': ['B30', 'B100', 'BIO_LNG', 'UCOME_B100'], 'portIds': []}
            saved = call('/users/me/preferences/market_watch', 'PUT', preference)
            restored = call('/users/me/preferences')
            record('saved market_watch preferences', saved['status'] == 200 and restored['body'].get('market_watch') == preference)
            notices = call('/notifications')
            unread = call('/notifications/unread-count')
            visible = notices['body'] if notices['status'] == 200 else []
            reminders = [notice for notice in visible if notice['title'] == 'Synthetic reminder']
            record('notification privacy and count', len(reminders) == 1
                and '_email_' not in json.dumps(visible)
                and unread['body'].get('count') == sum(not notice['is_read'] for notice in visible))
            products = call('/catalog/products')['body']
            codes = {p['market_product']: p for p in products}
            expected = {'B30': 'c4cecebc-3d2d-5840-8021-57a9a11bc673',
                'B100': '74eb9cb5-f0e3-55f1-b82c-fe29b7c45bf5',
                'UCOME_B100': 'e561e43f-d9b2-598e-981c-f1d28d515ddc'}
            record('canonical product IDs', all(codes.get(code, {}).get('id') == identity for code, identity in expected.items()))
            points = call('/catalog/delivery-points')['body']
            singapore = next(point['id'] for point in points if point['name'] == 'Singapore')
            rotterdam = next(point['id'] for point in points if point['name'] == 'Rotterdam')
            typed = {
                'BIO_LNG': {'lng_terms': {'side': 'BID', 'accepted_schemes': ['ISCC_EU', 'REDCERT_EU'],
                    'accepted_custody': ['MASS_BALANCE'], 'require_union_database': True,
                    'accepted_delivery_methods': ['SHIP_TO_SHIP'], 'accept_resellers': True}},
                'UCOME_B100': {'fame_terms': {'side': 'BID', 'neat_fame': True, 'standard': 'EN_14214',
                    'standard_edition': '2012+A2:2019', 'max_cfpp_c': 0, 'sustainability_scheme': 'ISCC_EU'}},
            }
            for product, terms in typed.items():
                payload = {'side': 'BID', 'product_id': codes[product]['id'],
                    'delivery_point_id': rotterdam if product == 'BIO_LNG' else singapore,
                    'quantity_mt': 1, 'price_per_mt_usd': 1, 'availability_window': 'SPOT', **terms}
                response = call('/orderbook', 'POST', payload)
                record(product + ' typed BID', response['status'] == 201, f"HTTP {response['status']}")
                if product == 'BIO_LNG':
                    record('LNG scalar certification derivation', response['body'].get('certifications') == ['ISCC EU', 'REDcert-EU']
                        and response['body'].get('carbon_intensity_gco2_mj') is None)
                    payload['lng_terms']['require_union_database'] = 'true'
                    invalid = call('/orderbook', 'POST', payload)
                    record('LNG strict booleans', invalid['status'] == 422)
                if response['status'] == 201:
                    dismissed = call('/matchmaking/suggestions/' + response['body']['id'] + '/dismiss', 'PATCH')
                    repeated = call('/matchmaking/suggestions/' + response['body']['id'] + '/dismiss', 'PATCH')
                    record(product + ' dismissal replay', dismissed['body'].get('status') == 'dismissed'
                        and repeated['body'].get('status') == 'already_dismissed')
            for product in ('B30', 'B100'):
                response = call('/orderbook', 'POST', {'side': 'BID', 'product_id': expected[product],
                    'delivery_point_id': singapore, 'quantity_mt': 200, 'price_per_mt_usd': 1,
                    'availability_window': 'SPOT'})
                record(product + ' BID against migrated schema', response['status'] in (200, 201),
                    f"HTTP {response['status']}: {str(response['body'])[:240]}")
            rfq = call('/rfq', 'POST', {'product_id': expected['B100'], 'delivery_point_id': singapore,
                'quantity_mt': 200, 'availability_window': 'SPOT', 'expires_in_hours': 24})
            record('scalar RFQ create', rfq['status'] in (200, 201), f"HTTP {rfq['status']}: {str(rfq['body'])[:180]}")
            if rfq['status'] in (200, 201):
                rfq_id = rfq['body']['id']
                detail = call('/rfq/' + rfq_id)
                record('scalar RFQ detail', detail['body'].get('product_id') == expected['B100']
                    and detail['body'].get('contract_terms') is None)
                acceptance = call('/rfq/' + rfq_id + '/accept/00000000-0000-4000-8000-000000000001', 'POST')
                record('RFQ acceptance disabled', acceptance['status'] == 409, f"HTTP {acceptance['status']}")
            for route in ('/app/marketplace?product=B30', '/app/marketplace?product=B100', '/app/compliance'):
                page.evaluate("path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }", route)
                page.wait_for_timeout(1500)
                record('render ' + route, not errors and '/app/' in page.url, '; '.join(errors)[:240])
                if route == '/app/compliance':
                    text = page.locator('body').inner_text()
                    record('unknown ETS displayed as unknown', 'Synthetic unpriced vessel' in text and '€0' not in text,
                        'Old bundle has no null-cost fix' if name == 'old' else '')
            record('no activity calls' if name == 'new' else 'retired activity classified',
                not any('/activity' in path for _, path in requests) if name == 'new' else bool(activity_statuses) and all(status == 404 for status in activity_statuses),
                f'{len(activity_statuses)} activity responses')
            buyer_token = token
            seller_login = call('/auth/login', 'POST', {'email': 'supplier@example.com', 'password': 'Synthetic-Gate-Password-42!'})
            token = seller_login['body']['access_token']
            if rfq['status'] in (200, 201):
                quote = call('/rfq/' + rfq_id + '/quote', 'POST', {'price_per_mt_usd': 900})
                if quote['status'] in (200, 201):
                    revised = call('/rfq/' + rfq_id + '/quotes/' + quote['body']['id'], 'PUT',
                        {'price_per_mt_usd': 910, 'expected_revision': quote['body']['revision']})
                    record('RFQ PUT revision', revised['status'] == 200 and revised['body'].get('revision') == 2,
                        f"HTTP {revised['status']}")
                else:
                    record('RFQ PUT revision', False, f"Quote HTTP {quote['status']}")
            for product, standard in [('B30', 'ISO 8217:2024 RF 380'), ('B100', 'ISO 8217:2024 DFA')]:
                ask = call('/orderbook', 'POST', {'side': 'ASK', 'product_id': expected[product],
                    'delivery_point_id': singapore, 'quantity_mt': 200, 'price_per_mt_usd': 900,
                    'availability_window': 'SPOT', 'certification_declared': True,
                    'certification_scheme': 'ISCC EU', 'certifications': ['ISCC EU'],
                    'specification_standard': standard, 'msds_available': True,
                    'carbon_intensity_gco2_mj': 0, 'carbon_intensity_method': 'whole-fuel lifecycle',
                    'feedstock': 'Used cooking oil', 'origin': 'Singapore'})
                record(product + ' scalar ASK', ask['status'] == 201, f"HTTP {ask['status']}")
                if ask['status'] == 201:
                    token = buyer_token
                    trade = call('/trades/', 'POST', {'order_id': ask['body']['id'], 'quantity_mt': 200,
                        'expected_order_version': ask['body']['version'],
                        'expected_terms_digest': ask['body'].get('terms_digest')})
                    record(product + ' direct take', trade['status'] in (200, 201),
                        f"HTTP {trade['status']}: {str(trade['body'])[:180]}")
                    token = seller_login['body']['access_token']
            token = buyer_token
            # A fresh context has no copied refresh session and must return to login.
            context.clear_cookies()
            page.goto(base + '/app/home', wait_until='domcontentloaded')
            page.wait_for_url('**/login*', timeout=15000)
            record('refresh loss returns to login', True)
            from phase0_gate_m3 import check_m3
            results.extend(check_m3(name, base, api, run, browser))
        except Exception as error:
            record('browser execution', False, f'{type(error).__name__}: {error}'[:500])
        finally:
            context.close()
            browser.close()
    return results
