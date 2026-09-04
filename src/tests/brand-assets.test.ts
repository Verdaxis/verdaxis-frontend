import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const logos = {
  'verdaxis-logo-no-words.png': [732, 654],
  'verdaxis-logo-words-right.png': [1293, 291],
  'verdaxis-logo-words-bottom.png': [966, 585],
};

describe('brand assets', () => {
  it.each(Object.entries(logos))('%s keeps its size and alpha channel', (name, [width, height]) => {
    const png = readFileSync(join(process.cwd(), 'public', name));

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(width);
    expect(png.readUInt32BE(20)).toBe(height);
    expect(png[24]).toBe(8);
    expect(png[25]).toBe(6);
  });
});
