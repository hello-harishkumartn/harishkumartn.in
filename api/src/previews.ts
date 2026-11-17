import { HttpError } from './http';
import { getPost } from './posts';

/**
 * Automatic previews for curated posts (docs/egm/2026-11-16_social-hub.md, revision 5).
 * Reads the post's own public data, keeps the caption, the real date and a copy of the cover image.
 * Every URL fetched here is built from the canonical post id or checked against an allowlist.
 */

export interface Preview {
  caption: string | null;
  publishedAt: string | null;
  imageUrl: string | null;
}

export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_CAPTION = 3000;
const DEADLINE_MS = 25_000;
const MAX_ATTEMPTS = 3;
const PER_CRON_RUN = 2;
const USER_AGENT = 'harish-social/1.0 (+https://harishkumartn.in)';
const EMPTY: Preview = { caption: null, publishedAt: null, imageUrl: null };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

// ---------- text helpers ----------

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Trailing spaces off every line, at most one blank line in a row, trimmed and capped. Empty means null. */
function tidy(s: string | null | undefined): string | null {
  if (!s) return null;
  const out = s.replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return out ? out.slice(0, MAX_CAPTION) : null;
}

const iso = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
};

/** "November 16, 2026" at midday UTC, so the day never shifts in any time zone. */
function dayFromWords(s: string | null | undefined): string | null {
  const m = s && /\b([A-Z][a-z]+) (\d{1,2}), (\d{4})\b/.exec(s);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1].toLowerCase());
  return month < 0 ? null : new Date(Date.UTC(Number(m[3]), month, Number(m[2]), 12)).toISOString();
}

const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

// ---------- X ----------

/** The token X's own embed sends to the syndication endpoint. */
export function xToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

export function parseXSyndication(data: unknown): Preview {
  if (!data || typeof data !== 'object') return EMPTY;
  const d = data as Record<string, any>;
  let text = str(d.text);
  // The range start skips reply @mentions (code points). Its end counts escaped entities, so instead of
  // trusting it the trailing media and quote links are trimmed off.
  const start = Array.isArray(d.display_text_range) ? Number(d.display_text_range[0]) : 0;
  if (text && Number.isInteger(start) && start > 0) text = Array.from(text).slice(start).join('');
  if (text) text = text.replace(/(\s*https:\/\/t\.co\/\w+)+\s*$/, '');
  const image =
    (Array.isArray(d.mediaDetails) && str(d.mediaDetails[0]?.media_url_https)) ||
    (Array.isArray(d.photos) && str(d.photos[0]?.url)) ||
    str(d.video?.poster);
  return { caption: tidy(text && decodeEntities(text)), publishedAt: iso(d.created_at), imageUrl: image || null };
}

export function parseXOembed(data: unknown): Preview {
  const html = data && typeof data === 'object' ? str((data as Record<string, unknown>).html) : null;
  if (!html) return EMPTY;
  const p = /<p\b[^>]*>([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? '';
  const text = p
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a\b[^>]*>\s*pic\.(twitter|x)\.com\/[^<]*<\/a>/gi, '')
    .replace(/<[^>]+>/g, '');
  const dates = [...html.matchAll(/>([A-Z][a-z]+ \d{1,2}, \d{4})<\/a>/g)];
  return { caption: tidy(decodeEntities(text)), publishedAt: dayFromWords(dates.at(-1)?.[1]), imageUrl: null };
}

// ---------- pages (LinkedIn, Instagram) ----------

interface PageBits {
  title: string;
  meta: Map<string, string>;
  jsonLd: string[];
}

/** Streams the page through HTMLRewriter and keeps only <title>, the meta tags and JSON-LD blocks. */
async function scanPage(res: Response): Promise<PageBits> {
  const bits: PageBits = { title: '', meta: new Map(), jsonLd: [] };
  let titles = 0;
  const rewriter = new HTMLRewriter()
    .on('head title', {
      element() { titles++; },
      text(t) { if (titles === 1) bits.title += t.text; },
    })
    .on('meta', {
      element(e) {
        const key = e.getAttribute('property') ?? e.getAttribute('name');
        const content = e.getAttribute('content');
        if (key && content !== null && !bits.meta.has(key)) bits.meta.set(key, decodeEntities(content));
      },
    })
    .on('script[type="application/ld+json"]', {
      element() { bits.jsonLd.push(''); },
      text(t) { bits.jsonLd[bits.jsonLd.length - 1] += t.text; },
    });
  await rewriter.transform(res).arrayBuffer();
  bits.title = decodeEntities(bits.title);
  return bits;
}

function ldObjects(blocks: string[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      out.push(v as Record<string, unknown>);
      const graph = (v as Record<string, unknown>)['@graph'];
      if (graph) walk(graph);
    }
  };
  for (const b of blocks) {
    try { walk(JSON.parse(b)); } catch { /* not JSON, skip */ }
  }
  return out;
}

