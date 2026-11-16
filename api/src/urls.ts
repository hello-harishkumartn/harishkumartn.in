/** A LinkedIn or X post link reduced to its platform, a stable id and one canonical URL. */
export interface CuratedUrl {
  platform: 'linkedin' | 'x';
  nativeId: string;
  url: string;
}

const X_HOSTS = new Set(['x.com', 'www.x.com', 'mobile.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com']);
const LINKEDIN_HOSTS = new Set(['linkedin.com', 'www.linkedin.com']);
const URN_TYPES = new Set(['activity', 'share', 'ugcPost']);

/**
 * Parses a pasted post link. Accepts X status links (x.com or twitter.com, any subpath such as /photo/1)
 * and LinkedIn posts (/feed/update/urn:li:<type>:<id> or /posts/<slug>-<type>-<id>-<suffix>).
 * Query strings and fragments are dropped. Returns null for anything else, so the same post pasted
 * in two forms always maps to the same id.
 */
export function parseCuratedUrl(raw: string): CuratedUrl | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase();
  const parts = u.pathname.split('/').filter(Boolean);

  if (X_HOSTS.has(host)) {
    const [user, status, id] = parts;
    if (status !== 'status' || !/^[A-Za-z0-9_]{1,15}$/.test(user ?? '') || !/^\d{1,25}$/.test(id ?? '')) return null;
    return { platform: 'x', nativeId: id, url: `https://x.com/${user}/status/${id}` };
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
    return { platform: 'linkedin', nativeId: `${type}:${id}`, url: `https://www.linkedin.com/feed/update/urn:li:${type}:${id}/` };
  }

  return null;
}
