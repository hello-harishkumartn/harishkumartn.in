# harishkumartn.in on Next.js + Neon

Revamp of the portfolio (branch `revamp/neon`). The old static site in `../site` keeps deploying from `main` until the cut over.

- `/` profile, `/projects/<slug>` project pages, `/admin` content editor (sign in required).
- Data: Neon Postgres project "Harish Website" (`patient-unit-79141810`, AWS Singapore). Schema `portfolio` holds profile, experience, education, projects and links. Each project gets its own schema later. Auth (Better Auth) tables are in `public`, shared by every project.
- `scripts/migrate.ts` runs before every Vercel build: creates tables, seeds `db/seed.json` into empty tables only and creates the admin account. It never drops or overwrites rows.
- `/api/keepalive` runs daily at 06:00 India time (Vercel cron).

## Env vars (Vercel)

| Name | What |
| --- | --- |
| `DATABASE_URL` | Neon connection string (pooled) |
| `BETTER_AUTH_SECRET` | random 32 byte hex |
| `ADMIN_EMAIL` | the only account that may edit |
| `ADMIN_PASSWORD` | used once to create that account |
| `CRON_SECRET` | random, protects the keep alive route |

## Local

    npm install
    DATABASE_URL=... node scripts/migrate.ts
    npm run dev
