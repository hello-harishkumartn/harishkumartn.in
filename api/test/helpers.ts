import { createExecutionContext, env, waitOnExecutionContext } from 'cloudflare:test';
import { createApp } from '../src/app';

export const ORIGIN = 'https://harish-social.example.workers.dev';
export const SITE = 'https://harishkumartn.in';

export const app = createApp({});

/** A fresh client address per call, so the per-IP rate limit never spills between tests. */
const randomIp = () => `test-${crypto.randomUUID()}`;

export async function call(path: string, init: RequestInit = {}, handler: ExportedHandler<Env> = app) {
  const ctx = createExecutionContext();
  const headers = new Headers(init.headers);
  if (!headers.has('CF-Connecting-IP')) headers.set('CF-Connecting-IP', randomIp());
  const res = await handler.fetch!(new Request(`${ORIGIN}${path}`, { ...init, headers }) as Request<unknown, IncomingRequestCfProperties>, env, ctx);
  await waitOnExecutionContext(ctx);
  return res;
}

/** An admin call with the right password and a same-origin Origin header for writes. */
export async function admin(path: string, init: RequestInit & { json?: unknown } = {}, handler: ExportedHandler<Env> = app) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${env.ADMIN_PASSWORD}`);
  if (init.method && init.method !== 'GET') headers.set('Origin', ORIGIN);
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    init = { ...init, body: JSON.stringify(init.json) };
  }
  return call(path, { ...init, headers }, handler);
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
