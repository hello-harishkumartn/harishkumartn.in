import test from 'node:test';
import assert from 'node:assert/strict';
import { FeedError, fetchFeed, groupByPlatform, PLATFORM_ORDER, relativeDate } from '../src/social/feed.ts';

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

test('platforms show in a fixed order: LinkedIn, X, Instagram, YouTube', () => {
  assert.deepEqual(PLATFORM_ORDER, ['linkedin', 'x', 'instagram', 'youtube']);
});

test('groupByPlatform takes the newest few of every platform from one mixed feed, keeping feed order', () => {
  const posts = [
    post('y1', 'personal', 'youtube'), post('l1', 'professional', 'linkedin'), post('i1', 'personal', 'instagram'),
    post('i2', 'personal', 'instagram'), post('l2', 'professional', 'linkedin'), post('i3', 'personal', 'instagram'),
  ];
  const groups = groupByPlatform(posts, 2);
  assert.deepEqual(Object.keys(groups), PLATFORM_ORDER);
  assert.deepEqual(Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.map((p) => p.id)])), {
    linkedin: ['l1', 'l2'], x: [], instagram: ['i1', 'i2'], youtube: ['y1'],
  });
});

test('relativeDate: just now, minutes, hours, days, then the full date after 30 days', () => {
  const now = Date.parse('2026-11-17T12:00:00.000Z');
  const ago = (ms) => new Date(now - ms).toISOString();
  assert.equal(relativeDate(ago(20_000), now), 'Just now');
  assert.equal(relativeDate(ago(5 * 60_000), now), '5 minutes ago');
  assert.equal(relativeDate(ago(60 * 60_000), now), '1 hour ago');
  assert.equal(relativeDate(ago(26 * 3600_000), now), 'Yesterday');
  assert.equal(relativeDate(ago(3 * 86400_000), now), '3 days ago');
  assert.equal(relativeDate(ago(29 * 86400_000), now), '29 days ago');
  assert.equal(relativeDate('2026-09-02T08:00:00.000Z', now), '2 Sept 2026');
  assert.equal(relativeDate(ago(-60_000), now), 'Just now');
});
