import type { LivePost } from './sync';

/** YouTube's channel feed holds at most this many videos, newest first. */
export const YOUTUBE_FEED_SIZE = 15;

export const youtubeFeedUrl = (channelId: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decodes XML entities in one pass, so "&amp;amp;" becomes "&amp;" and not "&". */
function decodeXml(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, e: string) => {
    if (e[0] !== '#') return ENTITIES[e];
    const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  });
}

const tag = (xml: string, name: string) => new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(xml)?.[1];
const attr = (xml: string, name: string, attribute: string) =>
  new RegExp(`<${name}\\b[^>]*\\s${attribute}="([^"]*)"`).exec(xml)?.[1];
const bareChannel = (id: string) => id.trim().replace(/^UC/, '');

function clip(value: string | undefined, max: number): string | null {
  const text = value === undefined ? '' : decodeXml(value).trim();
  return text ? text.slice(0, max) : null;
}

/**
 * Parses YouTube's channel Atom feed. Throws unless the body is a complete feed for this channel
 * (the feed reports the id without its "UC" prefix, so both forms match). Entries with a bad
 * video id or date are skipped rather than failing the whole feed. Thumbnails are always rebuilt
 * as https://i.ytimg.com/vi/<id>/hqdefault.jpg instead of trusting the URL in the feed.
 */
export function parseYouTubeFeed(xml: string, channelId: string): LivePost[] {
  const start = xml.indexOf('<feed');
  const end = xml.lastIndexOf('</feed>');
  if (start < 0 || end < start) throw new Error('Not a YouTube feed.');
  const body = xml.slice(start, end);
  const header = body.split('<entry>')[0];
  const feedChannel = tag(header, 'yt:channelId');
  if (!feedChannel || bareChannel(feedChannel) !== bareChannel(channelId)) throw new Error('The feed is for a different channel.');

  const posts: LivePost[] = [];
  for (const [, entry] of body.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const id = tag(entry, 'yt:videoId')?.trim() ?? '';
    const published = Date.parse(tag(entry, 'published') ?? '');
    if (!/^[A-Za-z0-9_-]{11}$/.test(id) || Number.isNaN(published)) continue;
    const href = decodeXml(attr(entry, 'link', 'href') ?? '');
    const url = href === `https://www.youtube.com/shorts/${id}` ? href : `https://www.youtube.com/watch?v=${id}`;
    posts.push({
      nativeId: id,
      url,
      kind: 'video',
      title: clip(tag(entry, 'title'), 300),
      text: clip(tag(entry, 'media:description'), 3000),
      mediaUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      publishedAt: new Date(published).toISOString(),
    });
  }
  return posts;
}
