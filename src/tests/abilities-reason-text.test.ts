import { describe, expect, it } from 'vitest';
import en from '../locales/en/common.json';
import zh from '../locales/zh/common.json';
import { KNOWN_REASON_CODES } from '../types/abilities';

// Every reason code the server is known to send must have display text in each
// locale; otherwise a zh user sees the server's English fallback.
describe('ability reason text', () => {
  it.each([
    ['en', en as Record<string, unknown>],
    ['zh', zh as Record<string, unknown>],
  ])('has %s text for every known reason code', (_locale, messages) => {
    const missing = KNOWN_REASON_CODES.filter(
      (code) => typeof messages[`abilities.reason.${code}`] !== 'string',
    );
    expect(missing).toEqual([]);
  });
});
