import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { syncSite } from '../scripts/sync-site.mjs';

function write(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

/** A fake repo: a fresh dist, a site with life/ and projects/ (one demo drop, one generated page). */
function fixture({ distProjects = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-site-'));
  const dist = path.join(root, 'dist');
  const site = path.join(root, 'site');
  const preview = path.join(root, 'preview');
  write(path.join(dist, 'index.html'), '<!doctype html>new');
  write(path.join(dist, 'assets', 'index-new.js'), 'new');
  write(path.join(site, 'index.html'), 'old');
  write(path.join(site, 'assets', 'index-old.js'), 'old');
  write(path.join(site, 'life', 'index.html'), 'life');
  write(path.join(site, 'projects', 'forgeloop', 'index.html'), 'demo drop');
  write(path.join(site, 'projects', 'harish-ops-colony', 'app', 'status.json'), '{"sample":true}');
  if (distProjects) write(path.join(dist, 'projects', 'forgeloop', 'index.html'), 'clobber');
  return { dist, site, preview };
}

const read = (...p) => fs.readFileSync(path.join(...p), 'utf8');

test('sync replaces the build but keeps site/projects untouched', () => {
  const { dist, site, preview } = fixture();
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(site, 'index.html'), '<!doctype html>new');
  assert.ok(!fs.existsSync(path.join(site, 'assets', 'index-old.js')));
  assert.equal(read(site, 'projects', 'forgeloop', 'index.html'), 'demo drop');
  assert.equal(read(site, 'projects', 'harish-ops-colony', 'app', 'status.json'), '{"sample":true}');
  assert.equal(read(site, 'life', 'index.html'), 'life');
});

test('a projects folder in the build never overwrites site/projects', () => {
  const { dist, site, preview } = fixture({ distProjects: true });
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(site, 'projects', 'forgeloop', 'index.html'), 'demo drop');
});

test('preview gets the build plus life and projects', () => {
  const { dist, site, preview } = fixture();
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(preview, 'index.html'), '<!doctype html>new');
  assert.equal(read(preview, 'life', 'index.html'), 'life');
  assert.equal(read(preview, 'projects', 'forgeloop', 'index.html'), 'demo drop');
});

const FONT = Buffer.from([0x77, 0x4f, 0x46, 0x32, 0, 1, 2, 250, 251, 252]);
const b64 = (buf) => buf.toString('base64').replace(/.{76}/g, '$&\n') + '\n';

/** fixture() plus hand-managed asset subfolders, build extras and a few committed files. */
function fullFixture() {
  const f = fixture();
  write(path.join(f.site, 'assets', 'court', 'hdri', 'court.hdr.b64'), 'aGRy\n');
  write(path.join(f.site, 'assets', 'old-font-AAAA.woff2.b64'), 'b2xk\n');
  write(path.join(f.dist, 'assets', 'font-BBBB.woff2'), FONT);
  write(path.join(f.dist, 'favicon.svg'), '<svg/>\n');
  write(path.join(f.dist, 'robots.txt'), 'User-agent: *\n');
  write(path.join(f.dist, 'media', 'about', 'README.txt'), 'photos go here\n');
  return f;
}

test('hand-managed asset subfolders survive the sync', () => {
  const { dist, site, preview } = fullFixture();
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(site, 'assets', 'court', 'hdri', 'court.hdr.b64'), 'aGRy\n');
});

test('top-level asset files from older builds are removed', () => {
  const { dist, site, preview } = fullFixture();
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.ok(!fs.existsSync(path.join(site, 'assets', 'index-old.js')));
  assert.ok(!fs.existsSync(path.join(site, 'assets', 'old-font-AAAA.woff2.b64')));
  assert.equal(read(site, 'assets', 'index-new.js'), 'new');
});

test('binary build files are committed as wrapped .b64 that decodes to the same bytes', () => {
  const { dist, site, preview } = fullFixture();
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.ok(!fs.existsSync(path.join(site, 'assets', 'font-BBBB.woff2')));
  const text = read(site, 'assets', 'font-BBBB.woff2.b64');
  assert.ok(text.split('\n').every((l) => l.length <= 76));
  assert.deepEqual(Buffer.from(text, 'base64'), FONT);
});

test('text build extras are copied as they are', () => {
  const { dist, site, preview } = fullFixture();
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(site, 'favicon.svg'), '<svg/>\n');
  assert.equal(read(site, 'robots.txt'), 'User-agent: *\n');
  assert.equal(read(site, 'media', 'about', 'README.txt'), 'photos go here\n');
});

