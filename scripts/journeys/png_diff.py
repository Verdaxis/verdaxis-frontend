"""Pixel comparison for the screenshot baselines (no browser dependency).

Kept free of Playwright so the comparison can be unit-tested anywhere the
repository builds, including a machine that cannot run a browser.
"""
import struct
import zlib


def diff_ratio(baseline_png, actual_png):
    """Fraction of pixels that differ (any channel) between two PNGs."""
    a = _decode_png(baseline_png)
    b = _decode_png(actual_png)
    if a['size'] != b['size']:
        return 1.0
    width, height = a['size']
    pa, pb = a['pixels'], b['pixels']
    changed = 0
    stride = width * 3
    for y in range(height):
        ra, rb = pa[y * stride:(y + 1) * stride], pb[y * stride:(y + 1) * stride]
        for x in range(width):
            o = x * 3
            if ra[o] != rb[o] or ra[o + 1] != rb[o + 1] or ra[o + 2] != rb[o + 2]:
                changed += 1
    return changed / (width * height)


def _decode_png(data):
    """Minimal RGB PNG decoder for Playwright's 8-bit non-interlaced output."""
    assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG'
    offset = 8
    width = height = None
    idat = bytearray()
    palette = None
    while offset < len(data):
        length = struct.unpack('>I', data[offset:offset + 4])[0]
        tag = data[offset + 4:offset + 8]
        body = data[offset + 8:offset + 8 + length]
        if tag == b'IHDR':
            width, height, depth, color = struct.unpack('>IIBB', body[:10])
            assert depth == 8, f'unsupported depth {depth}'
        elif tag == b'IDAT':
            idat.extend(body)
        elif tag == b'PLTE':
            palette = body
        offset += 12 + length
    raw = zlib.decompress(bytes(idat))
    channels = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[color]
    stride = width * channels
    pixels = bytearray(width * height * 3)
    prev = bytearray(stride)
    pos = 0
    for y in range(height):
        filter_type = raw[pos]
        pos += 1
        line = bytearray(raw[pos:pos + stride])
        pos += stride
        if filter_type == 1:  # Sub
            for i in range(channels, stride):
                line[i] = (line[i] + line[i - channels]) & 0xFF
        elif filter_type == 2:  # Up
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 0xFF
        elif filter_type == 3:  # Average
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                line[i] = (line[i] + ((left + prev[i]) >> 1)) & 0xFF
        elif filter_type == 4:  # Paeth
            for i in range(stride):
                left = line[i - channels] if i >= channels else 0
                up = prev[i]
                upleft = prev[i - channels] if i >= channels else 0
                p = left + up - upleft
                pa_, pu, pl = abs(p - left), abs(p - up), abs(p - upleft)
                predictor = left if (pa_ <= pu and pa_ <= pl) else (up if pu <= pl else upleft)
                line[i] = (line[i] + predictor) & 0xFF
        if color == 2:
            pixels[y * width * 3:(y + 1) * width * 3] = line
        elif color == 6:
            for x in range(width):
                o = (y * width + x) * 3
                s = x * 4
                pixels[o:o + 3] = line[s:s + 3]
        elif color == 3:
            for x in range(width):
                index = line[x] * 3
                o = (y * width + x) * 3
                pixels[o:o + 3] = palette[index:index + 3]
        elif color == 0:
            for x in range(width):
                value = line[x]
                o = (y * width + x) * 3
                pixels[o:o + 3] = bytes((value, value, value))
        else:
            raise AssertionError(f'unsupported color type {color}')
        prev = line
    return {'size': (width, height), 'pixels': bytes(pixels)}
