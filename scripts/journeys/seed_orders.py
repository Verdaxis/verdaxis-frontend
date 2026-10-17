#!/usr/bin/env python3
"""Seed fixture orders through the running backend's real HTTP contract.

Runs after the disposable backend is ready. Writes two B30 ASKs (supplier) and
two B30 BIDs (buyer) at Singapore so the browse, order book, map and trade
journeys read rows a real user could create. Prints one JSON line: counts.
"""
import argparse
import json
import sys
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ASK_METADATA = {
    'certification_declared': True,
    'msds_available': True,
    'certification_scheme': 'ISCC EU',
    'certifications': ['ISCC EU'],
    'specification_standard': 'ISO 8217:2024 RF 380',
    'carbon_intensity_gco2_mj': 18,
    'carbon_intensity_method': 'Journeys whole-fuel lifecycle',
    'feedstock': 'Used cooking oil',
    'origin': 'Singapore',
}


def call(origin, path, method='GET', token=None, body=None, form=None):
    headers = {}
    data = None
    if token:
        headers['Authorization'] = f'Bearer {token}'
    if form is not None:
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
        data = form.encode()
    elif body is not None:
        headers['Content-Type'] = 'application/json'
        data = json.dumps(body).encode()
    request = Request(origin + path, data=data, headers=headers, method=method)
    try:
        with urlopen(request, timeout=30) as response:
            text = response.read().decode()
            try:
                return response.status, json.loads(text)
            except Exception:
                return response.status, {'raw': text[:200]}
    except HTTPError as error:
        text = error.read().decode()
        try:
            return error.code, json.loads(text)
        except Exception:
            return error.code, {'raw': text[:200]}


def login(origin, email, password):
    status, payload = call(origin, '/api/auth/login', method='POST',
                           form=urlencode({'username': email, 'password': password}))
    if status != 200:
        raise SystemExit(f'login failed for {email}: HTTP {status}: {payload}')
    return payload['access_token']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--api', required=True, help='backend origin')
    parser.add_argument('--password', required=True)
    args = parser.parse_args()
    origin = args.api.rstrip('/')

    _, products = call(origin, '/api/catalog/products', token=login(
        origin, 'buyer@example.com', args.password))
    product_id = next(row['id'] for row in products if row['market_product'] == 'B30')
    _, points = call(origin, '/api/catalog/delivery-points')
    point_id = next(row['id'] for row in points if row['name'] == 'Singapore')

    supplier = login(origin, 'supplier@example.com', args.password)
    buyer = login(origin, 'buyer@example.com', args.password)

    created = {'asks': [], 'bids': []}
    for quantity, price in ((200, 915), (400, 930)):
        status, payload = call(origin, '/api/orderbook', method='POST', token=supplier,
                               body={'side': 'ASK', 'product_id': product_id,
                                     'delivery_point_id': point_id,
                                     'quantity_mt': quantity, 'price_per_mt_usd': price,
                                     'availability_window': 'SPOT', **ASK_METADATA})
        if status not in (200, 201):
            raise SystemExit(f'ASK seed failed: HTTP {status}: {payload}')
        created['asks'].append(payload['id'])
    for quantity, price in ((200, 640), (300, 615)):
        status, payload = call(origin, '/api/orderbook', method='POST', token=buyer,
                               body={'side': 'BID', 'product_id': product_id,
                                     'delivery_point_id': point_id,
                                     'quantity_mt': quantity, 'price_per_mt_usd': price,
                                     'availability_window': 'SPOT',
                                     'certifications': []})
        if status not in (200, 201):
            raise SystemExit(f'BID seed failed: HTTP {status}: {payload}')
        created['bids'].append(payload['id'])
    print(json.dumps(created), flush=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
