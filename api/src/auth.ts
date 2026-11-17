import { HttpError } from './http';

/** Shorter secrets are treated as "not configured", so a weak or half-set password never unlocks the admin. */
export const MIN_PASSWORD_LENGTH = 24;

const sha256 = async (text: string) => crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));

/**
 * Checks the admin password on a /admin/api request.
 * Order: fail closed if the secret is missing, then the per-client rate limit, then a constant-time compare
 * (both sides hashed first so their lengths always match).
 */
export async function requirePassword(request: Request, env: Env): Promise<void> {
  const secret = env.ADMIN_PASSWORD;
  if (typeof secret !== 'string' || secret.length < MIN_PASSWORD_LENGTH) throw new HttpError(403, 'Admin access is not configured.');

  const client = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.ADMIN_LIMITER.limit({ key: client });
  if (!success) throw new HttpError(429, 'Too many attempts. Wait a minute and try again.');

  const match = /^Bearer (.+)$/.exec(request.headers.get('Authorization') ?? '');
  const given = match ? match[1] : '';
  const [a, b] = await Promise.all([sha256(given), sha256(secret)]);
  if (!given || !crypto.subtle.timingSafeEqual(a, b)) throw new HttpError(401, 'Wrong password.');
}

/** Writes must come from the admin page itself (same origin), which blocks cross-site requests. */
export function requireSameOrigin(request: Request): void {
  if (request.headers.get('Origin') !== new URL(request.url).origin) throw new HttpError(403, 'Cross-origin admin writes are not allowed.');
}