test('files whose content is unchanged are left byte for byte, whatever their line endings', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(site, 'CNAME'), 'harishkumartn.in\r\n');
  write(path.join(site, 'robots.txt'), 'User-agent: *\r\n');
  write(path.join(site, 'assets', 'font-BBBB.woff2.b64'), b64(FONT).replace(/\n/g, '\r\n'));
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(site, 'CNAME'), 'harishkumartn.in\r\n');
  assert.equal(read(site, 'robots.txt'), 'User-agent: *\r\n');
  assert.equal(read(site, 'assets', 'font-BBBB.woff2.b64'), b64(FONT).replace(/\n/g, '\r\n'));
});

test('sync does not create site/.nojekyll (the deploy adds it)', () => {
  const { dist, site, preview } = fullFixture();
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.ok(!fs.existsSync(path.join(site, '.nojekyll')));
});

test('sync throws when a chunk reachable from index.html is missing', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(dist, 'index.html'), '<script type="module" src="/assets/index-NEWW1234.js"></script>');
  write(path.join(dist, 'assets', 'index-NEWW1234.js'), 'import("./Lazy-CCCC1234.js")');
  assert.throws(() => syncSite({ distDir: dist, siteDir: site, previewDir: preview }), /Lazy-CCCC1234\.js/);
});

test('sync passes when every reachable chunk exists', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(dist, 'index.html'), '<script type="module" src="/assets/index-NEWW1234.js"></script>');
  write(path.join(dist, 'assets', 'index-NEWW1234.js'), 'import("./Lazy-CCCC1234.js")');
  write(path.join(dist, 'assets', 'Lazy-CCCC1234.js'), 'export default 1');
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(site, 'assets', 'Lazy-CCCC1234.js'), 'export default 1');
});

test('sync throws instead of exiting when the build is missing', () => {
  const { site, preview } = fixture();
  assert.throws(() => syncSite({ distDir: path.join(site, 'nope'), siteDir: site, previewDir: preview }), /npm run build/);
});

test('the CNAME from public/ is left to the CNAME step, never written as CNAME.b64', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(dist, 'CNAME'), 'harishkumartn.in\n');
  write(path.join(site, 'CNAME'), 'harishkumartn.in\r\n');
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.ok(!fs.existsSync(path.join(site, 'CNAME.b64')));
  assert.equal(read(site, 'CNAME'), 'harishkumartn.in\r\n');
});

test('a library string that only looks like a chunk name does not fail the sync', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(dist, 'index.html'), '<script type="module" src="/assets/index-NEWW1234.js"></script>');
  write(path.join(dist, 'assets', 'index-NEWW1234.js'), 'const lib = "three-mesh-bvh.js"; import("./Lazy-CCCC1234.js")');
  write(path.join(dist, 'assets', 'Lazy-CCCC1234.js'), 'export default 1');
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
});

test('chunk references through __vite__mapDeps (assets/X.js) are followed', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(dist, 'index.html'), '<script type="module" src="/assets/index-NEWW1234.js"></script>');
  write(path.join(dist, 'assets', 'index-NEWW1234.js'), 'const m = ["assets/Gone-DDDD1234.js"]');
  assert.throws(() => syncSite({ distDir: dist, siteDir: site, previewDir: preview }), /Gone-DDDD1234\.js/);
});

test('extensionless and common text files are copied as text, not .b64', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(dist, '_redirects'), '/old /new\n');
  write(path.join(dist, 'notes.md'), '# hi\n');
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(site, '_redirects'), '/old /new\n');
  assert.equal(read(site, 'notes.md'), '# hi\n');
  assert.ok(!fs.existsSync(path.join(site, '_redirects.b64')));
});

test('a life folder in the build never overwrites site/life', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(dist, 'life', 'index.html'), 'clobber');
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(site, 'life', 'index.html'), 'life');
});

test('the chunk check also walks other HTML entries such as social/index.html', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(dist, 'index.html'), '<script type="module" src="/assets/index-NEWW1234.js"></script>');
  write(path.join(dist, 'assets', 'index-NEWW1234.js'), 'export {}');
  write(path.join(dist, 'social', 'index.html'), '<script type="module" src="/assets/social-SSSS1234.js"></script>');
  assert.throws(() => syncSite({ distDir: dist, siteDir: site, previewDir: preview }), /social-SSSS1234\.js/);
  write(path.join(dist, 'assets', 'social-SSSS1234.js'), 'import("./Feed-FFFF1234.js")');
  write(path.join(dist, 'assets', 'Feed-FFFF1234.js'), 'export {}');
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
  assert.equal(read(site, 'social', 'index.html'), '<script type="module" src="/assets/social-SSSS1234.js"></script>');
});

test('the chunk check skips the protected folders, which have their own scripts', () => {
  const { dist, site, preview } = fullFixture();
  write(path.join(site, 'life', 'index.html'), '<script src="./assets/whatever-ZZZZ1234.js"></script>');
  syncSite({ distDir: dist, siteDir: site, previewDir: preview });
});