export async function parseLinkedInPage(res: Response): Promise<Preview> {
  const { title, meta, jsonLd } = await scanPage(res);
  const post = ldObjects(jsonLd).find((o) => {
    const text = str(o.articleBody) ?? str(o.description);
    return text && !text.startsWith('Video Captions for');
  });
  const caption = post ? tidy(decodeEntities(str(post.articleBody) ?? str(post.description) ?? '')) : tidy(title.split(' | ')[0]);
  const image = meta.get('og:image') ?? (post && str(post.thumbnailUrl)) ?? null;
  return { caption, publishedAt: post ? iso(post.datePublished) ?? iso(post.uploadDate) : null, imageUrl: image || null };
}

export async function parseInstagramPage(res: Response): Promise<Preview> {
  const { meta } = await scanPage(res);
  const title = meta.get('og:title') ?? '';
  const caption = /on Instagram: "([\s\S]*)"\s*$/.exec(title)?.[1] ?? null;
  const description = meta.get('og:description') ?? meta.get('description');
  return { caption: tidy(caption), publishedAt: dayFromWords(description), imageUrl: meta.get('og:image') || null };
}

// ---------- fetching ----------

const IMAGE_HOSTS = new Set(['pbs.twimg.com', 'media.licdn.com', 'dms.licdn.com']);
const IMAGE_HOST_SUFFIXES = ['.cdninstagram.com', '.fbcdn.net'];

export function isAllowedImageHost(raw: string): boolean {
  let url: URL;
  try { url = new URL(raw); } catch { return false; }
  if (url.protocol !== 'https:' || url.port) return false;
  return IMAGE_HOSTS.has(url.hostname) || IMAGE_HOST_SUFFIXES.some((s) => url.hostname.endsWith(s));
}

/** The real type from the first bytes. Anything else is refused, whatever the server claimed. */
function sniffImage(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

async function downloadImage(url: string, fetcher: typeof fetch, signal: AbortSignal): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!isAllowedImageHost(url)) return null;
  const res = await fetcher(url, { redirect: 'manual', signal, headers: { 'User-Agent': USER_AGENT, Accept: 'image/*' } });
  if (res.status !== 200 || !res.body) return null;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { bytes.set(c, at); at += c.byteLength; }
  const contentType = sniffImage(bytes);
  return contentType ? { bytes, contentType } : null;
}

