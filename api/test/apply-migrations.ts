import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeEach } from 'vitest';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// Storage is shared between tests in this plugin version, so every test starts from empty tables.
beforeEach(async () => {
  await env.DB.batch(['posts', 'tokens', 'sync_runs'].map((t) => env.DB.prepare(`DELETE FROM ${t}`)));
});
