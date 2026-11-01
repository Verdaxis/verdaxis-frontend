import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  playTradeAlertTone,
  resetTradeAlertAudioForTests,
  unlockTradeAlertAudio,
  unlockTradeAlertAudioOnFirstGesture,
} from '../services/tradeAlertSound';

const makeParam = () => ({
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
});

class FakeAudioContext {
  static created = 0;
  state: AudioContextState = 'suspended';
  currentTime = 1;
  destination = {};
  oscillators: Array<{ frequency: ReturnType<typeof makeParam>; type: string; start: ReturnType<typeof vi.fn> }> = [];
  resume = vi.fn(async () => { this.state = 'running'; });

  constructor() {
    FakeAudioContext.created += 1;
  }

  createOscillator() {
    const oscillator = {
      type: 'sine',
      frequency: makeParam(),
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    this.oscillators.push(oscillator);
    return oscillator;
  }

  createGain() {
    return { gain: makeParam(), connect: vi.fn() };
  }
}

describe('trade alert sounds', () => {
  beforeEach(() => {
    FakeAudioContext.created = 0;
    resetTradeAlertAudioForTests();
    vi.stubGlobal('AudioContext', FakeAudioContext);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('plays nothing before the audio context has been unlocked by a gesture', () => {
    expect(playTradeAlertTone('done')).toBe(false);
    expect(FakeAudioContext.created).toBe(0);
  });

  it('shares one AudioContext across unlocks and tones', () => {
    expect(unlockTradeAlertAudio()).toBe(true);
    expect(unlockTradeAlertAudio()).toBe(true);
    expect(playTradeAlertTone('action')).toBe(true);
    expect(playTradeAlertTone('done')).toBe(true);
    expect(FakeAudioContext.created).toBe(1);
  });

  it('creates the context only on the first user gesture', () => {
    unlockTradeAlertAudioOnFirstGesture();
    unlockTradeAlertAudioOnFirstGesture();
    expect(FakeAudioContext.created).toBe(0);

    document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('pointerdown'));
    expect(FakeAudioContext.created).toBe(1);
  });

  it('gives each kind of alert a different tone', () => {
    unlockTradeAlertAudio();
    const frequencies: Record<string, number[]> = {};
    for (const tone of ['action', 'done', 'declined'] as const) {
      const spy = vi.spyOn(FakeAudioContext.prototype, 'createOscillator');
      playTradeAlertTone(tone);
      frequencies[tone] = spy.mock.results.map((result) => (
        (result.value as { frequency: ReturnType<typeof makeParam> }).frequency.setValueAtTime.mock.calls[0][0]
      ));
      spy.mockRestore();
    }

    expect(frequencies.action).toEqual([880, 880]);
    expect(frequencies.done[1]).toBeGreaterThan(frequencies.done[0]);
    expect(frequencies.declined[1]).toBeLessThan(frequencies.declined[0]);
    expect(new Set(Object.values(frequencies).map((list) => list.join()))).toHaveLength(3);
  });

  it('fails silently when the browser has no AudioContext', () => {
    vi.stubGlobal('AudioContext', undefined);
    expect(unlockTradeAlertAudio()).toBe(false);
    expect(playTradeAlertTone('declined')).toBe(false);
  });

  it('fails silently when creating the context throws', () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('blocked'); } });
    expect(unlockTradeAlertAudio()).toBe(false);
    expect(playTradeAlertTone('done')).toBe(false);
  });

  it('fails silently when playing throws', () => {
    unlockTradeAlertAudio();
    vi.spyOn(FakeAudioContext.prototype, 'createOscillator').mockImplementation(() => { throw new Error('closed'); });
    expect(playTradeAlertTone('done')).toBe(false);
  });
});
