// Worker secrets are not in wrangler.jsonc, so `wrangler types` cannot see them. Declared here instead,
// on both the global Env and Cloudflare.Env (the one cloudflare:test's env uses).
interface WorkerSecrets {
  /** The admin password, at least 24 characters. Set with `npx wrangler secret put ADMIN_PASSWORD`. */
  ADMIN_PASSWORD: string;
}

interface Env extends WorkerSecrets {}

declare namespace Cloudflare {
  interface Env extends WorkerSecrets {}
}
