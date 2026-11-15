// Loads engine.wasm (plain C ABI, no imports) and wraps its exports.

export async function loadEngine(url = new URL('engine.wasm', import.meta.url)) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the engine (${res.status})`);
  const { instance } = WebAssembly.instantiateStreaming
    ? await WebAssembly.instantiateStreaming(res, {}).catch(async () => WebAssembly.instantiate(await (await fetch(url)).arrayBuffer(), {}))
    : await WebAssembly.instantiate(await res.arrayBuffer(), {});
  return wrap(instance.exports);
}

export function wrap(e) {
  return {
    /** True when the full path's peak memory can be allocated now (probed, then released). */
    fitsFull(w, h) {
      const need = Math.ceil(e.ac_full_bytes(w, h));
      if (need > 3.5 * 2 ** 30) return false;
      const p = e.ac_alloc(need);
      if (!p) return false;
      e.ac_free(p, need);
      return true;
    },
    /** Corrects RGBA8 `pixels` (Uint8ClampedArray, w*h*4) in place. path: 0 full, 1 banded. */
    correct(pixels, w, h, path) {
      const len = w * h * 4;
      const ptr = e.ac_alloc(len);
      if (!ptr) throw new Error('out of memory');
      try {
        new Uint8Array(e.memory.buffer, ptr, len).set(pixels);
        const rc = e.ac_correct(ptr, w, h, path);
        if (rc !== 0) throw new Error(`engine error ${rc}`);
        pixels.set(new Uint8Array(e.memory.buffer, ptr, len));
        const report = new TextDecoder().decode(new Uint8Array(e.memory.buffer, e.ac_report_ptr(), e.ac_report_len()));
        return JSON.parse(report);
      } finally {
        e.ac_free(ptr, len);
      }
    },
  };
}
