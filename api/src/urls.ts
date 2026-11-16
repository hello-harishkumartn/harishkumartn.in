/** A pasted post link reduced to its platform, a stable id, one canonical URL and the kind of post. */
export interface CuratedUrl {
  platform: 'linkedin' | 'x' | 'instagram';
  nativeId: string;
  url: string;
  kind: 'text' | 'image' | 'video';
}

const X_HOSTS = new Set(['x.com', 'www.x.com', 'mobile.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com']);
const LINKEDIN_HOSTS = new Set(['linkedin.com', 'www.linkedin.com']);
const INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com']);
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com']);
const URN_TYPES = new Set(['activity', 'share', 'ugcPost']);
const SHORTCODE = /^[A-Za-z0-9_-]{5,40}$/;

function httpsUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' ? u : null;
  } catch {
    return null;
  }
}

/**
 * Parses a pasted post link. Accepts X status links (x.com or twitter.com, any subpath such as /photo/1),
 * LinkedIn posts (/feed/update/urn:li:<type>:<id> or /posts/<slug>-<type>-<id>-<suffix>) and Instagram
 * posts, reels and tv (optionally under /<username>/). Query strings and fragments are dropped, so the
 * same post pasted in two forms always maps to the same id. Returns null for anything else.
 */
export function parseCuratedUrl(raw: string): CuratedUrl | null {
  const u = httpsUrl(raw);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);

  if (X_HOSTS.has(host)) {
    const [user, status, id] = parts;
    if (status !== 'status' || !/^[A-Za-z0-9_]{1,15}$/.test(user ?? '') || !/^\d{1,25}$/.test(id ?? '')) return null;
    return { platform: 'x', nativeId: id, url: `https://x.com/${user}/status/${id}`, kind: 'text' };
  }

  if (LINKEDIN_HOSTS.has(host)) {
    let type: string | undefined;
    let id: string | undefined;
    if (parts[0] === 'feed' && parts[1] === 'update' && parts.length === 3) {
      [, type, id] = /^urn:li:([A-Za-z]+):(\d+)$/.exec(decodeURIComponent(parts[2])) ?? [];
    } else if (parts[0] === 'posts' && parts.length === 2) {
      [, type, id] = /-(activity|share|ugcPost)-(\d+)(?:-[A-Za-z0-9_-]*)?$/.exec(parts[1]) ?? [];
    }
    if (!type || !id || !URN_TYPES.has(type)) return null;
    return { platform: 'linkedin', nativeId: `${type}:${id}`, url: `https://www.linkedin.com/feed/update/urn:li:${type}:${id}/`, kind: 'text' };
  }

  if (INSTAGRAM_HOSTS.has(host)) {
    // /p/<code>, /reel/<code>, /reels/<code>, /tv/<code>, optionally after /<username>/
    const rest = parts.length === 3 ? parts.slice(1) : parts;
    const [type, code] = rest;
    if (rest.length !== 2 || !SHORTCODE.test(code ?? '')) return null;
    if (type === 'p') return { platform: 'instagram', nativeId: `p:${code}`, url: `https://www.instagram.com/p/${code}/`, kind: 'image' };
    if (type === 'reel' || type === 'reels' || type === 'tv') {
      return { platform: 'instagram', nativeId: `reel:${code}`, url: `https://www.instagram.com/reel/${code}/`, kind: 'video' };
    }
    return null;
  }

  return null;
}

/** True for any YouTube link, so the admin can explain that YouTube syncs on its own. */
export function isYouTubeUrl(raw: string): boolean {
  const u = httpsUrl(raw);
  return !!u && YOUTUBE_HOSTS.has(u.hostname.toLowerCase());
}

/**
 * The click-to-load preview for a stored post, derived from its canonical URL. Null for X (no plain
 * iframe embed) and for anything that does not match the expected canonical form.
 */
export function embedUrlFor(platform: string, url: string): string | null {
  const u = httpsUrl(url);
  if (!u) return null;
  const host = u.hostname.toLowerCase();
  if (platform === 'instagram' && host === 'www.instagram.com') {
    const m = /^\/(p|reel)\/([A-Za-z0-9_-]{5,40})\/$/.exec(u.pathname);
    return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed` : null;
  }
  if (platform === 'linkedin' && host === 'www.linkedin.com') {
    const m = /^\/feed\/update\/(urn:li:(?:activity|share|ugcPost):\d+)\/$/.exec(u.pathname);
    return m ? `https://www.linkedin.com/embed/feed/update/${m[1]}` : null;
  }
  if (platform === 'youtube' && host === 'www.youtube.com') {
    const id = u.pathname === '/watch' ? u.searchParams.get('v') : /^\/shorts\/([^/]+)$/.exec(u.pathname)?.[1];
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  }
  return null;
}
