import { HttpError } from './http';
import type { CuratedUrl } from './urls';

export type Platform = 'linkedin' | 'x' | 'instagram' | 'youtube';
export type Category = 'professional' | 'personal';

export const PLATFORM_CATEGORY: Record<Platform, Category> = {
  linkedin: 'professional',
  x: 'professional',
  instagram: 'personal',
  youtube: 'personal',
};

export interface PostRow {
  id: string;
  platform: Platform;
  category: Category;
  source: 'live' | 'curated';
  url: string;
  kind: 'video' | 'image' | 'carousel' | 'text';
  title: string | null;
  text: string | null;
  media_url: string | null;
  published_at: string;
  hidden: number;
}

/** The shape the public feed returns. Internal columns (hidden, missing_runs, timestamps) stay private. */
export const publicPost = (r: PostRow) => ({
  id: r.id,
  platform: r.platform,
  category: r.category,
  source: r.source,
  url: r.url,
  kind: r.kind,
  title: r.title,
  text: r.text,
  mediaUrl: r.media_url,
  publishedAt: r.published_at,
});

export const adminPost = (r: PostRow) => ({ ...publicPost(r), hidden: r.hidden === 1 });

const COLUMNS = 'id, platform, category, source, url, kind, title, text, media_url, published_at, hidden';

export interface FeedQuery {
  category?: Category;
  platform?: Platform;
  limit: number;
  before?: { publishedAt: string; id: string };
}

/** Visible posts newest first. Ties on published_at are broken by id so cursor paging never skips a post. */
export async function listFeed(db: D1Database, q: FeedQuery): Promise<PostRow[]> {
  const where = ['hidden = 0'];
  const args: unknown[] = [];
  if (q.category) where.push('category = ?'), args.push(q.category);
  if (q.platform) where.push('platform = ?'), args.push(q.platform);
  if (q.before) where.push('(published_at, id) < (?, ?)'), args.push(q.before.publishedAt, q.before.id);
  const sql = `SELECT ${COLUMNS} FROM posts WHERE ${where.join(' AND ')} ORDER BY published_at DESC, id DESC LIMIT ?`;
  const { results } = await db.prepare(sql).bind(...args, q.limit).all<PostRow>();
  return results;
}

export const encodeCursor = (r: PostRow) => `${r.published_at}~${r.id}`;

export async function listAll(db: D1Database): Promise<PostRow[]> {
  const { results } = await db.prepare(`SELECT ${COLUMNS} FROM posts ORDER BY published_at DESC, id DESC LIMIT 500`).all<PostRow>();
  return results;
}

export async function getPost(db: D1Database, id: string): Promise<PostRow | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM posts WHERE id = ?`).bind(id).first<PostRow>();
}

export async function insertCurated(db: D1Database, link: CuratedUrl, text: string, publishedAt: string): Promise<PostRow> {
  const id = `${link.platform}:${link.nativeId}`;
  const now = new Date().toISOString();
  const res = await db
    .prepare(
      `INSERT INTO posts (id, platform, category, source, url, kind, text, published_at, created_at, updated_at)
       VALUES (?, ?, ?, 'curated', ?, 'text', ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
    )
    .bind(id, link.platform, PLATFORM_CATEGORY[link.platform], link.url, text, publishedAt, now, now)
    .run();
  if (res.meta.changes === 0) throw new HttpError(409, 'That post is already in the feed.');
  return (await getPost(db, id))!;
}

export async function updatePost(db: D1Database, id: string, patch: { hidden?: boolean; text?: string }): Promise<PostRow> {
  const post = await getPost(db, id);
  if (!post) throw new HttpError(404, 'No such post.');
  if (patch.text !== undefined && post.source !== 'curated') throw new HttpError(409, 'Only curated posts can be edited. Live posts come from the platform.');
  const sets: string[] = ['updated_at = ?'];
  const args: unknown[] = [new Date().toISOString()];
  if (patch.hidden !== undefined) sets.push('hidden = ?'), args.push(patch.hidden ? 1 : 0);
  if (patch.text !== undefined) sets.push('text = ?'), args.push(patch.text);
  await db.prepare(`UPDATE posts SET ${sets.join(', ')} WHERE id = ?`).bind(...args, id).run();
  return (await getPost(db, id))!;
}

export async function deletePost(db: D1Database, id: string): Promise<void> {
  const post = await getPost(db, id);
  if (!post) throw new HttpError(404, 'No such post.');
  if (post.source !== 'curated') throw new HttpError(409, 'Live posts come back on the next sync. Hide them instead.');
  await db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
}

export interface SyncStatus {
  at: string;
  ok: boolean;
  items: number | null;
  error: string | null;
}

export async function latestSyncs(db: D1Database): Promise<Record<'youtube' | 'instagram', SyncStatus | null>> {
  const out: Record<'youtube' | 'instagram', SyncStatus | null> = { youtube: null, instagram: null };
  const { results } = await db
    .prepare(
      `SELECT platform, started_at, ok, items, error FROM sync_runs s
       WHERE started_at = (SELECT MAX(started_at) FROM sync_runs WHERE platform = s.platform)`,
    )
    .all<{ platform: string; started_at: string; ok: number | null; items: number | null; error: string | null }>();
  for (const r of results) {
    if (r.platform === 'youtube' || r.platform === 'instagram') {
      out[r.platform] = { at: r.started_at, ok: r.ok === 1, items: r.items, error: r.error };
    }
  }
  return out;
}
