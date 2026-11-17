import { describe, expect, it } from 'vitest';
import { admin, call } from './helpers';

describe('installable admin with an Android share target', () => {
  it('serves a public manifest whose share target opens /admin/share with title, text and url', async () => {
    const res = await call('/manifest.webmanifest');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('application/manifest+json');
    const m = await res.json<Record<string, any>>();
    expect(m).toMatchObject({ start_url: '/admin', scope: '/admin', display: 'standalone' });
    expect(m.name).toBeTruthy();
    expect(m.share_target).toEqual({ action: '/admin/share', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } });
    expect(m.icons).toEqual(expect.arrayContaining([expect.objectContaining({ src: '/icon.svg', type: 'image/svg+xml' })]));
  });

  it('serves the icon publicly as SVG', async () => {
    const res = await call('/icon.svg');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('image/svg+xml');
    expect(await res.text()).toContain('<svg');
  });

  it('opens the admin page for a shared link without a password, since the page shell holds no data', async () => {
    const res = await call('/admin/share?text=' + encodeURIComponent('Look https://www.instagram.com/p/DCx7aB-_9Qz/?igsh=abc'));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toContain('text/html');
    expect(await res.text()).toContain('<title>Social hub admin</title>');
  });

  it('links the manifest from the admin page with credentials-free public URLs', async () => {
    const html = await (await admin('/admin')).text();
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest">');
    expect(html).toContain('<link rel="icon" href="/icon.svg"');
  });
});

describe('shared link extraction in the admin page', () => {
  it('picks the first https link from url, then text, then title', async () => {
    const { firstLink } = await import('../src/share');
    expect(firstLink({ url: 'https://www.linkedin.com/feed/update/urn:li:activity:1/', text: 'x', title: null })).toBe('https://www.linkedin.com/feed/update/urn:li:activity:1/');
    expect(firstLink({ url: null, text: 'My reel https://www.instagram.com/reel/DCy1Reel123/?igsh=MWQ1 enjoy', title: 'Instagram' }))
      .toBe('https://www.instagram.com/reel/DCy1Reel123/?igsh=MWQ1');
    expect(firstLink({ url: '', text: 'no link here', title: 'see https://x.com/a/status/1.' })).toBe('https://x.com/a/status/1');
    expect(firstLink({ url: null, text: 'http://insecure.example/p', title: null })).toBeNull();
  });
});
