// Checks that canvas pixels read back as written. Browsers that cannot hold a canvas that large give
// blank pixels. Fingerprinting protection (Brave, Firefox, Safari) adds a level or two of noise to every
// read, which is harmless, or blocks reads entirely (white or random pixels), which would ruin the output.

/** Largest canvas area every current browser holds (iOS Safari's limit, 4096 x 4096). */
export const SAFE_AREA = 16_777_216;
/** Read back noise up to this many levels is accepted. Blank (0) or white (255) reads are at least 64 off. */
export const NOISE_TOLERANCE = 32;
// mid tones (64 to 191 in every channel) so noise cannot wrap and blank or white reads are far away
const PATTERN = ['#406080', '#806040'];

/** Writes the probe pattern in the bottom corners and returns the largest channel difference read back. */
export function probeReadback(ctx, w, h) {
  const spots = w > 1 ? [[0, h - 1], [w - 1, h - 1]] : [[0, h - 1]];
  let diff = 0;
  spots.forEach(([x, y], i) => {
    ctx.fillStyle = PATTERN[i];
    ctx.fillRect(x, y, 1, 1);
  });
  spots.forEach(([x, y], i) => {
    const got = ctx.getImageData(x, y, 1, 1).data;
    for (let c = 0; c < 3; c++) diff = Math.max(diff, Math.abs(got[c] - parseInt(PATTERN[i].slice(1 + 2 * c, 3 + 2 * c), 16)));
  });
  return diff;
}

/** 'ok' | 'too-big' | 'blocked'. A photo within the safe area is never called too big. */
export function judgeReadback(w, h, diff) {
  if (diff <= NOISE_TOLERANCE) return 'ok';
  return w * h > SAFE_AREA ? 'too-big' : 'blocked';
}
