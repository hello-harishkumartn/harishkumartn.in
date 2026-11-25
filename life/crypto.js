// Shared by the browser (app.js) and the Node round trip test.
// Envelope: {v:1, kdf:"PBKDF2-SHA256", iter, salt, iv, ct} with base64 fields.
// ct = AES-GCM-256(gzip(JSON)).

export function b64encode(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function b64decode(str) {
  const s = atob(str);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function deriveKey(password, saltB64, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64decode(saltB64), iterations: iter },
    base,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so "remember on this device" can store the raw key
    ['decrypt'],
  );
}

export async function exportKey(key) {
  return b64encode(await crypto.subtle.exportKey('raw', key));
}

export async function importKey(rawB64) {
  return crypto.subtle.importKey('raw', b64decode(rawB64), { name: 'AES-GCM' }, true, ['decrypt']);
}

async function gunzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

// Throws on a wrong key (AES-GCM auth tag mismatch).
export async function decryptEnvelope(key, env) {
  if (env.v !== 1 || env.kdf !== 'PBKDF2-SHA256') throw new Error('Unknown data format');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64decode(env.iv) }, key, b64decode(env.ct));
  return JSON.parse(await gunzip(new Uint8Array(plain)));
}

export async function unlockWithPassword(password, env) {
  const key = await deriveKey(password, env.salt, env.iter);
  return { key, data: await decryptEnvelope(key, env) };
}
