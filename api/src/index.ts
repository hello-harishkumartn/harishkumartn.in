import { createApp } from './app';
import { runSync } from './sync';

const app = createApp({});

export default {
  fetch(request, env, ctx) {
    return app.fetch!(request, env, ctx);
  },
  /** Cron Trigger (every 30 minutes, see wrangler.jsonc): pull the live sources. */
  scheduled(_controller, env, ctx) {
    ctx.waitUntil(runSync(env, { fetch: (input, init) => fetch(input, init) }));
  },
} satisfies ExportedHandler<Env>;
