// File names and supported types.

const OK = ['jpg', 'jpeg', 'jpe', 'png', 'webp'];
const HEIC = ['heic', 'heif', 'hif'];
const RAW = ['dng', 'cr2', 'cr3', 'crw', 'nef', 'nrw', 'arw', 'srf', 'sr2', 'raf', 'orf', 'rw2', 'pef', 'srw', 'x3f', '3fr', 'iiq', 'erf', 'kdc', 'mrw', 'raw'];

const ext = (name) => {
  const base = name.split(/[\\/]/).pop() ?? '';
  const i = base.lastIndexOf('.');
  return i > 0 ? base.slice(i + 1).toLowerCase() : '';
};

/** `IMG_1.JPG` -> `IMG_1-autocolor.jpg` (folders dropped). */
export function outputName(name) {
  const base = (name ?? '').split(/[\\/]/).pop() ?? '';
  const i = base.lastIndexOf('.');
  const stem = i > 0 ? base.slice(0, i) : base;
  return `${stem || 'photo'}-autocolor.jpg`;
}

/** Makes names unique (case-insensitively) by adding " (2)", " (3)" and so on before the extension. */
export function uniqueNames(names) {
  const seen = new Set();
  return names.map((name) => {
    const i = name.lastIndexOf('.');
    const [stem, dot] = i > 0 ? [name.slice(0, i), name.slice(i)] : [name, ''];
    let candidate = name;
    for (let n = 2; seen.has(candidate.toLowerCase()); n++) candidate = `${stem} (${n})${dot}`;
    seen.add(candidate.toLowerCase());
    return candidate;
  });
}

/** 'ok' | 'heic' | 'raw' | 'unsupported' from a file name and MIME type. */
export function classify(name, type = '') {
  const e = ext(name);
  const t = type.toLowerCase();
  if (t === 'image/heic' || t === 'image/heif' || HEIC.includes(e)) return 'heic';
  if (RAW.includes(e) || /^image\/x-(adobe-dng|canon|nikon|sony|fuji|olympus|panasonic)/.test(t)) return 'raw';
  if (['image/jpeg', 'image/png', 'image/webp'].includes(t) || OK.includes(e)) return 'ok';
  return 'unsupported';
}

export const MESSAGES = {
  heic: 'HEIC is not supported by this browser. Open it in Safari or convert it to JPEG first.',
  raw: 'RAW files are not supported. Export a JPEG from your camera app first.',
  unsupported: 'This file type is not supported. Use JPEG, PNG or WebP.',
};
