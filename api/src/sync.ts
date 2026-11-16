import { PLATFORM_CATEGORY, type Platform } from './posts';
import { parseYouTubeFeed, YOUTUBE_FEED_SIZE, youtubeFeedUrl } from './youtube';

/** A post as a platform reports it, before it is stored. */
export interface LivePost {
  nativeId: string;
  url: string;
  kind: 'video' | 'image' | 'carousel';
  title: string | null;
  text: string | null;
  mediaUrl: string | null;
  publishedAt: string;
}

export interface SyncDeps {
  fetch: typeof fetch;
}

export type SyncResult = { ok: true; items: number } | { ok: false; items: null; error: string };

/** A live post missing from this many good syncs in a row is deleted. */
const REMOVE_AFTER = 3;
const KEEP_RUNS_MS = 30 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15_000;

/** Runs every live source. Each one is isolated, so one failing never blocks another. */
export async function runSync(env: Env, deps: SyncDeps): Promise<{ youtube: SyncResult }> {
  const youtube = await syncSource(env.DB, 'youtube', async () => {
    const res = await deps.fetch(youtubeFeedUrl(env.YOUTUBE_CHANNEL_ID), {
      headers: { Accept: 'application/atom+xml, text/xml' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`YouTube answered HTTP ${res.status}.`);
    const posts = parseYouTubeFeed(await res.text(), env.YOUTUBE_CHANNEL_ID);
    // A feed shorter than its cap is the whole channel, so every live post is in the window.
    const windowStart = posts.length >= YOUTUBE_FEED_SIZE ? posts.reduce((min, p) => (p.publishedAt < min ? p.publishedAt : min), posts[0].publishedAt) : '';
    return { posts, windowStart };
  });
  return { youtube };
}

/**
 * Fetches one source and stores the result in a single D1 batch: upsert what came back, bump the
 * missing count of live posts in the window that did not, delete those missing from REMOVE_AFTER
 * good syncs in a row, record the run and prune old runs. Any fetch or parse error records a
 * failed run and leaves every post untouched.
 */
async function syncSource(
  db: D1Database,
  platform: Platform,
  load: () => Promise<{ posts: LivePost[]; windowStart: string }>,
): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  const pruneBefore = new Date(Date.now() - KEEP_RUNS_MS).toISOString();
  const prune = db.prepare('DELETE FROM sync_runs WHERE started_at < ?').bind(pruneBefore);

  let loaded: { posts: LivePost[]; windowStart: string };
  try {
    loaded = await load();
  } catch (err) {
    const error = (err instanceof Error ? err.message : String(err)).slice(0, 500);
    await db.batch([
      db.prepare('INSERT INTO sync_runs (platform, started_at, finished_at, ok, error) VALUES (?, ?, ?, 0, ?)')
        .bind(platform, startedAt, new Date().toISOString(), error),
      prune,
    ]);
    return { ok: false, items: null, error };
  }

  const { posts, windowStart } = loaded;
  const finishedAt = new Date().toISOString();
  const payload = JSON.stringify(posts);
  await db.batch([
    db.prepare(
      `INSERT INTO posts (id, platform, category, source, url, kind, title, text, media_url, published_at, hidden, missing_runs, created_at, updated_at)
       SELECT ?1 || ':' || json_extract(value, '$.nativeId'), ?1, ?2, 'live', json_extract(value, '$.url'), json_extract(value, '$.kind'),
              json_extract(value, '$.title'), json_extract(value, '$.text'), json_extract(value, '$.mediaUrl'),
              json_extract(value, '$.publishedAt'), 0, 0, ?3, ?3
       FROM json_each(?4) WHERE true
       ON CONFLICT (id) DO UPDATE SET url = excluded.url, kind = excluded.kind, title = excluded.title, text = excluded.text,
              media_url = excluded.media_url, published_at = excluded.published_at, missing_runs = 0, updated_at = excluded.updated_at`,
    ).bind(platform, PLATFORM_CATEGORY[platform], finishedAt, payload),
    db.prepare(
      `UPDATE posts SET missing_runs = missing_runs + 1
       WHERE platform = ?1 AND source = 'live' AND published_at >= ?2
         AND id NOT IN (SELECT ?1 || ':' || json_extract(value, '$.nativeId') FROM json_each(?3))`,
    ).bind(platform, windowStart, payload),
    db.prepare(`DELETE FROM posts WHERE platform = ? AND source = 'live' AND missing_runs >= ?`).bind(platform, REMOVE_AFTER),
    db.prepare('INSERT INTO sync_runs (platform, started_at, finished_at, ok, items) VALUES (?, ?, ?, 1, ?)')
      .bind(platform, startedAt, finishedAt, posts.length),
    prune,
  ]);
  return { ok: true, items: posts.length };
}
