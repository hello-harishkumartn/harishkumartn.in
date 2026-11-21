import { Pool } from 'pg';

// One pool per server instance. DATABASE_URL comes from the Neon integration on Vercel.
const g = globalThis as unknown as { __pgPool?: Pool };

export function getPool(): Pool {
  if (!g.__pgPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    g.__pgPool = new Pool({ connectionString: url, max: 3 });
  }
  return g.__pgPool;
}
