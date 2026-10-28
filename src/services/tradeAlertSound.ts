// Short, plain trade-alert tones made with the Web Audio API: no audio files.
//
// Browsers block audio until the user has interacted with the page, so one
// shared AudioContext is created on the first user gesture and reused. Every
// function here fails silently: audio is optional and must never break trading.

export type TradeAlertTone = 'action' | 'done' | 'declined';

interface ToneNote {
  frequencyHz: number;
  durationSeconds: number;
}

interface ToneRecipe {
  wave: OscillatorType;
  notes: ToneNote[];
}

const NOTE_GAP_SECONDS = 0.05;
// Quiet on purpose: this sits on top of whatever the user is already listening to.
const PEAK_GAIN = 0.12;
// Short fade in and out, so a note does not start or end with an audible click.
const FADE_SECONDS = 0.01;
const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

// A5 = 880 Hz; the other pitches are chosen so the three tones differ by
// rhythm and direction, not only by pitch.
const TONE_RECIPES: Record<TradeAlertTone, ToneRecipe> = {
  // Needs your action: two identical, brisk beeps. Reads as "look here".
  action: {
    wave: 'sine',
    notes: [
      { frequencyHz: 880, durationSeconds: 0.12 },
      { frequencyHz: 880, durationSeconds: 0.12 },
    ],
  },
  // Done: a rising pair (E5 then B5). Reads as "resolved".
  done: {
    wave: 'sine',
    notes: [
      { frequencyHz: 659.25, durationSeconds: 0.12 },
      { frequencyHz: 987.77, durationSeconds: 0.2 },
    ],
  },
  // Declined: a lower, falling pair (G4 then D4). Reads as "no".
  declined: {
    wave: 'triangle',
    notes: [
      { frequencyHz: 392, durationSeconds: 0.14 },
      { frequencyHz: 293.66, durationSeconds: 0.22 },
    ],
  },
};

type AudioContextConstructor = new () => AudioContext;

let sharedContext: AudioContext | null = null;
let gestureListenersInstalled = false;

const audioContextConstructor = (): AudioContextConstructor | null => {
  if (typeof window === 'undefined') return null;
  const scope = window as typeof window & { webkitAudioContext?: AudioContextConstructor };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
};

const resumeQuietly = (context: AudioContext) => {
  if (context.state !== 'suspended') return;
  try {
    void Promise.resolve(context.resume()).catch(() => undefined);
  } catch {
    // The browser may still refuse before a gesture; a later one retries.
  }
};

/**
 * Creates the shared AudioContext if it does not exist yet. Call it only from
 * a user gesture (a click or key press handler). Returns false when audio is
 * unavailable.
 */
export const unlockTradeAlertAudio = (): boolean => {
  if (sharedContext) {
    resumeQuietly(sharedContext);
    return true;
  }

  const Constructor = audioContextConstructor();
  if (!Constructor) return false;
  try {
    sharedContext = new Constructor();
  } catch {
    return false;
  }
  resumeQuietly(sharedContext);
  return true;
};

/**
 * Waits for the first user gesture anywhere on the page, then unlocks audio.
 * Safe to call repeatedly; it installs its listeners once.
 */
export const unlockTradeAlertAudioOnFirstGesture = (): void => {
  if (sharedContext || gestureListenersInstalled || typeof document === 'undefined') return;
  gestureListenersInstalled = true;

  const onGesture = () => {
    GESTURE_EVENTS.forEach((type) => document.removeEventListener(type, onGesture, true));
    gestureListenersInstalled = false;
    unlockTradeAlertAudio();
  };
  GESTURE_EVENTS.forEach((type) => document.addEventListener(type, onGesture, { capture: true, passive: true }));
};

/** Plays one tone. Returns false when nothing could be played. */
export const playTradeAlertTone = (tone: TradeAlertTone): boolean => {
  const context = sharedContext;
  if (!context) return false;

  try {
    resumeQuietly(context);
    const recipe = TONE_RECIPES[tone];
    let startAt = context.currentTime;

    for (const note of recipe.notes) {
      const endAt = startAt + note.durationSeconds;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = recipe.wave;
      oscillator.frequency.setValueAtTime(note.frequencyHz, startAt);
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(PEAK_GAIN, startAt + FADE_SECONDS);
      gain.gain.setValueAtTime(PEAK_GAIN, endAt - FADE_SECONDS);
      gain.gain.linearRampToValueAtTime(0, endAt);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(endAt);

      startAt = endAt + NOTE_GAP_SECONDS;
    }
    return true;
  } catch {
    return false;
  }
};

/** Test helper: forget the shared context and gesture listeners. */
export const resetTradeAlertAudioForTests = (): void => {
  sharedContext = null;
  gestureListenersInstalled = false;
};
