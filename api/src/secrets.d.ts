// Worker secrets are not in wrangler.jsonc, so `wrangler types` cannot see them. Declared here instead,
// on both the global Env and Cloudflare.Env (the one cloudflare:test's env uses).
interface WorkerSecrets {
  /** The only email allowed into /admin. Set with `npx wrangler secret put ADMIN_EMAIL`. */
  ADMIN_EMAIL: string;
}

interface Env extends WorkerSecrets {}

declare namespace Cloudflare {
  interface Env extends WorkerSecrets {}
}
