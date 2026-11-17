import { createApp } from './app';
import { retryPreviews } from './previews';
import { runSync } from './sync';

const app = createApp({});

export default {
  fetch(request, env, ctx) {
    return app.fetch!(request, env, ctx);
  },
  /** Cron Trigger (every 30 minutes, see wrangler.jsonc): pull the live sources, then retry waiting previews. */
  scheduled(_controller, env, ctx) {
    const fetcher: typeof fetch = (input, init) => fetch(input, init);
    ctx.waitUntil(runSync(env, { fetch: fetcher }).then(() => retryPreviews(env, fetcher)));
  },
} satisfies ExportedHandler<Env>;
