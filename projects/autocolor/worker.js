// Decodes, corrects and encodes one photo at a time off the main thread.
import { loadEngine } from './engine.js';
import { MESSAGES } from './names.js';
import { probeReadback, judgeReadback } from './readback.js';

const FULL_LIMIT_DESKTOP = 12e6;
const FULL_LIMIT_PHONE = 4e6;
const FORCE_BANDED = 40e6;
const HARD_LIMIT = 50e6;
const PREVIEW = 1200;

let engine = null;
const getEngine = async () => (engine ??= await loadEngine());

class UserError extends Error {}

async function decode(blob, kind) {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image', premultiplyAlpha: 'none', colorSpaceConversion: 'default' });
  } catch (e) {
    throw new UserError(kind === 'heic' ? MESSAGES.heic : `This photo could not be read. It may be damaged or in a format this browser cannot open (${e?.message ?? e}).`);
  }
}

async function preview(canvas) {
  const k = Math.min(1, PREVIEW / Math.max(canvas.width, canvas.height));
  const c = new OffscreenCanvas(Math.max(1, Math.round(canvas.width * k)), Math.max(1, Math.round(canvas.height * k)));
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  return c.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}

async function processPhoto({ id, blob, kind, phone }) {
  const stage = (name) => self.postMessage({ id, stage: name });
  stage('reading');
  const bitmap = await decode(blob, kind);
  const { width: w, height: h } = bitmap;
  const mp = (w * h) / 1e6;
  if (w * h > HARD_LIMIT) {
    bitmap.close();
    throw new UserError(`This photo is ${mp.toFixed(1)} MP. AutoColor handles up to ${HARD_LIMIT / 1e6} MP.`);
  }
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  // a level or two of read back noise (fingerprinting protection) is fine. See readback.js
  const readback = judgeReadback(w, h, probeReadback(ctx, w, h));
  if (readback !== 'ok') {
    bitmap.close();
    throw new UserError(readback === 'too-big' ? `This photo is ${mp.toFixed(1)} MP, which is more than this browser can hold in memory. Try a smaller photo.` : MESSAGES.blocked);
  }
  // transparent areas become white (JPEG has no alpha)
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  stage('correcting');
  const before = await preview(canvas);
  const img = ctx.getImageData(0, 0, w, h);
  const limit = phone ? FULL_LIMIT_PHONE : FULL_LIMIT_DESKTOP;
  const eng = await getEngine();
  let path = w * h <= limit && w * h <= FORCE_BANDED && eng.fitsFull(w, h) ? 0 : 1;
  let report;
  try {
    report = eng.correct(img.data, w, h, path);
  } catch (e) {
    // a trap (usually memory) leaves the instance unusable: start a fresh one and use the banded path
    engine = null;
    if (path === 1) throw e;
    path = 1;
    report = (await getEngine()).correct(img.data, w, h, path);
  }
  stage('saving');
  ctx.putImageData(img, 0, 0);
  const out = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
  const after = await preview(canvas);
  return { out, before, after, report, w, h };
}

self.onmessage = async ({ data }) => {
  const { id } = data;
  try {
    const result = await processPhoto(data);
    self.postMessage({ id, ok: true, ...result });
  } catch (e) {
    const message = e instanceof UserError ? e.message : `Something went wrong while correcting this photo (${e?.message ?? e}).`;
    self.postMessage({ id, ok: false, message });
  }
};
