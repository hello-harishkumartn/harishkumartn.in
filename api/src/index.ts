import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import { createApp } from './app';

// One key set per isolate. jose caches the team's certs and refetches when a new key id appears.
let keys: JWTVerifyGetKey | undefined;
let keysFor = '';

function accessKeys(env: Env): JWTVerifyGetKey {
  const team = env.ACCESS_TEAM_DOMAIN.replace(/\/+$/, '');
  if (!keys || keysFor !== team) {
    keys = team ? createRemoteJWKSet(new URL(`${team}/cdn-cgi/access/certs`)) : () => Promise.reject(new Error('Access not configured'));
    keysFor = team;
  }
  return keys;
}

export default {
  fetch(request, env, ctx) {
    return createApp({ accessKeys: (header, token) => accessKeys(env)(header, token) }).fetch!(request, env, ctx);
  },
} satisfies ExportedHandler<Env>;
