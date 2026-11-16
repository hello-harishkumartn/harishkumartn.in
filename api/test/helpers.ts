import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { createApp } from '../src/app';

export const ORIGIN = 'https://harish-social.example.workers.dev';
export const SITE = 'https://harishkumartn.in';

const { publicKey, privateKey } = await generateKeyPair('RS256');
const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256' };
export const app = createApp({ accessKeys: createLocalJWKSet({ keys: [jwk] }) });

/** A Cloudflare Access style JWT. Override any claim to build a bad one. */
export async function accessToken(overrides: Record<string, unknown> = {}, key = privateKey) {
  const claims = {
    email: env.ADMIN_EMAIL,
    iss: env.ACCESS_TEAM_DOMAIN,
    aud: [env.ACCESS_AUD],
    exp: Math.floor(Date.now() / 1000) + 600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
  return new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).sign(key);
}

export async function call(path: string, init: RequestInit = {}) {
  const ctx = createExecutionContext();
  const res = await app.fetch!(new Request(`${ORIGIN}${path}`, init) as Request<unknown, IncomingRequestCfProperties>, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

/** An admin call with a valid Access JWT and a same-origin Origin header for writes. */
export async function admin(path: string, init: RequestInit & { json?: unknown } = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cf-Access-Jwt-Assertion', await accessToken());
  if (init.method && init.method !== 'GET') headers.set('Origin', ORIGIN);
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    init = { ...init, body: JSON.stringify(init.json) };
  }
  return call(path, { ...init, headers });
}

type Seed = Partial<{
  id: string; platform: string; category: string; source: string; url: string; kind: string;
  title: string | null; text: string | null; media_url: string | null; published_at: string; hidden: number;
}>;

export async function seed(post: Seed) {
  const p = {
    platform: 'youtube', category: 'personal', source: 'live', kind: 'video', title: null, text: null,
    media_url: null, published_at: '2026-11-01T00:00:00.000Z', hidden: 0, ...post,
  };
  const id = p.id ?? `${p.platform}:${crypto.randomUUID()}`;
  await env.DB.prepare(
    `INSERT INTO posts (id, platform, category, source, url, kind, title, text, media_url, published_at, hidden, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, p.platform, p.category, p.source, p.url ?? `https://example.com/${id}`, p.kind, p.title, p.text,
      p.media_url, p.published_at, p.hidden, p.published_at, p.published_at)
    .run();
  return id;
}
