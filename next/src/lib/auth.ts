import 'server-only';
import { headers } from 'next/headers';
import { getPool } from './pool';
import { nextCookies } from 'better-auth/next-js';
import { makeAuth } from './auth-config';

let _auth: ReturnType<typeof makeAuth> | undefined;
export function getAuth() {
  return (_auth ??= makeAuth(getPool(), { plugins: [nextCookies()] }));
}

/** The signed-in admin, or null. Only ADMIN_EMAIL counts as admin. */
export async function getAdmin() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  const admin = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!session || !admin || session.user.email.toLowerCase() !== admin) return null;
  return session.user;
}