async function fetchPage(url: string, fetcher: typeof fetch, signal: AbortSignal): Promise<Response | null> {
  const res = await fetcher(url, { signal, headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' } });
  const finalHost = new URL(res.url || url).host;
  if (!res.ok || finalHost !== new URL(url).host) return null;
  return res;
}

async function fetchJson(url: string, fetcher: typeof fetch, signal: AbortSignal): Promise<unknown> {
  const res = await fetcher(url, { signal, headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) return null;
  return res.json().catch(() => null);
}

export async function fetchPreview(post: { id: string; platform: string; url: string }, fetcher: typeof fetch, signal: AbortSignal): Promise<Preview> {
  if (post.platform === 'x') {
    const id = post.id.slice('x:'.length);
    const syndication = parseXSyndication(
      await fetchJson(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${xToken(id)}`, fetcher, signal).catch(() => null),
    );
    if (syndication.caption || syndication.imageUrl) return syndication;
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(post.url)}&omit_script=1&dnt=1`;
    return parseXOembed(await fetchJson(oembedUrl, fetcher, signal));
  }
  const page = await fetchPage(post.url, fetcher, signal);
  if (!page) return EMPTY;
  return post.platform === 'linkedin' ? parseLinkedInPage(page) : post.platform === 'instagram' ? parseInstagramPage(page) : EMPTY;
}

// ---------- storing ----------

/**
 * Fetches and stores one curated post's preview. The attempt is counted before any fetch, so a run that
 * gets cut off still counts. A failure only records the status; a success sets caption, image and the date
 * (unless Harish typed one in).
 */
export async function refreshPreview(env: Env, fetcher: typeof fetch, id: string): Promise<'ok' | 'failed'> {
  const post = await getPost(env.DB, id);
  if (!post) throw new HttpError(404, 'No such post.');
  if (post.source !== 'curated') throw new HttpError(409, 'Only shared posts have previews. YouTube brings its own.');
  await env.DB.prepare('UPDATE posts SET preview_attempts = preview_attempts + 1 WHERE id = ?').bind(id).run();

  const signal = AbortSignal.timeout(DEADLINE_MS);
  let preview: Preview = EMPTY;
  try {
    preview = await fetchPreview(post, fetcher, signal);
  } catch (err) {
    console.warn('Preview fetch failed', id, err instanceof Error ? err.message : err);
  }
  const now = new Date().toISOString();
  if (!preview.caption && !preview.imageUrl) {
    await env.DB.prepare(`UPDATE posts SET preview_status = 'failed', updated_at = ? WHERE id = ?`).bind(now, id).run();
    return 'failed';
  }

  let mediaUrl: string | null = null;
  if (preview.imageUrl) {
    const image = await downloadImage(preview.imageUrl, fetcher, signal).catch(() => null);
    if (image) {
      await env.MEDIA.put(id, image.bytes, { metadata: { contentType: image.contentType } });
      mediaUrl = `/media/${encodeURIComponent(id)}?v=${Date.now().toString(36)}`;
    }
  }

  const res = await env.DB.prepare(
    `UPDATE posts SET caption = ?1, preview_status = 'ok', media_url = COALESCE(?2, media_url),
       published_at = CASE WHEN date_from_user = 0 AND ?3 IS NOT NULL THEN ?3 ELSE published_at END, updated_at = ?4
     WHERE id = ?5`,
  )
    .bind(preview.caption, mediaUrl, preview.publishedAt, now, id)
    .run();
  // Deleted while we were fetching: do not leave its image behind.
  if (res.meta.changes === 0 && mediaUrl) await env.MEDIA.delete(id);
  return 'ok';
}

/** Cron: a few curated posts still waiting for a preview, fewest attempts first. Returns how many were tried. */
export async function retryPreviews(env: Env, fetcher: typeof fetch): Promise<number> {
  const { results } = await env.DB.prepare(
    `SELECT id FROM posts WHERE source = 'curated' AND preview_status IN ('pending', 'failed') AND preview_attempts < ?
     ORDER BY preview_attempts, published_at DESC LIMIT ?`,
  )
    .bind(MAX_ATTEMPTS, PER_CRON_RUN)
    .all<{ id: string }>();
  for (const { id } of results) {
    await refreshPreview(env, fetcher, id).catch((err) => console.warn('Preview retry failed', id, err));
  }
  return results.length;
}

/** GET /media/<post id>: the stored cover image, only for visible posts. */
export async function serveMedia(env: Env, encodedId: string): Promise<Response> {
  let id: string;
  try { id = decodeURIComponent(encodedId); } catch { throw new HttpError(404, 'Not found.'); }
  const visible = await env.DB.prepare('SELECT 1 FROM posts WHERE id = ? AND hidden = 0').bind(id).first();
  if (!visible) throw new HttpError(404, 'Not found.');
  const { value, metadata } = await env.MEDIA.getWithMetadata<{ contentType?: string }>(id, 'stream');
  if (!value) throw new HttpError(404, 'Not found.');
  return new Response(value, {
    headers: {
      'Content-Type': metadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
