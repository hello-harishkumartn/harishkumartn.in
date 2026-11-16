import { describe, expect, it } from 'vitest';
import { parseCuratedUrl } from '../src/urls';

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
      });
    }
  });

  it('reads LinkedIn feed/update URNs for activity, share and ugcPost', () => {
    expect(parseCuratedUrl('https://www.linkedin.com/feed/update/urn:li:activity:7263000000000000001/')).toEqual({
      platform: 'linkedin',
      nativeId: 'activity:7263000000000000001',
      url: 'https://www.linkedin.com/feed/update/urn:li:activity:7263000000000000001/',
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
    });
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
      'https://www.instagram.com/p/abc/',
      'javascript:alert(1)',
    ]) {
      expect(parseCuratedUrl(raw), raw).toBeNull();
    }
  });
});
