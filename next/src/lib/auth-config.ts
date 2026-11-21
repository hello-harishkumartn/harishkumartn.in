import { betterAuth, type BetterAuthPlugin } from 'better-auth';
import type { Pool } from 'pg';

// Shared auth for every project. Tables live in the public schema.
// Sign up is closed: the only account is the admin, created by scripts/migrate.ts.
export function makeAuth(pool: Pool, opts: { allowSignUp?: boolean; plugins?: BetterAuthPlugin[] } = {}) {
  return betterAuth({
    database: pool,
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined),
    trustedOrigins: (req) => {
      const o = new Set<string>();
      if (process.env.VERCEL_URL) o.add(`https://${process.env.VERCEL_URL}`);
      if (process.env.VERCEL_BRANCH_URL) o.add(`https://${process.env.VERCEL_BRANCH_URL}`);
      if (process.env.VERCEL_PROJECT_PRODUCTION_URL) o.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
      o.add('https://harishkumartn.in');
      if (process.env.NODE_ENV !== 'production') o.add('http://localhost:3000');
      const origin = req?.headers.get('origin');
      // A same-host request (preview aliases) is trusted too.
      const host = req?.headers.get('host');
      if (origin && host && new URL(origin).host === host) o.add(origin);
      return [...o];
    },
    emailAndPassword: { enabled: true, disableSignUp: !opts.allowSignUp },
    plugins: opts.plugins ?? [],
  });
}
