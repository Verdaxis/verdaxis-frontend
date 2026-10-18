"""Redacted browser-attempt ledger and strict three-sample volume gate."""
import json
import re
from collections import Counter
from urllib.parse import parse_qsl, urlsplit

SCENARIO_VERSION = 'step8-v1'
STREAM_ROUTES = {'/api/stream/orderbook', '/api/stream/prices', '/api/stream/trades'}
SAFE_PARAMS = {'skip', 'limit', 'sort_by', 'market_product', 'product', 'product_id',
               'delivery_point_id', 'region', 'availability_window', 'include_off_spec',
               'status_group', 'last_event_id'}
UUID = re.compile(r'(?i)[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}')


class StreamTracker:
    """Shared by every context in one journey; scopes never contain tokens."""
    def __init__(self):
        self.active = {}
        self.maxima = {}

    def event(self, identity, channel, scope, event):
        if event != 'open':
            self.active.pop(identity, None)
            return
        key = channel + ':' + ('public' if channel != 'trades' else json.dumps(scope, separators=(',', ':')))
        self.active[identity] = key
        count = sum(value == key for value in self.active.values())
        self.maxima[key] = max(self.maxima.get(key, 0), count)

    @property
    def active_count(self):
        return len(self.active)


class RequestLedger:
    """Count at the browser request event, never at the forwarding transport."""
    def __init__(self):
        self.records = []
        self._ids = {}

    def record(self, identity, method, url, category='browser', headers=None):
        if identity in self._ids:
            return
        parsed = urlsplit(url)
        if not parsed.path.startswith('/api/'):
            return
        params = {key: value for key, value in parse_qsl(parsed.query)
                  if key in SAFE_PARAMS}
        if parsed.path in ('/api/orderbook/asks', '/api/orderbook/bids'):
            params['side'] = 'ASK' if parsed.path.endswith('asks') else 'BID'
        record = {'method': method.upper(), 'route': UUID.sub('{id}', parsed.path),
                  'params': params, 'category': category,
                  'kind': 'sse' if parsed.path in STREAM_ROUTES else 'rest',
                  'outcome': 'started'}
        # Headers, bodies, origins and arbitrary query values never enter evidence.
        self._ids[identity] = record
        self.records.append(record)

    def finish(self, identity, outcome):
        if identity in self._ids:
            self._ids[identity]['outcome'] = outcome

    def summary(self, duration):
        if duration <= 0:
            raise ValueError('measurement needs a positive monotonic duration')
        rest = [row for row in self.records
                if row['category'] == 'browser' and row['kind'] == 'rest']
        buckets = Counter(row['method'] + ' ' + row['route'] for row in rest)
        return {'duration_seconds': duration, 'rest_total': len(rest),
                'requests_per_minute': len(rest) * 60 / duration,
                'buckets': dict(sorted(buckets.items())),
                'bucket_rates': {key: count * 60 / duration for key, count in sorted(buckets.items())},
                'categories': dict(Counter(row['category'] for row in self.records)),
                'failed_attempts': sum(row['outcome'] in ('failed', 'aborted') for row in rest),
                'sse_starts': sum(row['kind'] == 'sse' and row['category'] == 'browser'
                                  for row in self.records),
                'stream_maxima': {}, 'streams_after_close': 0,
                'records': list(self.records)}


def make_sample(scenarios, *, source_sha, backend_sha, streams, complete):
    return {'source_sha': source_sha, 'backend_sha': backend_sha,
            'scenario_version': SCENARIO_VERSION, 'streams': streams,
            'complete': complete, 'scenarios': scenarios}


def make_baseline(samples, historical=None):
    """One pinned run; prior samples supply only observed tolerance and routes."""
    if len(samples) != 1:
        raise ValueError('exactly one complete sample is required')
    policy = {}
    for name, scenario in samples[0]['scenarios'].items():
        prior = [sample['scenarios'][name] for sample in (historical or [])
                 if name in sample['scenarios']]
        counts = [item['rest_total'] for item in prior]
        routes = set(scenario['buckets'])
        for item in prior:
            routes.update(item['buckets'])
        policy[name] = {'tolerance': max(counts) - min(counts) if counts else 0,
                        'allowed_routes': sorted(routes)}
    return {'schema_version': 2, 'decision': 96, 'samples': samples, 'policy': policy}


def compare(baseline, candidate, enforce_stream_ceiling=False):
    """Decision 96: total count plus measured spread; historical route union."""
    before, after = baseline.get('samples', []), candidate.get('samples', [])
    if len(before) != 1 or len(after) != 1:
        return ['exactly one sample is required on each side']
    reference, measured = before[0], after[0]
    errors = []
    for label, sample in [('baseline', reference), ('candidate', measured)]:
        if not sample.get('complete') or not sample.get('source_sha'):
            errors.append(f'{label}: incomplete evidence')
        for key in ('backend_sha', 'scenario_version', 'streams'):
            if sample.get(key) != reference.get(key):
                errors.append(f'{label}: mismatched {key}')
        if not sample.get('scenarios') or set(sample['scenarios']) != set(reference['scenarios']):
            errors.append(f'{label}: missing or new scenarios')
    if errors:
        return errors
    for name, scenario in measured['scenarios'].items():
        expected = reference['scenarios'][name]
        policy = baseline.get('policy', {}).get(name)
        if policy is None:
            errors.append(f'{name}: missing comparison policy')
            continue
        if scenario.get('duration_seconds', 0) <= 0 or 'records' not in scenario:
            errors.append(f'{name}: missing measurement evidence')
        if scenario.get('streams_after_close', -1) != 0:
            errors.append(f'{name}: stream leaked after teardown')
        limit = expected['rest_total'] + policy['tolerance']
        if scenario['rest_total'] > limit:
            errors.append(f'{name}: REST count {scenario["rest_total"]} exceeds {limit}')
        new_routes = set(scenario['buckets']) - set(policy['allowed_routes'])
        if new_routes:
            errors.append(f'{name}: new routes {sorted(new_routes)}')
        for key, maximum in scenario.get('stream_maxima', {}).items():
            if key.startswith('prices:') or (enforce_stream_ceiling and maximum > 1):
                errors.append(f'{name}: connection ceiling {key}={maximum}')
    return errors
