"""Halve a Radiance .hdr (RGBE) environment map: box-filter in linear light, write RLE.

Usage: python3 scripts/downsample-hdr.py in.hdr out.hdr
Used for public/assets/court/hdri/squash_court_512.hdr (the phone tier's HDRI).
"""
import re
import sys

import numpy as np


def read_hdr(path):
    data = open(path, 'rb').read()
    head_end = data.index(b'\n\n') + 2
    nl = data.index(b'\n', head_end)
    m = re.match(rb'-Y (\d+) \+X (\d+)', data[head_end:nl])
    h, w = int(m.group(1)), int(m.group(2))
    p = nl + 1
    img = np.zeros((h, w, 4), np.uint8)
    for y in range(h):
        if data[p] == 2 and data[p + 1] == 2 and (data[p + 2] << 8 | data[p + 3]) == w:
            p += 4
            for c in range(4):
                x = 0
                while x < w:
                    n = data[p]
                    p += 1
                    if n > 128:
                        n -= 128
                        img[y, x:x + n, c] = data[p]
                        p += 1
                    else:
                        img[y, x:x + n, c] = np.frombuffer(data[p:p + n], np.uint8)
                        p += n
                    x += n
        else:  # flat scanline
            img[y] = np.frombuffer(data[p:p + w * 4], np.uint8).reshape(w, 4)
            p += w * 4
    e = img[..., 3].astype(np.int32)
    scale = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0)
    return img[..., :3].astype(np.float64) * scale[..., None]


def rle(row):
    out = bytearray()
    i, n = 0, len(row)
    while i < n:
        j = i
        while j < n and j - i < 127 and row[j] == row[i]:
            j += 1
        if j - i >= 3:
            out += bytes([128 + j - i, row[i]])
            i = j
            continue
        j = i
        while j < n and j - i < 128 and not (j + 2 < n and row[j] == row[j + 1] == row[j + 2]):
            j += 1
        out += bytes([j - i]) + bytes(row[i:j])
        i = j
    return out


def write_hdr(path, rgb):
    h, w, _ = rgb.shape
    mx = rgb.max(axis=2)
    mant, ex = np.frexp(mx)
    ok = mx > 1e-32
    f = np.where(ok, mant * 256.0 / np.where(ok, mx, 1), 0)
    rgbe = np.zeros((h, w, 4), np.uint8)
    rgbe[..., :3] = np.clip(rgb * f[..., None], 0, 255).astype(np.uint8)
    rgbe[..., 3] = np.where(ok, ex + 128, 0).astype(np.uint8)
    with open(path, 'wb') as fh:
        fh.write(b'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n')
        fh.write(f'-Y {h} +X {w}\n'.encode())
        for y in range(h):
            fh.write(bytes([2, 2, w >> 8, w & 255]))
            for c in range(4):
                fh.write(rle(rgbe[y, :, c].tobytes()))


src = read_hdr(sys.argv[1])
h, w, _ = src.shape
half = src[: h // 2 * 2, : w // 2 * 2].reshape(h // 2, 2, w // 2, 2, 3).mean(axis=(1, 3))
write_hdr(sys.argv[2], half)
print(f'{w}x{h} -> {w // 2}x{h // 2}')
