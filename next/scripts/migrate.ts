// Runs before every Vercel build (vercel.json) and by hand: node scripts/migrate.ts
// 1. Better Auth tables in public. 2. portfolio schema. 3. Seed content once, only into empty tables.
// 4. Create the admin account from ADMIN_EMAIL + ADMIN_PASSWORD if it does not exist yet.
// Never drops or overwrites existing rows.
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { getMigrations } from 'better-auth/db/migration';
import { makeAuth } from '../src/lib/auth-config.ts';

const url = process.env.DATABASE_URL;
if (!url) {
  console.log('migrate: DATABASE_URL not set, skipping');
  process.exit(0);
}
const pool = new pg.Pool({ connectionString: url, max: 2 });
const read = (f: string) => readFileSync(new URL(`../db/${f}`, import.meta.url), 'utf8');

try {
  const auth = makeAuth(pool, { allowSignUp: true });
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  console.log('migrate: auth tables ready');

  await pool.query(read('001_portfolio.sql'));
  console.log('migrate: portfolio schema ready');

  const seed = JSON.parse(read('seed.json'));
  const empty = async (t: string) => (await pool.query(`select 1 from portfolio.${t} limit 1`)).rowCount === 0;

  if (await empty('profile')) {
    const p = seed.profile;
    await pool.query(
      `insert into portfolio.profile (id, name, short_name, headline, description, about, quick_facts, dream)
       values (1,$1,$2,$3,$4,$5,$6,$7)`,
      [p.name, p.short_name, p.headline, p.description, JSON.stringify(p.about), JSON.stringify(p.quick_facts), p.dream],
    );
  }
  if (await empty('experience')) for (const e of seed.experience)
    await pool.query(
      'insert into portfolio.experience (org, role, period, is_current, summary, highlights, sort) values ($1,$2,$3,$4,$5,$6,$7)',
      [e.org, e.role, e.period, e.is_current, e.summary, JSON.stringify(e.highlights), e.sort]);
  if (await empty('education')) for (const e of seed.education)
    await pool.query(
      'insert into portfolio.education (school, degree, period, is_current, note, sort) values ($1,$2,$3,$4,$5,$6)',
      [e.school, e.degree, e.period, e.is_current, e.note, e.sort]);
  if (await empty('projects')) for (const p of seed.projects)
    await pool.query(
      'insert into portfolio.projects (slug, title, description, tags, repo, demo_url, demo_note, sort) values ($1,$2,$3,$4,$5,$6,$7,$8)',
      [p.slug, p.title, p.description, JSON.stringify(p.tags), p.repo, p.demo_url, p.demo_note, p.sort]);
  if (await empty('links')) for (const l of seed.links)
    await pool.query('insert into portfolio.links (icon, label, href, display, sort) values ($1,$2,$3,$4,$5)',
      [l.icon, l.label, l.href, l.display, l.sort]);
  console.log('migrate: content seeded where empty');

  const email = process.env.ADMIN_EMAIL, password = process.env.ADMIN_PASSWORD;
  if (email && password) {
    const exists = (await pool.query('select 1 from "user" where lower(email) = lower($1)', [email])).rowCount;
    if (!exists) {
      await auth.api.signUpEmail({ body: { email, password, name: seed.profile.short_name } });
      console.log('migrate: admin account created');
    } else console.log('migrate: admin account exists');
  } else console.log('migrate: ADMIN_EMAIL or ADMIN_PASSWORD not set, no admin account');
} finally {
  await pool.end();
}
