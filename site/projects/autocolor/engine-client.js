// The main thread's handle on the photo engine worker. Hides its lifecycle: a crashed worker is
// replaced, and the worker is restarted after a big photo so its WASM memory is returned.

const BIG = 12e6;

export function createEngineClient({ phone = false, makeWorker = () => new Worker(new URL('worker.js', import.meta.url), { type: 'module' }) } = {}) {
  const waiting = new Map();
  const stages = new Map();
  let nextId = 1;
  let worker = start();

  function start() {
    const w = makeWorker();
    w.onmessage = ({ data }) => {
      if (data.stage) return stages.get(data.id)?.(data.stage);
      waiting.get(data.id)?.(data);
      waiting.delete(data.id);
      stages.delete(data.id);
    };
    w.onerror = (e) => {
      e?.preventDefault?.();
      for (const [id, resolve] of waiting) resolve({ id, ok: false, message: 'The photo engine stopped. Try a smaller photo.' });
      waiting.clear();
      stages.clear();
      worker = start();
    };
    return w;
  }

  /** Corrects one photo. Resolves { ok: true, out, before, after, report, w, h } or { ok: false, message }.
   * onStage gets 'reading', 'correcting' and 'saving' as the worker reaches them. */
  async function correct(blob, kind, onStage = () => {}) {
    const r = await new Promise((resolve) => {
      const id = nextId++;
      waiting.set(id, resolve);
      stages.set(id, onStage);
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
