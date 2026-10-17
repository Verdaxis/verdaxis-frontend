"""Unit tests for the screenshot comparison used by the same-look gate.

Run with: python3 -m unittest scripts.journeys.test_png_diff
(or python3 scripts/journeys/test_png_diff.py)

The comparison must decode Playwright's PNG output exactly. Playwright writes
8-bit, non-interlaced PNGs and picks filter types per scanline, so every filter
(0-4) is exercised here against a hand-built encoder.
"""
import struct
import sys
import unittest
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from journeys.png_diff import diff_ratio


def _chunk(tag, payload):
    raw = tag + payload
    return struct.pack('>I', len(payload)) + raw + struct.pack('>I', zlib.crc32(raw) & 0xffffffff)


def encode_png(width, height, rows, color_type=2, palette=None):
    """Encode raw scanline bytes (already filtered) into a PNG."""
    depth = 8
    chunks = [_chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, depth, color_type, 0, 0, 0))]
    if palette is not None:
        chunks.append(_chunk(b'PLTE', palette))
    chunks.append(_chunk(b'IDAT', zlib.compress(b''.join(rows))))
    chunks.append(_chunk(b'IEND', b''))
    return b'\x89PNG\r\n\x1a\n' + b''.join(chunks)


def paeth(left, up, upleft):
    p = left + up - upleft
    pa, pb, pc = abs(p - left), abs(p - up), abs(p - upleft)
    if pa <= pb and pa <= pc:
        return left
    return up if pb <= pc else upleft


def filter_row(line, previous, channels, filter_type):
    stride = len(line)
    out = bytearray(stride)
    for i in range(stride):
        left = line[i - channels] if i >= channels else 0
        up = previous[i]
        upleft = previous[i - channels] if i >= channels else 0
        if filter_type == 0:
            out[i] = line[i]
        elif filter_type == 1:
            out[i] = (line[i] - left) & 0xFF
        elif filter_type == 2:
            out[i] = (line[i] - up) & 0xFF
        elif filter_type == 3:
            out[i] = (line[i] - ((left + up) >> 1)) & 0xFF
        elif filter_type == 4:
            out[i] = (line[i] - paeth(left, up, upleft)) & 0xFF
        else:
            raise ValueError(filter_type)
    return bytes([filter_type]) + bytes(out)


def make_rgb_png(width, height, pixel_fn, filters):
    """Build an RGB PNG, filtering each row with the matching filter type."""
    rows = []
    previous = bytes(width * 3)
    for y in range(height):
        line = bytearray()
        for x in range(width):
            line.extend(pixel_fn(x, y))
        rows.append(filter_row(bytes(line), previous, 3, filters[y % len(filters)]))
        previous = bytes(line)
    return encode_png(width, height, rows)


class DiffRatioTests(unittest.TestCase):
    def test_identical_images_have_zero_difference(self):
        image = make_rgb_png(16, 8, lambda x, y: (x * 5 % 256, y * 7 % 256, 128), [0])
        self.assertEqual(diff_ratio(image, image), 0.0)

    def test_every_filter_type_decodes_correctly(self):
        # One distinct image per filter type, each re-encoded with filter 0.
        for candidate in range(5):
            filtered = make_rgb_png(12, 5, lambda x, y: (x * 3 % 256, y * 9 % 256, 200), [candidate])
            plain = make_rgb_png(12, 5, lambda x, y: (x * 3 % 256, y * 9 % 256, 200), [0])
            self.assertEqual(diff_ratio(filtered, plain), 0.0,
                             f'filter type {candidate} decoded differently')

    def test_one_changed_pixel_reports_one_over_total(self):
        base = make_rgb_png(10, 10, lambda x, y: (10, 20, 30), [0])
        changed = make_rgb_png(10, 10,
                               lambda x, y: (99, 20, 30) if (x, y) == (3, 4) else (10, 20, 30),
                               [0])
        self.assertAlmostEqual(diff_ratio(base, changed), 1 / 100)

    def test_different_sizes_report_full_difference(self):
        small = make_rgb_png(4, 4, lambda x, y: (1, 2, 3), [0])
        large = make_rgb_png(5, 4, lambda x, y: (1, 2, 3), [0])
        self.assertEqual(diff_ratio(small, large), 1.0)

    def test_tolerance_boundary_is_inclusive(self):
        # 1 differing pixel of 1000 is 0.001; a 0.002 tolerance must accept it.
        base = make_rgb_png(40, 25, lambda x, y: (7, 7, 7), [0, 2])
        changed = make_rgb_png(40, 25,
                               lambda x, y: (8, 7, 7) if (x, y) == (0, 0) else (7, 7, 7),
                               [0, 2])
        self.assertLessEqual(diff_ratio(base, changed), 0.002)

    def test_grayscale_input_is_accepted(self):
        # Defense in depth: a grayscale PNG must decode rather than raise.
        line = bytes([0]) + bytes([128] * 4)
        gray = encode_png(4, 1, [line], color_type=0)
        self.assertEqual(diff_ratio(gray, gray), 0.0)


if __name__ == '__main__':
    unittest.main()
