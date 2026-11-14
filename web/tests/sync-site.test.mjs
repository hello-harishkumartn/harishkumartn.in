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

test('sync throws instead of exiting when the build is missing', () => {
  const { site, preview } = fixture();
  assert.throws(() => syncSite({ distDir: path.join(site, 'nope'), siteDir: site, previewDir: preview }), /npm run build/);
});
