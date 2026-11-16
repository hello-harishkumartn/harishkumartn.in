import { jwtVerify, type JWTVerifyGetKey } from 'jose';
import { HttpError } from './http';

/**
 * Verifies the Cloudflare Access JWT on an admin request and returns the signed-in email.
 * Checks the signature against the team's keys plus iss, aud, exp and the allowed email.
 * Fails closed: if ACCESS_TEAM_DOMAIN or ACCESS_AUD is empty, every request is refused.
 */
export async function verifyAccess(request: Request, env: Env, keys: JWTVerifyGetKey): Promise<string> {
  const team = env.ACCESS_TEAM_DOMAIN.replace(/\/+$/, '');
  if (!team || !env.ACCESS_AUD) throw new HttpError(403, 'Admin access is not configured.');
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new HttpError(403, 'Sign in through Cloudflare Access.');

  let email: unknown;
  try {
    const { payload } = await jwtVerify(token, keys, { issuer: team, audience: env.ACCESS_AUD, algorithms: ['RS256'] });
    email = payload.email;
  } catch {
    throw new HttpError(403, 'Access token is not valid.');
  }
  if (typeof email !== 'string' || email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()) {
    throw new HttpError(403, 'This account is not allowed.');
  }
  return email;
}

/** Writes must come from the admin page itself (same origin), which blocks cross-site requests. */
export function requireSameOrigin(request: Request): void {
  if (request.headers.get('Origin') !== new URL(request.url).origin) throw new HttpError(403, 'Cross-origin admin writes are not allowed.');
}
