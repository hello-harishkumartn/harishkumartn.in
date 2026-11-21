import { getPool } from '@/lib/pool';

// Daily Vercel cron (vercel.json). One tiny write keeps the database active.
// Vercel sends "Authorization: Bearer $CRON_SECRET" when CRON_SECRET is set.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 });
  }
  const { rows } = await getPool().query(
    `insert into portfolio.keepalive (id, pinged_at) values (1, now())
     on conflict (id) do update set pinged_at = excluded.pinged_at returning pinged_at`,
  );
  return Response.json({ ok: true, pinged_at: rows[0].pinged_at });
}
