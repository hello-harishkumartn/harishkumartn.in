import { createExecutionContext, createScheduledController, env, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import worker from '../src/index';
import {
  isAllowedImageHost, MAX_IMAGE_BYTES, parseInstagramPage, parseLinkedInPage, parseXOembed, parseXSyndication, retryPreviews, xToken,
} from '../src/previews';
import { admin, call, seed } from './helpers';
import { INSTAGRAM_PAGE, LINKEDIN_PAGE, X_OEMBED, X_SYNDICATION } from './preview-fixtures';

const X_URL = 'https://x.com/harish_kumar_tn/status/2122547780174422272';
const LI_URL = 'https://www.linkedin.com/feed/update/urn:li:activity:7528314365373124608/';
const IG_URL = 'https://www.instagram.com/reel/Df1PnOOTXlE/';
const X_CAPTION = 'Dark event photos need a skilled editor.\n\nAt CIFIL we do not always have one free.\n\nSo I built AutoColor with open source LightCraft and Claude Code.\n\nNo sliders. Photos stay on your device.';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
const html = (body: string) => new Response(body, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const mediaKeys = async () => (await env.MEDIA.list()).keys.map((k) => k.name);

describe('preview parsers (real responses for Harish\'s own posts)', () => {
  it('X syndication: text cut to the display range, tidy whitespace, date and first media image', () => {
    expect(parseXSyndication(X_SYNDICATION)).toEqual({
      caption: X_CAPTION,
      publishedAt: '2026-11-17T04:30:00.000Z',
      imageUrl: 'https://pbs.twimg.com/amplify_video_thumb/2122317719945297920/img/izdY2Pe105s1qH_A.jpg',
    });
  });

  it('X syndication: the range start counts code points, trailing t.co links go and entities are decoded', () => {
    const p = parseXSyndication({ text: '@sam 🏸 Smash &amp; win &lt;3 https://t.co/abc https://t.co/def', display_text_range: [5, 30], created_at: '2026-11-01T10:00:00.000Z' });
    expect(p.caption).toBe('🏸 Smash & win <3');
    expect(p.imageUrl).toBeNull();
  });

  it('X oEmbed fallback: text without the pic link, date at midday UTC, no image', () => {
    expect(parseXOembed(X_OEMBED)).toEqual({ caption: X_CAPTION, publishedAt: '2026-11-17T12:00:00.000Z', imageUrl: null });
  });

  it('X token matches the formula X\'s own embed uses', () => {
    expect(xToken('2122547780174422272')).toBe('5586hyo86g');
  });

  it('LinkedIn: caption and exact date from JSON-LD (skipping the "Video Captions for" copy), never-expiring og:image', async () => {
    const p = await parseLinkedInPage(html(LINKEDIN_PAGE));
    expect(p.caption).toMatch(/^I built a photo colour fixer\.\n\nAt CIFIL we run indoor and outdoor events\./);
    expect(p.caption).not.toContain('Video Captions');
    expect(p.publishedAt).toBe('2026-11-17T04:33:34.021Z');
    expect(p.imageUrl).toMatch(/^https:\/\/dms\.licdn\.com\/playlist\/vid\/.*e=2147483647&v=beta&t=/);
  });

  it('LinkedIn: falls back to the page title when there is no JSON-LD', async () => {
    const p = await parseLinkedInPage(html('<html><head><title>Shipped the agent mesh | Harish Kumar T N | 12 comments</title></head></html>'));
    expect(p).toEqual({ caption: 'Shipped the agent mesh', publishedAt: null, imageUrl: null });
  });

  it('Instagram: caption from og:title with emoji decoded, date from the description, og:image', async () => {
    const p = await parseInstagramPage(html(INSTAGRAM_PAGE));
    expect(p.caption).toBe('Us after back to back sessions 🕺🏽');
    expect(p.publishedAt).toBe('2026-11-16T12:00:00.000Z');
    expect(p.imageUrl).toMatch(/^https:\/\/scontent-bom2-1\.cdninstagram\.com\/v\/.*\.jpg\?stp=.*&_nc_cat=110&/);
  });

  it('pages without the expected tags give an empty preview, not an error', async () => {
    for (const parse of [parseLinkedInPage, parseInstagramPage]) expect(await parse(html('<html>Log in</html>'))).toEqual({ caption: null, publishedAt: null, imageUrl: null });
    expect(parseXSyndication({})).toEqual({ caption: null, publishedAt: null, imageUrl: null });
    expect(parseXOembed('nope')).toEqual({ caption: null, publishedAt: null, imageUrl: null });
  });

  it('only copies images from the platforms\' own image hosts over https', () => {
    for (const ok of ['https://pbs.twimg.com/a.jpg', 'https://media.licdn.com/a', 'https://dms.licdn.com/a', 'https://scontent-bom2-1.cdninstagram.com/a.jpg', 'https://scontent.xx.fbcdn.net/a.jpg']) {
      expect(isAllowedImageHost(ok), ok).toBe(true);
    }
    for (const bad of ['http://pbs.twimg.com/a.jpg', 'https://evilcdninstagram.com/a', 'https://cdninstagram.com.evil.com/a', 'https://localhost/a', 'https://169.254.169.254/a', 'not a url']) {
      expect(isAllowedImageHost(bad), bad).toBe(false);
    }
  });
});

/** Answers like the three platforms. Override any host to make it fail or misbehave. */
function platformFetch(overrides: Record<string, () => Response> = {}) {
  const calls: string[] = [];
  const fn = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    calls.push(url.href);
    const override = overrides[url.host];
    if (override) return override();
    if (url.host === 'cdn.syndication.twimg.com') return Response.json(X_SYNDICATION);
    if (url.host === 'publish.twitter.com') return Response.json(X_OEMBED);
    if (url.host === 'www.linkedin.com') return new Response(LINKEDIN_PAGE, { headers: { 'Content-Type': 'text/html' } });
    if (url.host === 'www.instagram.com') return new Response(INSTAGRAM_PAGE, { headers: { 'Content-Type': 'text/html' } });
    if (isAllowedImageHost(url.href)) return new Response(JPEG, { headers: { 'Content-Type': 'image/jpeg' } });
    return new Response('unexpected', { status: 599 });
  };
  return Object.assign(fn as typeof fetch, { calls });
}

type Post = { id: string; caption: string | null; text: string | null; mediaUrl: string | null; publishedAt: string; previewStatus?: string };
const feedPost = async (id: string) => (await (await call('/feed?limit=50')).json<{ posts: Post[] }>()).posts.find((p) => p.id === id);

describe('previews when a post is added', () => {
  it('saves the post at once, then fills in caption, image and the real date', async () => {
    const f = platformFetch();
    const res = await admin('/admin/api/posts', { method: 'POST', json: { url: X_URL, text: 'My take' } }, createApp({ fetch: f }));
    expect(res.status).toBe(201);
    const post = await feedPost('x:2122547780174422272');
    expect(post).toMatchObject({ text: 'My take', caption: X_CAPTION, publishedAt: '2026-11-17T04:30:00.000Z' });
    expect(post!.mediaUrl).toMatch(/^https:\/\/harish-social\.example\.workers\.dev\/media\/x%3A2122547780174422272\?v=\w+$/);
    expect(f.calls.some((u) => u.startsWith('https://cdn.syndication.twimg.com/tweet-result?id=2122547780174422272&'))).toBe(true);

    const media = await call(new URL(post!.mediaUrl!).pathname);
    expect(media.status).toBe(200);
    expect(media.headers.get('Content-Type')).toBe('image/jpeg');
    expect(media.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(media.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(media.headers.get('Content-Security-Policy')).toBe("default-src 'none'; sandbox");
    expect(new Uint8Array(await media.arrayBuffer())).toEqual(JPEG);
  });

  it('keeps a date Harish typed in', async () => {
    await admin('/admin/api/posts', { method: 'POST', json: { url: IG_URL, published_at: '2026-10-01T09:00:00Z' } }, createApp({ fetch: platformFetch() }));
    expect(await feedPost('instagram:reel:Df1PnOOTXlE')).toMatchObject({ caption: 'Us after back to back sessions 🕺🏽', publishedAt: '2026-10-01T09:00:00.000Z' });
  });

  it('works for LinkedIn', async () => {
    await admin('/admin/api/posts', { method: 'POST', json: { url: LI_URL } }, createApp({ fetch: platformFetch() }));
    const post = await feedPost('linkedin:activity:7528314365373124608');
    expect(post?.caption).toMatch(/^I built a photo colour fixer\./);
    expect(post?.publishedAt).toBe('2026-11-17T04:33:34.021Z');
    expect(post?.mediaUrl).toContain('/media/linkedin%3Aactivity%3A7528314365373124608');
  });

  it('falls back to X oEmbed when syndication fails (text, no image)', async () => {
    const f = platformFetch({ 'cdn.syndication.twimg.com': () => new Response('gone', { status: 404 }) });
    await admin('/admin/api/posts', { method: 'POST', json: { url: X_URL } }, createApp({ fetch: f }));
    expect(await feedPost('x:2122547780174422272')).toMatchObject({ caption: X_CAPTION, mediaUrl: null, publishedAt: '2026-11-17T12:00:00.000Z' });
  });

  it('a blocked page marks the preview failed and leaves the post as it was', async () => {
    const f = platformFetch({ 'www.instagram.com': () => new Response('<html>Log in</html>') });
    const res = await admin('/admin/api/posts', { method: 'POST', json: { url: IG_URL, text: 'note' } }, createApp({ fetch: f }));
    const added = await res.json<{ publishedAt: string }>();
    expect(await feedPost('instagram:reel:Df1PnOOTXlE')).toMatchObject({ caption: null, mediaUrl: null, text: 'note', publishedAt: added.publishedAt });
    const row = await env.DB.prepare('SELECT preview_status, preview_attempts FROM posts WHERE id = ?').bind('instagram:reel:Df1PnOOTXlE').first();
    expect(row).toEqual({ preview_status: 'failed', preview_attempts: 1 });
  });

  it('keeps the caption but skips an image that is too big, not an image or on another host', async () => {
    const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
    huge.set([0xff, 0xd8, 0xff]);
    for (const [name, override] of Object.entries<Record<string, () => Response>>({
      tooBig: { 'scontent-bom2-1.cdninstagram.com': () => new Response(huge, { headers: { 'Content-Type': 'image/jpeg' } }) },
      notImage: { 'scontent-bom2-1.cdninstagram.com': () => new Response('<html><script>steal()</script>', { headers: { 'Content-Type': 'image/jpeg' } }) },
      redirected: { 'scontent-bom2-1.cdninstagram.com': () => new Response(null, { status: 302, headers: { Location: 'https://evil.example/x.jpg' } }) },
      otherHost: { 'www.instagram.com': () => new Response(INSTAGRAM_PAGE.replace(/scontent-bom2-1\.cdninstagram\.com/g, 'evil.example')) },
    })) {
      await env.DB.prepare('DELETE FROM posts').run();
      for (const k of await mediaKeys()) await env.MEDIA.delete(k);
      await admin('/admin/api/posts', { method: 'POST', json: { url: IG_URL } }, createApp({ fetch: platformFetch(override) }));
      expect(await feedPost('instagram:reel:Df1PnOOTXlE'), name).toMatchObject({ caption: 'Us after back to back sessions 🕺🏽', mediaUrl: null });
      expect(await mediaKeys(), name).toEqual([]);
    }
  });
});

describe('media route', () => {
  it('404s for unknown posts and hidden posts', async () => {
    await admin('/admin/api/posts', { method: 'POST', json: { url: X_URL } }, createApp({ fetch: platformFetch() }));
    const path = new URL((await feedPost('x:2122547780174422272'))!.mediaUrl!).pathname;
    expect((await call('/media/x%3A999')).status).toBe(404);
    await admin('/admin/api/posts/x%3A2122547780174422272', { method: 'PATCH', json: { hidden: true } });
    expect((await call(path)).status).toBe(404);
  });

  it('deleting a post deletes its image', async () => {
    await admin('/admin/api/posts', { method: 'POST', json: { url: X_URL } }, createApp({ fetch: platformFetch() }));
    expect(await mediaKeys()).toEqual(['x:2122547780174422272']);
    expect((await admin('/admin/api/posts/x%3A2122547780174422272', { method: 'DELETE' })).status).toBe(204);
    expect(await mediaKeys()).toEqual([]);
  });
});

describe('refreshing previews', () => {
  it('the admin can refresh one now; it needs the password', async () => {
    const id = await seed({ id: 'x:2122547780174422272', platform: 'x', category: 'professional', source: 'curated', kind: 'text', url: X_URL });
    const app = createApp({ fetch: platformFetch() });
    expect((await call(`/admin/api/posts/${encodeURIComponent(id)}/preview`, { method: 'POST' }, app)).status).toBe(401);
    const res = await admin(`/admin/api/posts/${encodeURIComponent(id)}/preview`, { method: 'POST' }, app);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ caption: X_CAPTION, previewStatus: 'ok' });
  });

  it('live YouTube posts have nothing to refresh', async () => {
    const id = await seed({ platform: 'youtube' });
    expect((await admin(`/admin/api/posts/${encodeURIComponent(id)}/preview`, { method: 'POST' }, createApp({ fetch: platformFetch() }))).status).toBe(409);
  });

  it('the retry pass takes at most 2 pending or failed posts, oldest attempts first, skips those tried 3 times and counts attempts', async () => {
    for (let i = 0; i < 7; i++) {
      await seed({ id: `x:10${i}`, platform: 'x', category: 'professional', source: 'curated', kind: 'text', url: `https://x.com/h/status/10${i}`, published_at: `2026-11-0${i + 1}T00:00:00.000Z` });
    }
    await env.DB.prepare(`UPDATE posts SET preview_status = 'pending'`).run();
    await env.DB.prepare(`UPDATE posts SET preview_status = 'failed', preview_attempts = 3 WHERE id = 'x:100'`).run();
    const f = platformFetch({ 'cdn.syndication.twimg.com': () => new Response('down', { status: 503 }), 'publish.twitter.com': () => new Response('down', { status: 503 }) });
    expect(await retryPreviews(env, f)).toBe(2);
    const { results } = await env.DB.prepare('SELECT id, preview_status, preview_attempts FROM posts ORDER BY id').all();
    expect(results.filter((r) => r.preview_attempts === 1)).toHaveLength(2);
    expect(results.filter((r) => r.preview_status === 'failed' && r.preview_attempts === 1)).toHaveLength(2);
    expect(results.find((r) => r.id === 'x:100')).toMatchObject({ preview_attempts: 3 });
  });

  it('the cron runs the YouTube sync and then the retry pass', async () => {
    await seed({ id: 'x:2122547780174422272', platform: 'x', category: 'professional', source: 'curated', kind: 'text', url: X_URL });
    await env.DB.prepare(`UPDATE posts SET preview_status = 'pending'`).run();
    const f = platformFetch({ 'www.youtube.com': () => new Response('<feed xmlns="http://www.w3.org/2005/Atom"></feed>') });
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(f);
    const ctx = createExecutionContext();
    await worker.scheduled!(createScheduledController({ cron: '*/30 * * * *' }), env, ctx);
    await waitOnExecutionContext(ctx);
    expect(spy.mock.calls.some(([u]) => String(u).includes('youtube.com'))).toBe(true);
    expect((await feedPost('x:2122547780174422272'))?.caption).toBe(X_CAPTION);
  });

  afterEach(() => vi.restoreAllMocks());
});

describe('admin list', () => {
  it('shows each post\'s preview status', async () => {
    await seed({ id: 'x:1', platform: 'x', category: 'professional', source: 'curated', kind: 'text' });
    const { posts } = await (await admin('/admin/api/posts')).json<{ posts: Post[] }>();
    expect(posts[0].previewStatus).toBe('none');
  });
});

describe('migration 0002', () => {
  it('existing posts: curated ones queue for a preview, YouTube does not, typed dates are protected', async () => {
    // The migration already ran on empty tables; replay its two UPDATEs on seeded rows the way they ran in production.
    await seed({ id: 'x:1', platform: 'x', category: 'professional', source: 'curated', kind: 'text' });
    await seed({ id: 'x:2', platform: 'x', category: 'professional', source: 'curated', kind: 'text' });
    await seed({ id: 'youtube:a', platform: 'youtube' });
    await env.DB.prepare(`UPDATE posts SET created_at = '2026-11-17T08:00:00.000Z', published_at = '2026-11-17T08:00:00.400Z' WHERE id = 'x:1'`).run();
    await env.DB.prepare(`UPDATE posts SET created_at = '2026-11-17T08:00:00.000Z', published_at = '2026-10-01T09:00:00.000Z' WHERE id = 'x:2'`).run();
    const migration = env.TEST_MIGRATIONS.find((m) => m.name.startsWith('0002'))!;
    const stripComments = (q: string) => q.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim();
    const updates = migration.queries.map(stripComments).filter((q) => q.startsWith('UPDATE'));
    expect(updates).toHaveLength(2);
    for (const q of updates) await env.DB.prepare(q).run();
    const { results } = await env.DB.prepare('SELECT id, preview_status, date_from_user FROM posts ORDER BY id').all();
    expect(results).toEqual([
      { id: 'x:1', preview_status: 'pending', date_from_user: 0 },
      { id: 'x:2', preview_status: 'pending', date_from_user: 1 },
      { id: 'youtube:a', preview_status: 'none', date_from_user: 0 },
    ]);
  });
});
