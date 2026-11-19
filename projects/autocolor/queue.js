// Holds added photos until Start, then runs them one at a time (photos are big; one at a time keeps
// memory flat) and reports progress for the current run.
// States: empty (nothing added), ready (photos wait for Start), running, paused (Drive reconnect), done.

export function createQueue(run, { onProgress = () => {}, onResult = () => {} } = {}) {
  const ready = [];
  const pending = [];
  let total = 0;
  let done = 0;
  let busy = false;
  let paused = false;
  let waiters = [];

  const state = () => (paused ? 'paused' : busy || pending.length ? 'running' : ready.length ? 'ready' : total ? 'done' : 'empty');
  const report = () => onProgress({ done, total, state: state(), ready: ready.length });

  const settle = () => {
    if (!busy && (pending.length === 0 || paused)) {
      waiters.forEach((w) => w());
      waiters = [];
    }
  };

  async function pump() {
    if (busy || paused) return settle();
    const job = pending.shift();
    if (job === undefined) return settle();
    busy = true;
    let result = null;
    let error = null;
    try {
      result = await run(job);
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
    }
    await onResult(job, result, error);
    done++;
    busy = false;
    report();
    pump();
  }

  return {
    /** Adds photos to the ready list. They wait for start(), also when a run is going. */
    add(jobs) {
      ready.push(...jobs);
      report();
    },
    /** Drops a photo that is still waiting for Start. */
    remove(job) {
      const i = ready.indexOf(job);
      if (i < 0) return false;
      ready.splice(i, 1);
      report();
      return true;
    },
    /** Starts a run with every ready photo. False when nothing is ready or a run is going. */
    start() {
      if (busy || paused || pending.length || !ready.length) return false;
      pending.push(...ready.splice(0));
      total = pending.length;
      done = 0;
      report();
      pump();
      return true;
    },
    /** Runs jobs of the current run again that already counted as done (e.g. after reconnecting). */
    retry(jobs) {
      pending.unshift(...jobs);
      done -= jobs.length;
      report();
      pump();
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      pump();
    },
    /** Drops ready and waiting jobs and starts counting from zero (a running job still finishes). */
    reset() {
      ready.length = 0;
      pending.length = 0;
      total = busy ? 1 : 0;
      done = 0;
      paused = false;
      report();
    },
    /** Resolves when nothing is running and nothing runnable is left. */
    idle() {
      return new Promise((r) => {
        waiters.push(r);
        settle();
      });
    },
    get state() {
      return state();
    },
    get ready() {
      return ready.length;
    },
    /** Jobs of the current run that are running or waiting to run. */
    get size() {
      return pending.length + (busy ? 1 : 0);
    },
  };
}
