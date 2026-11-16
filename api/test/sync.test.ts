import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import worker from '../src/index';
import { runSync } from '../src/sync';
import { fakeFetch, youtubeFeed, type FakeVideo } from './fixtures';
import { accessKeys, admin, call, seed } from './helpers';

const v = (id: string, day: number, title = `Video ${id}`): FakeVideo => ({ id: `vid${id}`.padEnd(11, '0'), title, published: `2026-11-${String(day).padStart(2, '0')}T10:00:00+00:00` });
const ids = async () =>
  (await env.DB.prepare(`SELECT id FROM posts WHERE platform = 'youtube' ORDER BY id`).all<{ id: string }>()).results.map((r) => r.id);
const row = (id: string) => env.DB.prepare('SELECT * FROM posts WHERE id = ?').bind(id).first<Record<string, unknown>>();
const runs = async () =>
  (await env.DB.prepare('SELECT platform, ok, items, error FROM sync_runs ORDER BY id').all()).results;

describe('YouTube sync', () => {
  it('fetches the channel feed and adds every video as a live personal post', async () => {
    const f = fakeFetch(youtubeFeed([v('A', 10), v('B', 11)]));
    const result = await runSync(env, { fetch: f });
    expect(result.youtube).toEqual({ ok: true, items: 2 });
    expect(f.calls).toEqual([`https://www.youtube.com/feeds/videos.xml?channel_id=${env.YOUTUBE_CHANNEL_ID}`]);
    expect(await ids()).toEqual(['youtube:vidA0000000', 'youtube:vidB0000000']);
    expect(await row('youtube:vidA0000000')).toMatchObject({ category: 'personal', source: 'live', kind: 'video', title: 'Video A', missing_runs: 0, hidden: 0 });
    expect(await runs()).toEqual([{ platform: 'youtube', ok: 1, items: 2, error: null }]);
  });

  it('updates titles on later syncs but keeps a post hidden if Harish hid it', async () => {
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 10)])) });
    await env.DB.prepare(`UPDATE posts SET hidden = 1 WHERE id = 'youtube:vidA0000000'`).run();
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 10, 'Renamed')])) });
    expect(await row('youtube:vidA0000000')).toMatchObject({ title: 'Renamed', hidden: 1 });
  });

  it('removes a deleted video only after it is missing from 3 good syncs in a row', async () => {
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 10), v('B', 11)])) });
    const withoutA = fakeFetch(youtubeFeed([v('B', 11)]));
    await runSync(env, { fetch: withoutA });
    await runSync(env, { fetch: withoutA });
    expect(await row('youtube:vidA0000000')).toMatchObject({ missing_runs: 2 });
    await runSync(env, { fetch: withoutA });
    expect(await ids()).toEqual(['youtube:vidB0000000']);
  });

  it('resets the missing count when a video comes back', async () => {
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 10), v('B', 11)])) });
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('B', 11)])) });
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 10), v('B', 11)])) });
    expect(await row('youtube:vidA0000000')).toMatchObject({ missing_runs: 0 });
  });

  it('with a full feed of 15, only videos as new as the oldest fetched one can go missing', async () => {
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 1)])) });
    const newer15 = Array.from({ length: 15 }, (_, i) => v(String.fromCharCode(66 + i), 2 + i));
    await runSync(env, { fetch: fakeFetch(youtubeFeed(newer15)) });
    expect(await row('youtube:vidA0000000')).toMatchObject({ missing_runs: 0 });
  });

  it('with fewer than 15 videos the feed is the whole channel, so an older deleted video still counts', async () => {
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 1), v('B', 11)])) });
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('B', 11)])) });
    expect(await row('youtube:vidA0000000')).toMatchObject({ missing_runs: 1 });
  });

  it('treats a valid empty feed as a good sync, so the last video can still be removed', async () => {
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 10)])) });
    const empty = fakeFetch(youtubeFeed([]));
    for (let i = 0; i < 3; i++) expect((await runSync(env, { fetch: empty })).youtube).toEqual({ ok: true, items: 0 });
    expect(await ids()).toEqual([]);
  });

  it('never touches posts on a 404, a 500, an HTML error page or a network error', async () => {
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 10)])) });
    const bad = [
      fakeFetch('Not found', 404),
      fakeFetch('oops', 500),
      fakeFetch('<!DOCTYPE html><html><body>We are sorry</body></html>'),
      fakeFetch(youtubeFeed([], 'SomeoneElse12345678901')),
      Object.assign((async () => { throw new TypeError('network down'); }) as unknown as typeof fetch, { calls: [] }),
    ];
    for (const f of bad) {
      const result = await runSync(env, { fetch: f });
      expect(result.youtube.ok).toBe(false);
    }
    expect(await row('youtube:vidA0000000')).toMatchObject({ missing_runs: 0 });
    const failed = (await runs()).slice(1);
    expect(failed).toHaveLength(5);
    for (const r of failed) expect(r).toMatchObject({ platform: 'youtube', ok: 0, items: null, error: expect.any(String) });
  });

  it('never touches curated LinkedIn or X posts', async () => {
    await seed({ id: 'x:1', platform: 'x', category: 'professional', source: 'curated', kind: 'text', published_at: '2026-11-11T00:00:00.000Z' });
    for (let i = 0; i < 3; i++) await runSync(env, { fetch: fakeFetch(youtubeFeed([])) });
    expect(await row('x:1')).toMatchObject({ missing_runs: 0 });
  });

  it('writes a whole sync with one batch of a handful of statements', async () => {
    let prepares = 0;
    let batches = 0;
    const counted = new Proxy(env.DB, {
      get(target, prop) {
        if (prop === 'prepare') return (sql: string) => { prepares++; return target.prepare(sql); };
        if (prop === 'batch') return (stmts: D1PreparedStatement[]) => { batches++; return target.batch(stmts); };
        const value = Reflect.get(target, prop);
        return typeof value === 'function' ? value.bind(target) : value;
      },
    });
    const fifteen = Array.from({ length: 15 }, (_, i) => v(String.fromCharCode(65 + i), 1 + i));
    await runSync({ ...env, DB: counted }, { fetch: fakeFetch(youtubeFeed(fifteen)) });
    expect(await ids()).toHaveLength(15);
    expect(batches).toBe(1);
    expect(prepares).toBeLessThanOrEqual(6);
  });

  it('prunes sync runs older than 30 days', async () => {
    await env.DB.prepare(`INSERT INTO sync_runs (platform, started_at, ok) VALUES ('youtube', '2026-01-01T00:00:00.000Z', 1)`).run();
    await runSync(env, { fetch: fakeFetch(youtubeFeed([])) });
    expect(await runs()).toHaveLength(1);
  });

  it('shows the result on /health', async () => {
    await runSync(env, { fetch: fakeFetch(youtubeFeed([v('A', 10)])) });
    const body = await (await call('/health')).json<{ lastSync: Record<string, { ok: boolean; items: number }> }>();
    expect(body.lastSync.youtube).toMatchObject({ ok: true, items: 1 });
  });
});

describe('triggers', () => {
  afterEach(() => vi.restoreAllMocks());

  it('the cron handler runs the sync', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(youtubeFeed([v('A', 10)])));
    const ctx = createExecutionContext();
    await worker.scheduled!(createScheduledController({ cron: '*/30 * * * *' }), env, ctx);
    await waitOnExecutionContext(ctx);
    expect(spy).toHaveBeenCalledOnce();
    expect(await ids()).toEqual(['youtube:vidA0000000']);
  });

  it('the admin can run a sync on demand and sees the result', async () => {
    const handler = createApp({ accessKeys, fetch: fakeFetch(youtubeFeed([v('A', 10)])) });
    const res = await admin('/admin/api/sync', { method: 'POST' }, handler);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ youtube: { ok: true, items: 1 } });
    expect((await call('/admin/api/sync', { method: 'POST' }, handler)).status).toBe(403);
  });
});
