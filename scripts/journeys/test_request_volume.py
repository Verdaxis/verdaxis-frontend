"""Browser accounting and founder decision 96 comparison contracts."""
import copy
import json
import unittest

from . import request_volume as volume


class RequestVolumeTests(unittest.TestCase):
    def sample(self, count=1):
        ledger = volume.RequestLedger()
        for index in range(count):
            ledger.record(index, 'GET', '/api/orderbook/asks?skip=8&limit=8')
        return volume.make_sample({'browse': ledger.summary(60)}, source_sha='a' * 40,
                                  backend_sha='b' * 40, streams='live', complete=True)

    def baseline(self):
        return volume.make_baseline([self.sample()], historical=[self.sample(n) for n in (1, 2, 3)])

    def test_shared_tracker_aggregates_children_by_canonical_scope(self):
        tracker = volume.StreamTracker()
        tracker.event('parent-1', 'trades', ('generation-1', 'user-a', 'org-a', None), 'open')
        tracker.event('child-1', 'trades', ('generation-1', 'user-a', 'org-a', None), 'open')
        tracker.event('other-org', 'trades', ('generation-1', 'user-a', 'org-b', None), 'open')
        self.assertEqual(sorted(tracker.maxima.values()), [1, 2])
        tracker.event('parent-1', 'trades', None, 'close')
        tracker.event('child-1', 'trades', None, 'close')
        tracker.event('other-org', 'trades', None, 'close')
        self.assertEqual(tracker.active_count, 0)

    def test_public_streams_ignore_private_scope(self):
        tracker = volume.StreamTracker()
        tracker.event('a', 'orderbook', ('a',), 'open')
        tracker.event('b', 'orderbook', ('b',), 'open')
        self.assertEqual(tracker.maxima, {'orderbook:default:public': 2})

    def test_connection_ceiling_is_per_browser_context(self):
        for contexts, passed in [(('buyer', 'supplier'), True), (('buyer', 'buyer'), False)]:
            with self.subTest(contexts=contexts):
                tracker = volume.StreamTracker()
                for index, context in enumerate(contexts):
                    tracker.event((context, str(index)), 'orderbook', None, 'open')
                candidate = self.baseline()
                candidate['samples'][0]['scenarios']['browse']['stream_maxima'] = tracker.maxima
                errors = volume.compare(self.baseline(), candidate, enforce_stream_ceiling=True)
                self.assertEqual(not errors, passed, errors)

    def test_context_teardown_removes_only_its_physical_connections(self):
        tracker = volume.StreamTracker()
        tracker.event(('a', '1'), 'orderbook', None, 'open')
        tracker.event(('b', '1'), 'orderbook', None, 'open')
        tracker.close_context('a')
        self.assertEqual(tracker.active_count, 1)
        tracker.close_context('b')
        self.assertEqual(tracker.active_count, 0)

    def test_forwarded_request_is_counted_once(self):
        ledger = volume.RequestLedger()
        for _ in range(2):
            ledger.record('one', 'GET', '/api/orderbook/asks?skip=8&limit=8')
        summary = ledger.summary(60)
        self.assertEqual(summary['rest_total'], 1)
        self.assertEqual(summary['buckets'], {'GET /api/orderbook/asks': 1})
        self.assertEqual(ledger.records[0]['params'], {'limit': '8', 'skip': '8', 'side': 'ASK'})

    def test_failed_aborted_and_options_attempts_count(self):
        ledger = volume.RequestLedger()
        for identity, outcome in [('failed', 'failed'), ('aborted', 'aborted')]:
            ledger.record(identity, 'GET', '/api/catalog/products')
            ledger.finish(identity, outcome)
        ledger.record('preflight', 'OPTIONS', '/api/orderbook/asks')
        summary = ledger.summary(30)
        self.assertEqual(summary['rest_total'], 3)
        self.assertEqual(summary['failed_attempts'], 2)
        self.assertEqual(summary['buckets']['OPTIONS /api/orderbook/asks'], 1)
        self.assertEqual(summary['requests_per_minute'], 6)

    def test_direct_seed_and_screenshot_categories_are_excluded(self):
        ledger = volume.RequestLedger()
        for category in ('seed', 'assertion', 'screenshot', 'browser'):
            ledger.record(category, 'GET', '/api/ports', category=category)
        self.assertEqual(ledger.summary(60)['rest_total'], 1)
        self.assertEqual(ledger.summary(60)['categories'],
                         {'seed': 1, 'assertion': 1, 'screenshot': 1, 'browser': 1})

    def test_streams_and_secrets_are_not_rest_or_evidence(self):
        ledger = volume.RequestLedger()
        ledger.record('stream', 'GET', '/api/stream/trades?stream_token=secret&last_event_id=42',
                      headers={'Authorization': 'Bearer secret', 'Cookie': 'secret'})
        ledger.record('token', 'GET', '/api/auth/stream-token', headers={'authorization': 'secret'})
        self.assertNotIn('secret', json.dumps(ledger.records))
        self.assertEqual(ledger.summary(60)['rest_total'], 1)
        self.assertEqual(ledger.summary(60)['sse_starts'], 1)

    def test_dynamic_ids_normalize(self):
        ledger = volume.RequestLedger()
        ledger.record('a', 'POST', '/api/orderbook/123e4567-e89b-12d3-a456-426614174000/cancel')
        self.assertIn('POST /api/orderbook/{id}/cancel', ledger.summary(60)['buckets'])

    def test_one_sample_plus_observed_spread_is_allowed(self):
        baseline = self.baseline()
        self.assertEqual(baseline['policy']['browse']['tolerance'], 2)
        self.assertEqual(volume.compare(baseline, volume.make_baseline([self.sample(3)])), [])
        self.assertTrue(volume.compare(baseline, volume.make_baseline([self.sample(4)])))

    def test_historical_route_is_allowed_but_new_route_fails(self):
        historical = [self.sample() for _ in range(3)]
        for sample in historical:
            sample['scenarios']['browse']['buckets'] = {'GET /api/ports': 1}
        baseline = volume.make_baseline([self.sample()], historical=historical)
        candidate = volume.make_baseline([copy.deepcopy(historical[0])])
        self.assertEqual(volume.compare(baseline, candidate), [])
        candidate['samples'][0]['scenarios']['browse']['buckets'] = {'GET /api/new': 1}
        self.assertTrue(volume.compare(baseline, candidate))

    def test_missing_sample_scenario_pin_and_partial_evidence_fail(self):
        baseline = self.baseline()
        for change in ('sample', 'scenario', 'backend_sha', 'scenario_version', 'streams', 'complete'):
            candidate = copy.deepcopy(baseline)
            sample = candidate['samples'][0]
            if change == 'sample':
                candidate['samples'] = []
            elif change == 'scenario':
                sample['scenarios'] = {}
            else:
                sample[change] = False if change == 'complete' else 'wrong'
            self.assertTrue(volume.compare(baseline, candidate), change)

    def test_slow_run_cannot_dilute_count_growth(self):
        candidate = volume.make_baseline([self.sample(4)])
        candidate['samples'][0]['scenarios']['browse']['duration_seconds'] = 600
        candidate['samples'][0]['scenarios']['browse']['requests_per_minute'] = .4
        self.assertTrue(volume.compare(self.baseline(), candidate))

    def test_duplicate_stream_allowed_until_explicit_ceiling(self):
        baseline = self.baseline()
        candidate = copy.deepcopy(baseline)
        candidate['samples'][0]['scenarios']['browse']['stream_maxima'] = {'trades:actor-1': 2}
        self.assertEqual(volume.compare(baseline, candidate), [])
        self.assertTrue(volume.compare(baseline, candidate, enforce_stream_ceiling=True))

    def test_stream_leaks_and_prices_always_fail(self):
        for change in ('leak', 'prices'):
            candidate = self.baseline()
            scenario = candidate['samples'][0]['scenarios']['browse']
            if change == 'leak':
                scenario['streams_after_close'] = 1
            else:
                scenario['stream_maxima'] = {'prices:public': 1}
            self.assertTrue(volume.compare(self.baseline(), candidate))


if __name__ == '__main__':
    unittest.main()
