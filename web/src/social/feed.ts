/**
 * Client for the social hub API (api/ in this repo, docs/egm/2026-11-16_social-hub.md).
 * No imports and only erasable TypeScript, so the Node tests can load this file directly.
 */

export type Platform = 'linkedin' | 'x' | 'instagram' | 'youtube';
export type Tab = 'professional' | 'personal';

export interface FeedPost {
  id: string;
  platform: Platform;
  category: Tab;
  source: 'live' | 'curated';
  url: string;
  kind: 'video' | 'image' | 'carousel' | 'text';
  title: string | null;
  text: string | null;
  mediaUrl: string | null;
  /** Click-to-load preview iframe, or null (X). */
  embedUrl: string | null;
  publishedAt: string;
}

export interface FeedPage {
  posts: FeedPost[];
  next: string | null;
}

export interface FeedParams {
  category?: Tab;
  platform?: Platform;
  limit?: number;
  before?: string;
}

/** The order platform panels appear in, on the page and on home. */
export const PLATFORM_ORDER: Platform[] = ['linkedin', 'x', 'instagram', 'youtube'];

export const PLATFORM_NAMES: Record<Platform, string> = { linkedin: 'LinkedIn', x: 'X', instagram: 'Instagram', youtube: 'YouTube' };

export class FeedError extends Error {}

/**
 * GET <api>/feed with the given filters. Rejects with FeedError when the API is not configured,
 * answers with an error, sends something that is not a feed or takes longer than timeoutMs.
 */
export async function fetchFeed(
  api: string,
  params: FeedParams,
  opts: { fetch?: typeof fetch; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<FeedPage> {
  if (!api) throw new FeedError('The social feed is not configured.');
  const url = new URL(`${api.replace(/\/+$/, '')}/feed`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(new FeedError('The social feed took too long.')), opts.timeoutMs ?? 6000);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout.signal]) : timeout.signal;
  try {
    const res = await (opts.fetch ?? fetch)(url.toString(), { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new FeedError(`The social feed answered ${res.status}.`);
    const body: unknown = await res.json().catch(() => null);
    if (!body || typeof body !== 'object' || !Array.isArray((body as FeedPage).posts)) throw new FeedError('The social feed sent something unexpected.');
    const { posts, next } = body as FeedPage;
    return { posts, next: typeof next === 'string' ? next : null };
  } catch (err) {
    if (err instanceof FeedError) throw err;
    if (signal.aborted && signal.reason instanceof FeedError) throw signal.reason;
    throw new FeedError(err instanceof Error ? err.message : 'The social feed is unavailable.');
  } finally {
    clearTimeout(timer);
  }
}

/** Newest `n` posts of every platform, from one mixed feed (the home section makes a single call). */
export function groupByPlatform(posts: FeedPost[], n: number): Record<Platform, FeedPost[]> {
  const groups = Object.fromEntries(PLATFORM_ORDER.map((p) => [p, [] as FeedPost[]])) as Record<Platform, FeedPost[]>;
  for (const post of posts) {
    const group = groups[post.platform];
    if (group && group.length < n) group.push(post);
  }
  return groups;
}
