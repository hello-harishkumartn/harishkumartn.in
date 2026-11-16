import { describe, expect, it } from 'vitest';
import { embedUrlFor, isYouTubeUrl, parseCuratedUrl } from '../src/urls';

describe('parseCuratedUrl', () => {
  it('reads an X status from x.com, twitter.com and mobile links and drops tracking', () => {
    for (const raw of [
      'https://x.com/harish_kumar_tn/status/1857000000000000001',
      'https://twitter.com/harish_kumar_tn/status/1857000000000000001?s=20&t=abc',
      'https://mobile.x.com/harish_kumar_tn/status/1857000000000000001/photo/1',
      'https://www.twitter.com/harish_kumar_tn/status/1857000000000000001#m',
    ]) {
      expect(parseCuratedUrl(raw), raw).toEqual({
        platform: 'x',
        nativeId: '1857000000000000001',
        url: 'https://x.com/harish_kumar_tn/status/1857000000000000001',
        kind: 'text',
      });
    }
  });

  it('reads LinkedIn feed/update URNs for activity, share and ugcPost', () => {
    expect(parseCuratedUrl('https://www.linkedin.com/feed/update/urn:li:activity:7263000000000000001/')).toEqual({
      platform: 'linkedin',
      nativeId: 'activity:7263000000000000001',
      url: 'https://www.linkedin.com/feed/update/urn:li:activity:7263000000000000001/',
      kind: 'text',
    });
    expect(parseCuratedUrl('https://linkedin.com/feed/update/urn:li:ugcPost:7263000000000000002?utm_source=share')?.nativeId)
      .toBe('ugcPost:7263000000000000002');
    expect(parseCuratedUrl('https://www.linkedin.com/feed/update/urn:li:share:7263000000000000003')?.nativeId)
      .toBe('share:7263000000000000003');
  });

  it('reads LinkedIn /posts/ share links and normalises them to the feed/update URL', () => {
    expect(
      parseCuratedUrl('https://www.linkedin.com/posts/harish-kumar-tn_agents-buildinpublic-activity-7263000000000000004-Ab3x?utm_source=share&utm_medium=member_desktop'),
    ).toEqual({
      platform: 'linkedin',
      nativeId: 'activity:7263000000000000004',
      url: 'https://www.linkedin.com/feed/update/urn:li:activity:7263000000000000004/',
      kind: 'text',
    });
  });

  it('reads Instagram posts, reels and tv links, with or without a username and share tracking', () => {
    const post = { platform: 'instagram', nativeId: 'p:DCx7aB-_9Qz', url: 'https://www.instagram.com/p/DCx7aB-_9Qz/', kind: 'image' };
    expect(parseCuratedUrl('https://www.instagram.com/p/DCx7aB-_9Qz/')).toEqual(post);
    expect(parseCuratedUrl('https://instagram.com/p/DCx7aB-_9Qz?igsh=MWQ1ZGUxMzBkMA==')).toEqual(post);
    expect(parseCuratedUrl('https://www.instagram.com/harish_kumar_tn/p/DCx7aB-_9Qz/?img_index=2')).toEqual(post);
    const reel = { platform: 'instagram', nativeId: 'reel:DCy1Reel123', url: 'https://www.instagram.com/reel/DCy1Reel123/', kind: 'video' };
    expect(parseCuratedUrl('https://www.instagram.com/reel/DCy1Reel123/?utm_source=ig_web_copy_link')).toEqual(reel);
    expect(parseCuratedUrl('https://www.instagram.com/reels/DCy1Reel123/')).toEqual(reel);
    expect(parseCuratedUrl('https://www.instagram.com/tv/DCy1Reel123')).toEqual(reel);
  });

  it('marks LinkedIn and X posts as text', () => {
    expect(parseCuratedUrl('https://x.com/harish_kumar_tn/status/1857000000000000001')?.kind).toBe('text');
    expect(parseCuratedUrl('https://www.linkedin.com/feed/update/urn:li:activity:7263000000000000001/')?.kind).toBe('text');
  });

  it('rejects anything that is not a single post on LinkedIn, X or Instagram', () => {
    for (const raw of [
      'https://www.instagram.com/harish_kumar_tn/',
      'https://www.instagram.com/stories/harish_kumar_tn/3500000000000000000/',
      'https://www.instagram.com/p/',
      'https://www.instagram.com/p/a b/',
      'https://instagram.com.evil.example/p/DCx7aB-_9Qz/',
    ]) {
      expect(parseCuratedUrl(raw), raw).toBeNull();
    }
  });

  it('rejects anything that is not a single post on LinkedIn or X', () => {
    for (const raw of [
      'not a url',
      'http://x.com/harish_kumar_tn/status/1857000000000000001',
      'https://x.com/harish_kumar_tn',
      'https://x.com/harish_kumar_tn/status/abc',
      'https://x.com.evil.example/harish_kumar_tn/status/1857000000000000001',
      'https://evil.example/x.com/harish_kumar_tn/status/1857000000000000001',
      'https://www.linkedin.com/in/harish-kumar-tn/',
      'https://www.linkedin.com/feed/update/urn:li:comment:123/',
      'javascript:alert(1)',
    ]) {
      expect(parseCuratedUrl(raw), raw).toBeNull();
    }
  });
});

describe('isYouTubeUrl', () => {
  it('spots YouTube links so the admin can explain they sync on their own', () => {
    for (const raw of ['https://www.youtube.com/watch?v=abcDEF12345', 'https://youtu.be/abcDEF12345', 'https://m.youtube.com/shorts/abcDEF12345']) {
      expect(isYouTubeUrl(raw), raw).toBe(true);
    }
    for (const raw of ['https://x.com/a/status/1', 'not a url', 'https://youtube.com.evil.example/watch']) expect(isYouTubeUrl(raw), raw).toBe(false);
  });
});

describe('embedUrlFor', () => {
  it('builds the click-to-load preview URL for each platform, none for X', () => {
    expect(embedUrlFor('instagram', 'https://www.instagram.com/p/DCx7aB-_9Qz/')).toBe('https://www.instagram.com/p/DCx7aB-_9Qz/embed');
    expect(embedUrlFor('instagram', 'https://www.instagram.com/reel/DCy1Reel123/')).toBe('https://www.instagram.com/reel/DCy1Reel123/embed');
    expect(embedUrlFor('linkedin', 'https://www.linkedin.com/feed/update/urn:li:activity:7263000000000000001/'))
      .toBe('https://www.linkedin.com/embed/feed/update/urn:li:activity:7263000000000000001');
    expect(embedUrlFor('youtube', 'https://www.youtube.com/watch?v=abcDEF12345')).toBe('https://www.youtube-nocookie.com/embed/abcDEF12345');
    expect(embedUrlFor('youtube', 'https://www.youtube.com/shorts/abcDEF12345')).toBe('https://www.youtube-nocookie.com/embed/abcDEF12345');
    expect(embedUrlFor('x', 'https://x.com/harish_kumar_tn/status/1857000000000000001')).toBeNull();
    expect(embedUrlFor('instagram', 'https://evil.example/p/x/')).toBeNull();
  });
});
