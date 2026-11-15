// Runs jobs one at a time (photos are big; one at a time keeps memory flat) and reports progress.

export function createQueue(run, { onProgress = () => {}, onResult = () => {} } = {}) {
  const pending = [];
  let total = 0;
  let done = 0;
  let busy = false;
  let paused = false;
  let waiters = [];

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
    onProgress({ done, total });
    pump();
  }

  return {
    add(jobs) {
      pending.push(...jobs);
      total += jobs.length;
      onProgress({ done, total });
      pump();
    },
    /** Runs jobs again that already counted as done (e.g. after reconnecting), without growing the total. */
    retry(jobs) {
      pending.unshift(...jobs);
      done -= jobs.length;
      onProgress({ done, total });
      pump();
    },
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      pump();
    },
    /** Drops waiting jobs and starts counting from zero (the running job, if any, still finishes). */
    reset() {
      pending.length = 0;
      total = busy ? 1 : 0;
      done = 0;
    },
    /** Resolves when nothing is running and nothing runnable is left. */
    idle() {
      return new Promise((r) => {
        waiters.push(r);
        settle();
      });
    },
    get size() {
      return pending.length + (busy ? 1 : 0);
    },
  };
}
