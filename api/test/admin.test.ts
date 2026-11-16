import { env } from 'cloudflare:test';
import { createLocalJWKSet, generateKeyPair } from 'jose';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { accessToken, admin, call, ORIGIN, seed } from './helpers';

const LI = 'https://www.linkedin.com/feed/update/urn:li:activity:7263000000000000001/';
const X = 'https://x.com/harish_kumar_tn/status/1857000000000000001';

describe('admin access control', () => {
  const withToken = async (token: string) => call('/admin/api/posts', { headers: { 'Cf-Access-Jwt-Assertion': token } });

  it('refuses requests with no Access JWT', async () => {
    expect((await call('/admin')).status).toBe(403);
    expect((await call('/admin/api/posts')).status).toBe(403);
  });

  it('accepts a valid JWT for the admin email, in any letter case', async () => {
    expect((await withToken(await accessToken())).status).toBe(200);
    expect((await withToken(await accessToken({ email: env.ADMIN_EMAIL.toUpperCase() }))).status).toBe(200);
  });

  it('refuses a JWT with the wrong audience, issuer or email, an expired one or a foreign signature', async () => {
    const other = (await generateKeyPair('RS256')).privateKey;
    const bad = {
      audience: await accessToken({ aud: ['someone-else'] }),
      issuer: await accessToken({ iss: 'https://evil.cloudflareaccess.com' }),
      email: await accessToken({ email: 'intruder@example.com' }),
      noEmail: await accessToken({ email: undefined }),
      expired: await accessToken({ exp: Math.floor(Date.now() / 1000) - 60 }),
      signature: await accessToken({}, other),
      garbage: 'not.a.jwt',
    };
    for (const [name, token] of Object.entries(bad)) expect((await withToken(token)).status, name).toBe(403);
  });

  it('fails closed when Access is not configured', async () => {
    const app = createApp({ accessKeys: createLocalJWKSet({ keys: [] }) });
    const req = new Request(`${ORIGIN}/admin/api/posts`, { headers: { 'Cf-Access-Jwt-Assertion': await accessToken() } });
    const ctx = { waitUntil() {}, passThroughOnException() {}, props: {} } as unknown as ExecutionContext;
    const res = await app.fetch!(req as Request<unknown, IncomingRequestCfProperties>, { ...env, ACCESS_AUD: '', ACCESS_TEAM_DOMAIN: '' }, ctx);
    expect(res.status).toBe(403);
  });

  it('refuses admin writes from another origin or with no Origin, even with a valid JWT', async () => {
    for (const origin of ['https://evil.example', null]) {
      const headers: Record<string, string> = { 'Cf-Access-Jwt-Assertion': await accessToken(), 'Content-Type': 'application/json' };
      if (origin) headers.Origin = origin;
      const res = await call('/admin/api/posts', { method: 'POST', headers, body: JSON.stringify({ url: LI, text: 'x' }) });
      expect(res.status, String(origin)).toBe(403);
    }
  });
});

