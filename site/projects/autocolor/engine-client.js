// The main thread's handle on the photo engine worker. Hides its lifecycle: a crashed worker is
// replaced, and the worker is restarted after a big photo so its WASM memory is returned.

const BIG = 12e6;

export function createEngineClient({ phone = false, makeWorker = () => new Worker(new URL('worker.js', import.meta.url), { type: 'module' }) } = {}) {
  const waiting = new Map();
  let nextId = 1;
  let worker = start();

  function start() {
    const w = makeWorker();
    w.onmessage = ({ data }) => {
      waiting.get(data.id)?.(data);
      waiting.delete(data.id);
    };
    w.onerror = (e) => {
      e?.preventDefault?.();
      for (const [id, resolve] of waiting) resolve({ id, ok: false, message: 'The photo engine stopped. Try a smaller photo.' });
      waiting.clear();
      worker = start();
    };
    return w;
  }

  /** Corrects one photo. Resolves { ok: true, out, before, after, report, w, h } or { ok: false, message }. */
  async function correct(blob, kind) {
    const r = await new Promise((resolve) => {
      const id = nextId++;
      waiting.set(id, resolve);
      worker.postMessage({ id, blob, kind, phone });
    });
    if (r.ok && r.w * r.h > BIG) {
      worker.terminate();
      worker = start();
    }
    return r;
  }

  return { correct };
}
