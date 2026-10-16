"""High-risk M3 browser cases against real synthetic records and local faults."""
import json
import traceback
from urllib.parse import urlsplit

PASSWORD = 'Synthetic-Gate-Password-42!'
PDF = b'%PDF-1.4\n% Synthetic gate document, no personal data\n%%EOF'


def check_m3(bundle, base, api, run, browser):
    results = []
    identities = json.loads((run / 'identities.json').read_text())
    control = run / 'fault-control.json'

    def record(contract, passed, detail=''):
        results.append({'bundle': bundle, 'contract': 'M3 ' + contract,
                        'passed': bool(passed), 'detail': detail})

    def session(account):
        context = browser.new_context(service_workers='block', viewport={'width': 1440, 'height': 1000})
        state = {'token': None, 'proxy504': False, 'committed': False, 'upload_status': None}
        errors = []

        def forward(route):
            url = urlsplit(route.request.url)
            if url.hostname == 'api.verdaxis.exchange':
                if url.path.startswith('/api/stream/'):
                    route.abort()
                    return
                headers = dict(route.request.headers)
                headers.pop('host', None)
                headers.pop('origin', None)
                response = context.request.fetch(api + url.path + ('?' + url.query if url.query else ''),
                    method=route.request.method, headers=headers, data=route.request.post_data_buffer,
                    timeout=20000, max_redirects=0)
                if url.path == '/api/auth/login' and response.ok:
                    state['token'] = response.json()['access_token']
                    state['profile'] = response.json().get('profile')
                if url.path == '/api/kyc/submit':
                    state['upload_status'] = response.status
                    state['committed'] = response.ok
                headers = dict(response.headers)
                headers.update({'access-control-allow-origin': base, 'access-control-allow-credentials': 'true'})
                if url.path == '/api/kyc/submit' and response.ok and state['proxy504']:
                    # The real backend has committed. Only its response is lost at this proxy boundary.
                    route.fulfill(status=504, headers={'content-type': 'application/json',
                        'access-control-allow-origin': base, 'access-control-allow-credentials': 'true'},
                        body='{"detail":"Gateway timeout"}')
                else:
                    route.fulfill(status=response.status, headers=headers, body=response.body())
            elif route.request.url.startswith(base + '/'):
                route.continue_()
            else:
                route.abort()

        context.route('**/*', forward)
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        reset = context.request.post(api + '/.well-known/verdaxis-disposable-test/reset-limits',
            headers={'x-disposable-token': (run / 'disposable-token').read_text()})
        assert reset.status == 204
        page.goto(base + '/login?lang=en', wait_until='domcontentloaded')
        if page.get_by_role('button', name='Essential only').count():
            page.get_by_role('button', name='Essential only').click()
        page.locator('input[type=email]').fill(account + '@example.com')
        page.locator('input[type=password]').fill(PASSWORD)
        page.locator('button[type=submit]').click()
        page.wait_for_function("() => !document.querySelector('input[type=password]')", timeout=30000)
        page.wait_for_timeout(600)
        return context, page, state, errors

    def call(page, state, path, method='GET', body=None):
        result = page.evaluate('''async ({path, method, body, token}) => {
            const response = await fetch('https://api.verdaxis.exchange/api' + path, {
                method, headers: {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'},
                ...(body === null ? {} : {body: JSON.stringify(body)})});
            const text = await response.text(); let data;
            try {data = JSON.parse(text);} catch {data = {text: text.slice(0, 100)};}
            return {status: response.status, data, headers: Object.fromEntries(response.headers)};
        }''', {'path': path, 'method': method, 'body': body, 'token': state['token']})
        return result

    def navigate(page, path):
        page.evaluate("path => {history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate'));}", path)
        page.wait_for_timeout(800)

    for account, reason, eligible in [('rejected', 'KYC_REJECTED', False), ('moved', 'KYC_REQUIRED', False),
            ('noorg', 'NOT_APPLICABLE', False), ('admin', 'NOT_APPLICABLE', False), ('pending', 'KYC_NOT_ENFORCED', True)]:
        context = None
        try:
            context, page, state, errors = session(account)
            before = call(page, state, '/auth/me')
            after = call(page, state, '/auth/me', 'PUT', {'first_name': 'Synthetic'})
            expected = {'eligible': eligible, 'reason': reason, 'grace_expires_at': None}
            record(account + ' login/GET/PUT eligibility', state['profile']['execution_eligibility'] == expected
                and before['data']['execution_eligibility'] == expected
                and after['data']['execution_eligibility'] == expected, f"GET {before['status']}; PUT {after['status']}")
            text = page.locator('body').inner_text()
            record(account + ' guarded UI', not errors and bool(text.strip())
                and (('/register' in page.url or '/onboarding' in page.url or '/organization' in page.url) if account == 'noorg' else '/app' in page.url),
                urlsplit(page.url).path + '; ' + '; '.join(errors))
        except Exception as error:
            record(account + ' profile execution', False, str(error)[:400])
        finally:
            if context:
                context.unroute_all(behavior='ignoreErrors')
                context.close()

    contexts = []
    try:
        buyer, page, state, errors = session('buyer')
        seller, seller_page, seller_state, seller_errors = session('supplier')
        contexts.extend([buyer, seller])
        history = call(page, state, '/rfq/' + identities['historical_rfq'])
        data = history['data']
        record('copied pre-FAME nullable RFQ detail', history['status'] == 200
            and data['contract_terms'] is None and data['source_offer_snapshot'] is None
            and data['quotes'][0]['offer_terms'] is None
            and data['status'] == 'CANCELLED', 'Stored quote expiry is NULL; API derives the expired RFQ deadline without rewriting history')
        listing = call(page, state, '/rfq')
        items = listing['data'].get('items', []) if isinstance(listing['data'], dict) else listing['data']
        record('copied RFQ list retains historical row', any(row['id'] == identities['historical_rfq'] for row in items),
            'Pinned old bundle has no RFQ detail route; measured at its browser client boundary' if bundle == 'old' else '')
        if bundle == 'new':
            try:
                navigate(page, '/app/marketplace?product=UCOME_B100&view=history_rfqs')
                page.get_by_role('button').filter(has_text=identities['historical_rfq'][:8]).click(timeout=10000)
                page.wait_for_timeout(500)
                record('copied RFQ history rendering', not errors and 'Contract requirements' not in page.locator('body').inner_text(),
                    'Actual history-only workspace opens the nullable scalar row')
            except Exception as error:
                record('copied RFQ history rendering', False, str(error)[:250] + '; body: ' + page.locator('body').inner_text()[:500])
        products = {item['market_product']: item['id'] for item in call(page, state, '/catalog/products')['data']}
        points = {item['name']: item['id'] for item in call(page, state, '/catalog/delivery-points')['data']}
        for product, terms in identities['typed'].items():
            key = 'lng_terms' if product == 'BIO_LNG' else 'fame_terms'
            snapshot = key + '_snapshot'
            private_field = 'scheme_certificate_number' if product == 'BIO_LNG' else 'certificate_reference'
            declaration = terms['ask']
            ask = call(seller_page, seller_state, '/orderbook', 'POST', {
                'side': 'ASK', 'product_id': products[product],
                'delivery_point_id': points['Rotterdam' if product == 'BIO_LNG' else 'Singapore'],
                'quantity_mt': 10, 'price_per_mt_usd': 1200, 'availability_window': 'SPOT',
                'certification_declared': True, 'msds_available': True, key: declaration})
            record(product + ' supplier ASK', ask['status'] == 201, str(ask)[:250] if ask['status'] != 201 else '')
            if ask['status'] != 201:
                continue
            order = ask['data']
            public = call(page, state, '/orderbook/asks?market_product=' + product)
            assert public['status'] == 200, f'Public order HTTP {public["status"]}: {public["data"]}'
            public_rows = public['data'].get('items', []) if isinstance(public['data'], dict) else public['data']
            public_order = next(row for row in public_rows if row['id'] == order['id'])
            own = call(seller_page, seller_state, '/orderbook/my')
            assert own['status'] == 200, f'Private order HTTP {own["status"]}: {own["data"]}'
            own_rows = own['data'].get('items', []) if isinstance(own['data'], dict) else own['data']
            own_order = next(row for row in own_rows if row['id'] == order['id'])
            record(product + ' public/private order projection', private_field not in public_order[key]
                and own_order[key].get(private_field) == declaration[private_field])
            trade = call(page, state, '/trades/', 'POST', {'order_id': order['id'], 'quantity_mt': 1,
                'expected_order_version': order['version'], 'expected_terms_digest': order['terms_digest'], key: terms['bid']})
            record(product + ' pending private snapshot redaction', trade['status'] == 200
                and private_field not in trade['data'].get(snapshot, {}).get('ask', {}), f"HTTP {trade['status']}")
            if trade['status'] != 200:
                continue
            navigate(page, '/app/trades')
            page.wait_for_timeout(1000)
            record(product + ' pending trade rendering', not errors and declaration[private_field] not in page.locator('body').inner_text())
            confirmed = call(seller_page, seller_state, '/trades/' + trade['data']['id'] + '/confirm', 'PUT')
            record(product + ' confirmed full snapshot', confirmed['status'] == 200
                and confirmed['data'].get(snapshot, {}).get('ask', {}).get(private_field) == declaration[private_field],
                f"HTTP {confirmed['status']}")
            navigate(seller_page, '/app/trades')
            # Expand the bundle's own terms controls, where that product is supported.
            seller_page.wait_for_timeout(1000)
            for details in seller_page.locator('details').all():
                details.evaluate('(element) => element.open = true')
            if bundle == 'old' and product == 'BIO_LNG':
                for button in seller_page.get_by_role('button').all():
                    if 'terms' in button.inner_text().lower():
                        button.click()
            record(product + ' confirmed trade rendering', not seller_errors and
                (declaration[private_field] in seller_page.locator('body').inner_text()
                 if bundle == 'new' or product == 'BIO_LNG' else True),
                'Old bundle has no UCOME terms panel; API snapshot checked' if bundle == 'old' and product == 'UCOME_B100' else '')
    except Exception as error:
        record('history/typed execution', False, traceback.format_exc()[-1000:])
    finally:
        for context in contexts:
            context.unroute_all(behavior='ignoreErrors')
            context.close()

    context = admin = None
    try:
        context, page, state, errors = session('upload')
        admin, admin_page, admin_state, _ = session('admin')
        before = call(admin_page, admin_state, '/kyc/admin/' + identities['upload'] + '/documents')
        initial_count = len(before['data'])
        for mode in ('unavailable', 'available'):
            control.write_text(json.dumps({'vault': mode}))
            navigate(page, '/kyc')
            page.locator('input[type=file]').nth(0).set_input_files({'name': 'identity.pdf', 'mimeType': 'application/pdf', 'buffer': PDF})
            page.locator('input[type=file]').nth(1).set_input_files({'name': 'company.pdf', 'mimeType': 'application/pdf', 'buffer': PDF})
            state['proxy504'] = mode == 'available'
            state['upload_status'] = None
            page.locator('button[type=submit]').click()
            page.locator('input[type=file]').first.wait_for(state='attached', timeout=15000)
            page.wait_for_timeout(500)
            text = page.locator('body').inner_text()
            documents = call(admin_page, admin_state, '/kyc/admin/' + identities['upload'] + '/documents')
            no_false_success = 'Account Approved!' not in text and 'Your account is approved' not in text
            no_false_rollback = 'nothing was saved' not in text.lower() and 'no documents were saved' not in text.lower()
            if mode == 'unavailable':
                record('KYC storage 503 UI and no retained rows', state['upload_status'] == 503
                    and len(documents['data']) == initial_count and no_false_success and no_false_rollback,
                    f"HTTP {state['upload_status']}; documents {len(documents['data']) - initial_count}; {text[-250:]}")
            else:
                record('KYC committed upload then proxy 504 UI', state['committed'] and len(documents['data']) == initial_count + 2
                    and no_false_success and no_false_rollback,
                    f"Upstream {state['upload_status']}; browser 504; retained delta {len(documents['data']) - initial_count}")
                document = documents['data'][0]['id']
                control.write_text(json.dumps({'vault': 'unavailable'}))
                decrypted = call(admin_page, admin_state, '/kyc/admin/documents/' + document)
                record('KYC decrypt 500 at browser client boundary', decrypted['status'] == 500
                    and decrypted['data'].get('detail', {}).get('code') == 'KYC_DOCUMENT_DECRYPTION_FAILED',
                    'Real retained ciphertext + unavailable key; browser fetch sees 500; neither bundle has a vault-download UI')
                control.write_text(json.dumps({'vault': 'available'}))
                state['proxy504'] = False
                navigate(page, '/app/home')
                navigate(page, '/kyc')
                page.locator('input[type=file]').nth(0).set_input_files({'name': 'identity.pdf', 'mimeType': 'application/pdf', 'buffer': PDF})
                page.locator('input[type=file]').nth(1).set_input_files({'name': 'company.pdf', 'mimeType': 'application/pdf', 'buffer': PDF})
                page.locator('button[type=submit]').click()
                page.wait_for_timeout(1200)
                text = page.locator('body').inner_text()
                record('KYC review receipt is not account approval', state['committed']
                    and 'Account Approved!' not in text and 'Documents submitted for review' in text,
                    'Old cached KYC approval wording is outside the ETS exception' if bundle == 'old' else '')

    except Exception as error:
        record('KYC fault execution', False, str(error)[:500])
    finally:
        control.write_text(json.dumps({'vault': 'unavailable'}))
        if context:
            context.unroute_all(behavior='ignoreErrors')
            context.close()
        if admin:
            admin.unroute_all(behavior='ignoreErrors')
            admin.close()
    return results