describe('curated posts', () => {
  it('adds a LinkedIn post as professional text and it appears in the feed', async () => {
    const res = await admin('/admin/api/posts', { method: 'POST', json: { url: LI, text: 'Shipped the agent mesh', published_at: '2026-11-10T08:00:00Z' } });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ id: 'linkedin:activity:7263000000000000001', platform: 'linkedin', category: 'professional', source: 'curated', kind: 'text' });
    const feed = await (await call('/feed?category=professional')).json<{ posts: { id: string; text: string; publishedAt: string }[] }>();
    expect(feed.posts).toEqual([
      expect.objectContaining({ id: 'linkedin:activity:7263000000000000001', text: 'Shipped the agent mesh', publishedAt: '2026-11-10T08:00:00.000Z' }),
    ]);
  });

  it('adds an X post and defaults published_at to now', async () => {
    const before = Date.now();
    const res = await admin('/admin/api/posts', { method: 'POST', json: { url: X, text: 'Hello X' } });
    expect(res.status).toBe(201);
    const post = await res.json<{ id: string; publishedAt: string }>();
    expect(post.id).toBe('x:1857000000000000001');
    expect(Date.parse(post.publishedAt)).toBeGreaterThanOrEqual(before - 1000);
  });

  it('returns 409 for the same post twice, even through a different URL form', async () => {
    expect((await admin('/admin/api/posts', { method: 'POST', json: { url: X, text: 'a' } })).status).toBe(201);
    const again = await admin('/admin/api/posts', {
      method: 'POST',
      json: { url: 'https://twitter.com/harish_kumar_tn/status/1857000000000000001?s=20', text: 'b' },
    });
    expect(again.status).toBe(409);
  });

  it('validates the body with 400s', async () => {
    const cases: Record<string, unknown> = {
      badUrl: { url: 'https://www.instagram.com/harish_kumar_tn/', text: 'a' },
      noUrl: { text: 'a' },
      textNotString: { url: X, text: 42 },
      longText: { url: X, text: 'a'.repeat(3001) },
      badDate: { url: X, text: 'a', published_at: 'soon' },
      futureDate: { url: X, text: 'a', published_at: '2099-01-01T00:00:00Z' },
    };
    for (const [name, json] of Object.entries(cases)) {
      expect((await admin('/admin/api/posts', { method: 'POST', json })).status, name).toBe(400);
    }
    const broken = await admin('/admin/api/posts', { method: 'POST', body: '{nope', headers: { 'Content-Type': 'application/json' } });
    expect(broken.status).toBe(400);
  });

  it('hides and shows any post, and edits only curated text', async () => {
    const live = await seed({ id: 'youtube:v1' });
    expect((await admin(`/admin/api/posts/${live}`, { method: 'PATCH', json: { hidden: true } })).status).toBe(200);
    expect((await (await call('/feed')).json<{ posts: unknown[] }>()).posts).toHaveLength(0);
    expect((await admin(`/admin/api/posts/${live}`, { method: 'PATCH', json: { hidden: false } })).status).toBe(200);
    expect((await (await call('/feed')).json<{ posts: unknown[] }>()).posts).toHaveLength(1);
    expect((await admin(`/admin/api/posts/${live}`, { method: 'PATCH', json: { text: 'edit' } })).status).toBe(409);

    await admin('/admin/api/posts', { method: 'POST', json: { url: X, text: 'old' } });
    const edited = await admin('/admin/api/posts/x:1857000000000000001', { method: 'PATCH', json: { text: 'new' } });
    expect(edited.status).toBe(200);
    expect(await edited.json()).toMatchObject({ text: 'new' });
    expect((await admin('/admin/api/posts/x:404', { method: 'PATCH', json: { hidden: true } })).status).toBe(404);
  });

  it('deletes curated posts, but live posts can only be hidden', async () => {
    await admin('/admin/api/posts', { method: 'POST', json: { url: X, text: 'a' } });
    expect((await admin('/admin/api/posts/x:1857000000000000001', { method: 'DELETE' })).status).toBe(204);
    expect((await (await call('/feed')).json<{ posts: unknown[] }>()).posts).toHaveLength(0);
    const live = await seed({ id: 'youtube:v1' });
    expect((await admin(`/admin/api/posts/${live}`, { method: 'DELETE' })).status).toBe(409);
    expect((await admin('/admin/api/posts/x:404', { method: 'DELETE' })).status).toBe(404);
  });

  it('lists every post for the admin, hidden ones included', async () => {
    await seed({ id: 'youtube:v1', hidden: 1 });
    await seed({ id: 'youtube:v2' });
    const body = await (await admin('/admin/api/posts')).json<{ posts: { id: string; hidden: boolean }[] }>();
    expect(body.posts.map((p) => [p.id, p.hidden]).sort()).toEqual([['youtube:v1', true], ['youtube:v2', false]]);
  });

  it('adds an Instagram post with no note as personal, with a click-to-load preview URL', async () => {
    const res = await admin('/admin/api/posts', { method: 'POST', json: { url: 'https://www.instagram.com/p/DCx7aB-_9Qz/?igsh=abc' } });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      id: 'instagram:p:DCx7aB-_9Qz', platform: 'instagram', category: 'personal', source: 'curated', kind: 'image', text: null,
      url: 'https://www.instagram.com/p/DCx7aB-_9Qz/', embedUrl: 'https://www.instagram.com/p/DCx7aB-_9Qz/embed',
    });
    const reel = await admin('/admin/api/posts', { method: 'POST', json: { url: 'https://www.instagram.com/reel/DCy1Reel123/', text: 'Rally!' } });
    expect(await reel.json()).toMatchObject({ kind: 'video', text: 'Rally!' });
  });

  it('treats a blank note as no note, and lets Harish clear a note later', async () => {
    const res = await admin('/admin/api/posts', { method: 'POST', json: { url: X, text: '   ' } });
    expect(await res.json()).toMatchObject({ text: null });
    await admin('/admin/api/posts/x:1857000000000000001', { method: 'PATCH', json: { text: 'note' } });
    const cleared = await admin('/admin/api/posts/x:1857000000000000001', { method: 'PATCH', json: { text: '' } });
    expect(await cleared.json()).toMatchObject({ text: null });
  });

  it('explains that YouTube links sync on their own instead of adding them', async () => {
    const res = await admin('/admin/api/posts', { method: 'POST', json: { url: 'https://youtu.be/abcDEF12345' } });
    expect(res.status).toBe(400);
    expect((await res.json<{ error: string }>()).error).toMatch(/YouTube.*automatically/);
  });

  it('serves the admin page as HTML that is never cached', async () => {
    const res = await admin('/admin');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).toContain('<title>Social hub admin</title>');
  });
});
