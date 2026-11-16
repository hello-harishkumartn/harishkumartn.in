import { describe, expect, it } from 'vitest';
import { parseYouTubeFeed } from '../src/youtube';
import { CHANNEL, youtubeFeed } from './fixtures';

describe('parseYouTubeFeed', () => {
  it('turns entries into live video posts with https thumbnails on i.ytimg.com', () => {
    const xml = youtubeFeed([
      { id: 'abcDEF12345', title: 'Smash practice', published: '2026-11-14T12:30:00+00:00', description: 'Morning session' },
      { id: 'zyx_-987654', title: 'Rally in 30s', published: '2026-11-15T08:00:00+05:30', shorts: true },
    ]);
    expect(parseYouTubeFeed(xml, CHANNEL)).toEqual([
      {
        nativeId: 'abcDEF12345',
        url: 'https://www.youtube.com/watch?v=abcDEF12345',
        kind: 'video',
        title: 'Smash practice',
        text: 'Morning session',
        mediaUrl: 'https://i.ytimg.com/vi/abcDEF12345/hqdefault.jpg',
        publishedAt: '2026-11-14T12:30:00.000Z',
      },
      {
        nativeId: 'zyx_-987654',
        url: 'https://www.youtube.com/shorts/zyx_-987654',
        kind: 'video',
        title: 'Rally in 30s',
        text: null,
        mediaUrl: 'https://i.ytimg.com/vi/zyx_-987654/hqdefault.jpg',
        publishedAt: '2026-11-15T02:30:00.000Z',
      },
    ]);
  });

  it('decodes XML entities in titles and descriptions', () => {
    const xml = youtubeFeed([
      { id: 'abcDEF12345', title: 'Code &amp; badminton &lt;3 &quot;live&quot; &#39;24 &#x1F3F8;', published: '2026-11-14T12:30:00+00:00', description: 'a &amp;amp; b' },
    ]);
    const [post] = parseYouTubeFeed(xml, CHANNEL);
    expect(post.title).toBe('Code & badminton <3 "live" \'24 🏸');
    expect(post.text).toBe('a &amp; b');
  });

  it('accepts a valid feed with no videos (the channel today)', () => {
    expect(parseYouTubeFeed(youtubeFeed([]), CHANNEL)).toEqual([]);
  });

  it('accepts the channel id with or without the UC prefix', () => {
    expect(parseYouTubeFeed(youtubeFeed([], CHANNEL), CHANNEL)).toEqual([]);
  });

  it('throws on a feed for another channel, an HTML error page or garbage', () => {
    expect(() => parseYouTubeFeed(youtubeFeed([], 'SomeoneElse12345678901'), CHANNEL)).toThrow(/channel/i);
    expect(() => parseYouTubeFeed('<!DOCTYPE html><html><body>Error 404</body></html>', CHANNEL)).toThrow();
    expect(() => parseYouTubeFeed('', CHANNEL)).toThrow();
    expect(() => parseYouTubeFeed('<feed><entry><yt:videoId>x', CHANNEL)).toThrow();
  });

  it('skips an entry with a bad video id or date instead of failing the whole feed', () => {
    const xml = youtubeFeed([
      { id: 'abcDEF12345', title: 'Good', published: '2026-11-14T12:30:00+00:00' },
      { id: 'bad id!', title: 'Bad id', published: '2026-11-14T12:30:00+00:00' },
      { id: 'zyx_-987654', title: 'Bad date', published: 'yesterday' },
    ]);
    expect(parseYouTubeFeed(xml, CHANNEL).map((p) => p.nativeId)).toEqual(['abcDEF12345']);
  });
});
