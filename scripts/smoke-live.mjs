#!/usr/bin/env node

const EXPECTED_PRODUCTS = [
  'BIO_ETHANOL',
  'BIO_METHANOL',
  'E_METHANOL',
  'SYNTHETIC_ETHANOL',
];

const EXPECTED_DELIVERY_POINTS = [
  'Busan',
  'Dalian',
  'Houston',
  'Los Angeles',
  'Rotterdam',
  'Santos',
  'Shanghai',
  'Singapore',
];

const TARGETS = {
  prod: {
    app: 'https://app.verdaxis.exchange',
    api: 'https://api.verdaxis.exchange/api',
    expectedApiInBundle: 'https://api.verdaxis.exchange/api',
  },
  staging: {
    app: 'https://staging.verdaxis.exchange',
    api: 'https://api-staging.verdaxis.exchange/api',
    expectedApiInBundle: 'https://api-staging.verdaxis.exchange/api',
  },
};

const selectedTargets = (process.argv[2] || 'prod,staging')
  .split(',')
  .map((target) => target.trim())
  .filter(Boolean);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  assert(response.ok, `${url} returned ${response.status}`);
  return response.json();
}

async function fetchExpectStatus(url, expectedStatus) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  assert(
    response.status === expectedStatus,
    `${url} returned ${response.status}; expected ${expectedStatus}`
  );
  return response;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { accept: 'text/html,*/*' } });
  assert(response.ok, `${url} returned ${response.status}`);
  return response.text();
}

function sorted(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function assertExactSet(actual, expected, label) {
  const actualSorted = sorted(actual);
  const expectedSorted = sorted(expected);
  assert(
    JSON.stringify(actualSorted) === JSON.stringify(expectedSorted),
    `${label} mismatch. Expected ${expectedSorted.join(', ')}, got ${actualSorted.join(', ')}`
  );
}

function assertOrderSlice(items, expected, label) {
  assert(Array.isArray(items), `${label}: response missing items array`);
  for (const order of items) {
    assert(order.market_product === expected.marketProduct, `${label}: order ${order.id} has market_product ${order.market_product}`);
    assert(order.delivery_point_id === expected.deliveryPointId, `${label}: order ${order.id} has delivery_point_id ${order.delivery_point_id}`);
    assert(
      order.availability_window === expected.availabilityWindow,
      `${label}: order ${order.id} has availability_window ${order.availability_window}`
    );
  }
}

async function smokeTarget(name, target) {
  const html = await fetchText(target.app);
  const assetMatch = html.match(/\/assets\/index-[^"]+\.js/);
  assert(assetMatch, `${name}: could not find hashed index asset in HTML`);

  const bundle = await fetchText(`${target.app}${assetMatch[0]}`);
  assert(
    bundle.includes(target.expectedApiInBundle),
    `${name}: bundle does not contain expected API target ${target.expectedApiInBundle}`
  );

  const health = await fetchJson(`${target.api.replace(/\/api$/, '')}/health`);
  assert(health.status === 'healthy' || health.status === 'ok', `${name}: unexpected health status`);

  const products = await fetchJson(`${target.api}/catalog/products`);
  assertExactSet(
    products.map((product) => product.market_product).filter(Boolean),
    EXPECTED_PRODUCTS,
    `${name}: market products`
  );

  const deliveryPoints = await fetchJson(`${target.api}/catalog/delivery-points`);
  assertExactSet(
    deliveryPoints.map((point) => point.name),
    EXPECTED_DELIVERY_POINTS,
    `${name}: delivery points`
  );

  const bioMethanol = products.find((product) => product.market_product === 'BIO_METHANOL');
  const singapore = deliveryPoints.find((point) => point.name === 'Singapore');
  assert(bioMethanol?.id, `${name}: missing Bio Methanol product id`);
  assert(singapore?.id, `${name}: missing Singapore delivery point id`);

  const curveUrl = new URL(`${target.api}/curves/forward`);
  curveUrl.searchParams.set('product_id', bioMethanol.id);
  curveUrl.searchParams.set('delivery_point_id', singapore.id);
  const curve = await fetchJson(curveUrl);
  assert(Array.isArray(curve.curve), `${name}: forward curve response missing curve array`);

  const sliceParams = new URLSearchParams({
    market_product: 'BIO_METHANOL',
    delivery_point_id: singapore.id,
    availability_window: 'SPOT',
  });
  const bids = await fetchJson(`${target.api}/orderbook/bids?${sliceParams.toString()}&limit=100`);
  const asks = await fetchJson(`${target.api}/orderbook/asks?${sliceParams.toString()}&limit=100`);
  assertOrderSlice(bids.items, {
    marketProduct: 'BIO_METHANOL',
    deliveryPointId: singapore.id,
    availabilityWindow: 'SPOT',
  }, `${name}: filtered bids`);
  assertOrderSlice(asks.items, {
    marketProduct: 'BIO_METHANOL',
    deliveryPointId: singapore.id,
    availabilityWindow: 'SPOT',
  }, `${name}: filtered asks`);

  const prices = await fetchJson(`${target.api}/prices?${sliceParams.toString()}&hours=168`);
  assert(Array.isArray(prices.summaries), `${name}: price summaries missing summaries array`);
  for (const summary of prices.summaries) {
    assert(summary.market_product === 'BIO_METHANOL', `${name}: price summary has market_product ${summary.market_product}`);
    assert(summary.delivery_point_id === singapore.id, `${name}: price summary has delivery_point_id ${summary.delivery_point_id}`);
    assert(summary.availability_window === 'SPOT', `${name}: price summary has availability_window ${summary.availability_window}`);
  }

  const referencePrices = await fetchJson(`${target.api}/prices/reference?${sliceParams.toString()}&visibility=internal`);
  assert(Array.isArray(referencePrices.prices), `${name}: reference prices missing prices array`);
  for (const price of referencePrices.prices) {
    assert(price.market_product === 'BIO_METHANOL', `${name}: reference price has market_product ${price.market_product}`);
    assert(price.delivery_point_id === singapore.id, `${name}: reference price has delivery_point_id ${price.delivery_point_id}`);
    assert(price.availability_window === 'SPOT', `${name}: reference price has availability_window ${price.availability_window}`);
  }

  await fetchExpectStatus(`${target.api}/prices?market_product=BAD&availability_window=SPOT`, 422);

  console.log(`${name}: ok`);
}

for (const name of selectedTargets) {
  const target = TARGETS[name];
  assert(target, `Unknown smoke target '${name}'. Use prod, staging, or prod,staging.`);
  await smokeTarget(name, target);
}
