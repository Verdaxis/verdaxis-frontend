import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CLAIM_WINDOW_MS,
  TRADE_ALERT_ELECTION_CHANNEL,
  openTradeAlertElection,
} from '../services/tradeAlertElection';

// An in-memory BroadcastChannel hub: every instance is one "tab". Like the real
// one, a channel never receives its own messages.
class FakeBroadcastChannel {
  static instances = new Set<FakeBroadcastChannel>();
  onmessage: ((message: MessageEvent) => void) | null = null;

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.add(this);
  }

  postMessage(data: unknown) {
    for (const peer of FakeBroadcastChannel.instances) {
      if (peer !== this && peer.name === this.name) peer.onmessage?.({ data } as MessageEvent);
    }
  }

  close() {
    FakeBroadcastChannel.instances.delete(this);
  }
}

let visibility: DocumentVisibilityState = 'visible';

// Each tab announces the visibility it has at the moment it claims.
const claimAs = (
  election: ReturnType<typeof openTradeAlertElection>,
  state: DocumentVisibilityState,
  key: string,
) => {
  visibility = state;
  return election.claim(key);
};

describe('trade alert tab election', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeBroadcastChannel.instances.clear();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('uses its own channel name', () => {
    openTradeAlertElection();
    expect([...FakeBroadcastChannel.instances][0].name).toBe(TRADE_ALERT_ELECTION_CHANNEL);
  });

  it('lets a single tab win and reports its own visibility', async () => {
    const tab = openTradeAlertElection();
    const result = claimAs(tab, 'hidden', 'id:1');
    await vi.advanceTimersByTimeAsync(CLAIM_WINDOW_MS);
    await expect(result).resolves.toEqual({ won: true, anyTabVisible: false });
  });

  it('elects exactly one tab among several that see the same event', async () => {
    const tabs = [openTradeAlertElection(), openTradeAlertElection(), openTradeAlertElection()];
    const results = tabs.map((tab) => claimAs(tab, 'hidden', 'id:7'));
    await vi.advanceTimersByTimeAsync(CLAIM_WINDOW_MS);
    const settled = await Promise.all(results);
    expect(settled.filter((result) => result.won)).toHaveLength(1);
  });

  it('prefers a visible tab over a hidden one and tells the hidden tab that Verdaxis is in front', async () => {
    // Tab ids are random, so repeat: a ranking that ignored visibility would
    // pick the visible tab only about half of the time.
    for (let round = 0; round < 12; round += 1) {
      const hiddenTab = openTradeAlertElection();
      const visibleTab = openTradeAlertElection();
      const hidden = claimAs(hiddenTab, 'hidden', `id:2-${round}`);
      const visible = claimAs(visibleTab, 'visible', `id:2-${round}`);
      await vi.advanceTimersByTimeAsync(CLAIM_WINDOW_MS);

      expect(await visible).toEqual({ won: true, anyTabVisible: true });
      expect(await hidden).toEqual({ won: false, anyTabVisible: true });
      hiddenTab.close();
      visibleTab.close();
    }
  });

  it('refuses a tab that asks after another tab has already decided', async () => {
    const first = openTradeAlertElection();
    const late = openTradeAlertElection();
    const firstResult = claimAs(first, 'hidden', 'id:3');
    await vi.advanceTimersByTimeAsync(CLAIM_WINDOW_MS);
    expect((await firstResult).won).toBe(true);

    await vi.advanceTimersByTimeAsync(500);
    const lateResult = claimAs(late, 'visible', 'id:3');
    await vi.advanceTimersByTimeAsync(CLAIM_WINDOW_MS);
    expect((await lateResult).won).toBe(false);
  });

  it('elects each event key separately', async () => {
    const tab = openTradeAlertElection();
    const other = openTradeAlertElection();
    const a = claimAs(tab, 'visible', 'id:10');
    const b = claimAs(other, 'visible', 'id:11');
    await vi.advanceTimersByTimeAsync(CLAIM_WINDOW_MS);
    expect((await a).won).toBe(true);
    expect((await b).won).toBe(true);
  });

  it('refuses a key this tab already handled', async () => {
    const tab = openTradeAlertElection();
    const first = claimAs(tab, 'visible', 'id:4');
    await vi.advanceTimersByTimeAsync(CLAIM_WINDOW_MS);
    expect((await first).won).toBe(true);

    await expect(claimAs(tab, 'visible', 'id:4')).resolves.toEqual({ won: false, anyTabVisible: false });
  });

  it('decides alone and still de-duplicates when BroadcastChannel is unavailable', async () => {
    vi.stubGlobal('BroadcastChannel', undefined);
    const tab = openTradeAlertElection();
    await expect(claimAs(tab, 'hidden', 'id:5')).resolves.toEqual({ won: true, anyTabVisible: false });
    await expect(claimAs(tab, 'hidden', 'id:5')).resolves.toMatchObject({ won: false });
  });

  it('sends no personal data: only a type, key, random tab id and visibility', async () => {
    const tab = openTradeAlertElection();
    const spy = vi.spyOn(FakeBroadcastChannel.prototype, 'postMessage');
    const result = claimAs(tab, 'hidden', 'id:6');
    await vi.advanceTimersByTimeAsync(CLAIM_WINDOW_MS);
    await result;
    expect(Object.keys(spy.mock.calls[0][0] as object).sort()).toEqual(['key', 'tabId', 'type', 'visible']);
  });
});
