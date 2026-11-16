import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { call, seed, SITE } from './helpers';

const iso = (day: number) => `2026-11-${String(day).padStart(2, '0')}T10:00:00.000Z`;

describe('GET /feed', () => {
  it('returns visible posts newest first with the public fields only', async () => {
    await seed({ id: 'youtube:a', published_at: iso(1), title: 'Old video', media_url: 'https://i.ytimg.com/vi/a/hq.jpg' });
    await seed({ id: 'linkedin:activity:1', platform: 'linkedin', category: 'professional', source: 'curated', kind: 'text', text: 'Hi', published_at: iso(3) });
    await seed({ id: 'instagram:b', platform: 'instagram', kind: 'image', published_at: iso(2), hidden: 1 });

    const res = await call('/feed');
    expect(res.status).toBe(200);
    const body = await res.json<{ posts: Record<string, unknown>[]; next: string | null }>();
    expect(body.posts.map((p) => p.id)).toEqual(['linkedin:activity:1', 'youtube:a']);
    expect(Object.keys(body.posts[1]).sort()).toEqual(
      ['category', 'embedUrl', 'id', 'kind', 'mediaUrl', 'platform', 'publishedAt', 'source', 'text', 'title', 'url'].sort(),
    );
    expect(body.posts[1]).toMatchObject({ title: 'Old video', mediaUrl: 'https://i.ytimg.com/vi/a/hq.jpg', publishedAt: iso(1) });
    expect(body.next).toBeNull();
  });

  it('filters by category and by platform', async () => {
    await seed({ id: 'youtube:a', published_at: iso(1) });
    await seed({ id: 'instagram:b', platform: 'instagram', kind: 'image', published_at: iso(2) });
    await seed({ id: 'x:1', platform: 'x', category: 'professional', source: 'curated', kind: 'text', published_at: iso(3) });

    const personal = await (await call('/feed?category=personal')).json<{ posts: { id: string }[] }>();
    expect(personal.posts.map((p) => p.id)).toEqual(['instagram:b', 'youtube:a']);
    const yt = await (await call('/feed?category=personal&platform=youtube')).json<{ posts: { id: string }[] }>();
    expect(yt.posts.map((p) => p.id)).toEqual(['youtube:a']);
  });

  it('pages with a cursor without skipping posts that share a timestamp', async () => {
    for (const id of ['a', 'b', 'c', 'd', 'e']) await seed({ id: `youtube:${id}`, published_at: id < 'c' ? iso(5) : iso(4) });
    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const res = await call(`/feed?limit=2${cursor ? `&before=${encodeURIComponent(cursor)}` : ''}`);
      const body = await res.json<{ posts: { id: string }[]; next: string | null }>();
      seen.push(...body.posts.map((p) => p.id));
      cursor = body.next;
    } while (cursor);
    expect(seen).toEqual(['youtube:b', 'youtube:a', 'youtube:e', 'youtube:d', 'youtube:c']);
  });

  it('caps limit at 50 and rejects bad parameters with 400', async () => {
    for (let i = 0; i < 55; i++) await seed({ published_at: iso(1) });
    const body = await (await call('/feed?limit=500')).json<{ posts: unknown[] }>();
    expect(body.posts).toHaveLength(50);
    for (const q of ['category=work', 'platform=tiktok', 'category=personal&platform=x', 'limit=0', 'limit=abc', 'before=yesterday']) {
      expect((await call(`/feed?${q}`)).status, q).toBe(400);
    }
  });

  it('is cacheable by browsers and varies on Origin', async () => {
    const res = await call('/feed');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300');
    expect(res.headers.get('Vary')).toContain('Origin');
  });
});

describe('CORS', () => {
  it('allows the site and local dev, and nobody else', async () => {
    expect((await call('/feed', { headers: { Origin: SITE } })).headers.get('Access-Control-Allow-Origin')).toBe(SITE);
    expect((await call('/feed', { headers: { Origin: 'http://localhost:5173' } })).headers.get('Access-Control-Allow-Origin'))
      .toBe('http://localhost:5173');
    expect((await call('/feed', { headers: { Origin: 'https://evil.example' } })).headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('answers a preflight for /feed from the site', async () => {
    const res = await call('/feed', { method: 'OPTIONS', headers: { Origin: SITE, 'Access-Control-Request-Method': 'GET' } });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET');
  });
});

describe('GET /health and unknown routes', () => {
  it('reports the latest sync per platform', async () => {
    await env.DB.prepare(`INSERT INTO sync_runs (platform, started_at, finished_at, ok, items) VALUES ('youtube', ?, ?, 1, 15)`)
      .bind(iso(2), iso(2)).run();
    const body = await (await call('/health')).json<{ ok: boolean; lastSync: Record<string, unknown> }>();
    expect(body.ok).toBe(true);
    expect(body.lastSync.youtube).toMatchObject({ at: iso(2), ok: true, items: 15 });
    expect(Object.keys(body.lastSync)).toEqual(['youtube']);
  });

  it('returns 404 for unknown paths and 405 for writes to /feed', async () => {
    expect((await call('/nope')).status).toBe(404);
    expect((await call('/feed', { method: 'POST' })).status).toBe(405);
  });
});
