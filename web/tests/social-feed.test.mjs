import test from 'node:test';
import assert from 'node:assert/strict';
import { FeedError, fetchFeed, PLATFORMS_BY_TAB, parseState, splitHome, toSearch } from '../src/social/feed.ts';

const API = 'https://harish-social.example.workers.dev';
const post = (id, category, platform, publishedAt = '2026-11-10T00:00:00.000Z') => ({
  id, category, platform, source: 'curated', url: `https://example.com/${id}`, kind: 'text',
  title: null, text: id, mediaUrl: null, embedUrl: null, publishedAt,
});

/** A fetch stand-in that records requests and answers with the given response factory. */
function fakeFetch(respond) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url: String(url), init });
    return respond(url, init);
  };
  return Object.assign(fn, { calls });
}

test('fetchFeed calls /feed with only the parameters that are set', async () => {
  const f = fakeFetch(() => new Response(JSON.stringify({ posts: [], next: null })));
  await fetchFeed(API, {}, { fetch: f });
  await fetchFeed(API + '/', { category: 'personal', platform: 'youtube', limit: 6, before: '2026-11-10T00:00:00.000Z~x:1' }, { fetch: f });
  assert.equal(f.calls[0].url, `${API}/feed`);
  const u = new URL(f.calls[1].url);
  assert.equal(u.origin + u.pathname, `${API}/feed`);
  assert.deepEqual(Object.fromEntries(u.searchParams), {
    category: 'personal', platform: 'youtube', limit: '6', before: '2026-11-10T00:00:00.000Z~x:1',
  });
});

test('fetchFeed returns posts and the next cursor', async () => {
  const body = { posts: [post('a', 'personal', 'youtube')], next: 'c' };
  const res = await fetchFeed(API, {}, { fetch: fakeFetch(() => new Response(JSON.stringify(body))) });
  assert.deepEqual(res, body);
});

test('fetchFeed fails with FeedError when the API is not configured, errors, times out or sends junk', async () => {
  await assert.rejects(fetchFeed('', {}, { fetch: fakeFetch(() => new Response('{}')) }), FeedError);
  await assert.rejects(fetchFeed(API, {}, { fetch: fakeFetch(() => new Response('nope', { status: 500 })) }), FeedError);
  await assert.rejects(fetchFeed(API, {}, { fetch: fakeFetch(() => new Response('<html>')) }), FeedError);
  await assert.rejects(fetchFeed(API, {}, { fetch: fakeFetch(() => new Response('{"posts":"x"}')) }), FeedError);
  await assert.rejects(fetchFeed(API, {}, { fetch: fakeFetch(() => Promise.reject(new TypeError('offline'))) }), FeedError);
  const hang = fakeFetch((_u, init) => new Promise((_ok, fail) => init.signal.addEventListener('abort', () => fail(init.signal.reason))));
  const started = Date.now();
  await assert.rejects(fetchFeed(API, {}, { fetch: hang, timeoutMs: 50 }), FeedError);
  assert.ok(Date.now() - started < 1000);
});

test('splitHome takes the newest few of each side from one mixed feed', () => {
  const posts = [
    post('p1', 'personal', 'youtube'), post('w1', 'professional', 'linkedin'), post('p2', 'personal', 'instagram'),
    post('p3', 'personal', 'instagram'), post('p4', 'personal', 'youtube'), post('w2', 'professional', 'x'),
  ];
  const { professional, personal } = splitHome(posts, 3);
  assert.deepEqual(professional.map((p) => p.id), ['w1', 'w2']);
  assert.deepEqual(personal.map((p) => p.id), ['p1', 'p2', 'p3']);
});

test('tabs know their platforms', () => {
  assert.deepEqual(PLATFORMS_BY_TAB, { professional: ['linkedin', 'x'], personal: ['instagram', 'youtube'] });
});

test('page state round-trips through the URL and ignores nonsense', () => {
  assert.deepEqual(parseState(''), { tab: 'professional', platform: null });
  assert.deepEqual(parseState('?tab=personal&platform=youtube'), { tab: 'personal', platform: 'youtube' });
  assert.deepEqual(parseState('?tab=games&platform=tiktok'), { tab: 'professional', platform: null });
  assert.deepEqual(parseState('?tab=personal&platform=x'), { tab: 'personal', platform: null });
  assert.equal(toSearch({ tab: 'professional', platform: null }), '');
  assert.equal(toSearch({ tab: 'personal', platform: null }), '?tab=personal');
  assert.equal(toSearch({ tab: 'personal', platform: 'instagram' }), '?tab=personal&platform=instagram');
  for (const s of ['?tab=personal', '?tab=personal&platform=instagram', '?tab=professional&platform=x']) {
    assert.deepEqual(parseState(toSearch(parseState(s))), parseState(s));
  }
});
