import type { JWTVerifyGetKey } from 'jose';
import { requireSameOrigin, verifyAccess } from './access';
import { ADMIN_PAGE } from './admin-page';
import { allowedOrigin, errorResponse, HttpError, json, readJson, withCors } from './http';
import {
  adminPost, deletePost, encodeCursor, insertCurated, latestSyncs, listAll, listFeed, PLATFORM_CATEGORY,
  publicPost, updatePost, type Category, type FeedQuery, type Platform,
} from './posts';
import { parseCuratedUrl } from './urls';

export interface AppDeps {
  /** Resolves Cloudflare Access signing keys. Remote JWKS in production, a local key set in tests. */
  accessKeys: JWTVerifyGetKey;
}

const PUBLIC_ROUTES = new Set(['/feed', '/health']);
const MAX_TEXT = 3000;
const FUTURE_SKEW_MS = 10 * 60 * 1000;

export function createApp(deps: AppDeps): ExportedHandler<Env> {
  return {
    async fetch(request, env) {
      const url = new URL(request.url);
      const origin = allowedOrigin(request, env);
      try {
        if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return await handleAdmin(request, env, url, deps);
        if (!PUBLIC_ROUTES.has(url.pathname)) throw new HttpError(404, 'Not found.');
        if (request.method === 'OPTIONS') return withCors(preflight(), origin);
        if (request.method !== 'GET') throw new HttpError(405, 'Only GET is allowed.');
        const res = url.pathname === '/feed' ? await handleFeed(env, url) : await handleHealth(env);
        return withCors(res, origin);
      } catch (err) {
        if (err instanceof HttpError) return withCors(errorResponse(err.status, err.message), origin);
        console.error('Unhandled error', err);
        return withCors(errorResponse(500, 'Something went wrong.'), origin);
      }
    },
  };
}

const preflight = () =>
  new Response(null, { status: 204, headers: { 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '86400' } });

function oneOf<T extends string>(value: string | null, allowed: readonly T[], name: string): T | undefined {
  if (value === null || value === '') return undefined;
  if (!(allowed as readonly string[]).includes(value)) throw new HttpError(400, `Unknown ${name} "${value}".`);
  return value as T;
}

async function handleFeed(env: Env, url: URL): Promise<Response> {
  const p = url.searchParams;
  const category = oneOf<Category>(p.get('category'), ['professional', 'personal'], 'category');
  const platform = oneOf<Platform>(p.get('platform'), ['linkedin', 'x', 'instagram', 'youtube'], 'platform');
  if (category && platform && PLATFORM_CATEGORY[platform] !== category) throw new HttpError(400, `${platform} is not in ${category}.`);

  let limit = 12;
  const rawLimit = p.get('limit');
  if (rawLimit !== null) {
    if (!/^\d+$/.test(rawLimit) || Number(rawLimit) < 1) throw new HttpError(400, 'limit must be a positive whole number.');
    limit = Math.min(Number(rawLimit), 50);
  }

  let before: FeedQuery['before'];
  const rawBefore = p.get('before');
  if (rawBefore) {
    const cut = rawBefore.indexOf('~');
    const publishedAt = cut > 0 ? rawBefore.slice(0, cut) : '';
    const id = cut > 0 ? rawBefore.slice(cut + 1) : '';
    if (!id || Number.isNaN(Date.parse(publishedAt))) throw new HttpError(400, 'before is not a valid cursor.');
    before = { publishedAt, id };
  }

  const rows = await listFeed(env.DB, { category, platform, limit, before });
  const next = rows.length === limit ? encodeCursor(rows[rows.length - 1]) : null;
  return json({ posts: rows.map(publicPost), next }, 200, { 'Cache-Control': 'public, max-age=300' });
}

async function handleHealth(env: Env): Promise<Response> {
  return json({ ok: true, lastSync: await latestSyncs(env.DB) }, 200, { 'Cache-Control': 'public, max-age=60' });
}

async function handleAdmin(request: Request, env: Env, url: URL, deps: AppDeps): Promise<Response> {
  try {
    await verifyAccess(request, env, deps.accessKeys);
    if (request.method !== 'GET') requireSameOrigin(request);
    const res = await routeAdmin(request, env, url);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err.status, err.message);
    console.error('Unhandled admin error', err);
    return errorResponse(500, 'Something went wrong.');
  }
}

async function routeAdmin(request: Request, env: Env, url: URL): Promise<Response> {
  const { method } = request;
  if (url.pathname === '/admin') {
    if (method !== 'GET') throw new HttpError(405, 'Only GET is allowed.');
    return new Response(ADMIN_PAGE, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  if (url.pathname === '/admin/api/posts') {
    if (method === 'GET') return json({ posts: (await listAll(env.DB)).map(adminPost) });
    if (method === 'POST') return createCurated(request, env);
    throw new HttpError(405, 'Use GET or POST.');
  }

  const match = /^\/admin\/api\/posts\/([^/]+)$/.exec(url.pathname);
  if (match) {
    const id = decodeURIComponent(match[1]);
    if (method === 'PATCH') {
      const body = await readJson(request);
      const patch: { hidden?: boolean; text?: string } = {};
      if (body.hidden !== undefined) {
        if (typeof body.hidden !== 'boolean') throw new HttpError(400, 'hidden must be true or false.');
        patch.hidden = body.hidden;
      }
      if (body.text !== undefined) patch.text = cleanText(body.text);
      if (patch.hidden === undefined && patch.text === undefined) throw new HttpError(400, 'Nothing to change.');
      return json(adminPost(await updatePost(env.DB, id, patch)));
    }
    if (method === 'DELETE') {
      await deletePost(env.DB, id);
      return new Response(null, { status: 204 });
    }
    throw new HttpError(405, 'Use PATCH or DELETE.');
  }

  throw new HttpError(404, 'Not found.');
}

function cleanText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, 'text is required.');
  const text = value.trim();
  if (text.length > MAX_TEXT) throw new HttpError(400, `text must be at most ${MAX_TEXT} characters.`);
  return text;
}

async function createCurated(request: Request, env: Env): Promise<Response> {
  const body = await readJson(request);
  const link = typeof body.url === 'string' ? parseCuratedUrl(body.url) : null;
  if (!link) throw new HttpError(400, 'url must be a single LinkedIn or X post link.');
  const text = cleanText(body.text);

  let publishedAt = new Date().toISOString();
  if (body.published_at !== undefined && body.published_at !== null && body.published_at !== '') {
    const ms = typeof body.published_at === 'string' ? Date.parse(body.published_at) : Number.NaN;
    if (Number.isNaN(ms)) throw new HttpError(400, 'published_at must be a date.');
    if (ms > Date.now() + FUTURE_SKEW_MS) throw new HttpError(400, 'published_at cannot be in the future.');
    publishedAt = new Date(ms).toISOString();
  }

  return json(adminPost(await insertCurated(env.DB, link, text, publishedAt)), 201);
}
