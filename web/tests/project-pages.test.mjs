import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/projects.ts';
import { MARKER, renderPages, writeProjectPages } from '../scripts/project-pages.mjs';

const siteDir = path.resolve(fileURLToPath(import.meta.url), '../../../site');
const pages = renderPages();
const page = (slug) => pages[`${slug}/index.html`];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

test('renders the index, the stylesheet and one page per project without its own app page', () => {
  const paged = projects.filter((p) => !p.appPage);
  assert.deepEqual(Object.keys(pages).sort(), ['index.html', 'projects.css', ...paged.map((p) => `${p.slug}/index.html`)].sort());
});

test('committed site/projects pages exist and are up to date (run npm run pages)', () => {
  for (const [rel, body] of Object.entries(pages)) {
    const file = path.join(siteDir, 'projects', rel);
    assert.ok(fs.existsSync(file), rel);
    assert.equal(fs.readFileSync(file, 'utf8'), body, rel);
  }
});

test('every project page has its Code link, tags and a coming soon note', () => {
  for (const p of projects.filter((q) => !q.appPage)) {
    const html = page(p.slug);
    assert.match(html, new RegExp(`<a [^>]*href="${esc(p.codeUrl)}"[^>]*>Code`), p.slug);
    assert.match(html, /Live demo coming soon/, p.slug);
    assert.match(html, new RegExp(`<h1>${esc(p.title)}</h1>`), p.slug);
    for (const t of p.tags) assert.ok(html.includes(`<li>${t}</li>`), `${p.slug} ${t}`);
    assert.doesNotMatch(html, /<iframe|<script/, p.slug);
  }
});

test('every html page has lang, a title, the stylesheet and a back link', () => {
  for (const [rel, body] of Object.entries(pages)) {
    if (!rel.endsWith('.html')) continue;
    assert.match(body, /<html lang="en">/, rel);
    assert.match(body, /<title>[^<]+<\/title>/, rel);
    assert.match(body, /href="\/projects\/projects\.css"/, rel);
    assert.match(body, /<a [^>]*href="\/#projects"[^>]*>Back to harishkumartn\.in<\/a>/, rel);
  }
});

test('the index links all 8 projects', () => {
  for (const p of projects) assert.match(pages['index.html'], new RegExp(`href="/projects/${p.slug}/"`));
  assert.equal(pages['index.html'].match(/href="\/projects\/[a-z0-9-]+\/"/g).length, 8);
});

test('the agents map page links its live app', () => {
  assert.match(page('harish-agents-map'), /href="https:\/\/hello-harishkumartn\.github\.io\/harish-agents-map\/"/);
});

test('the ops colony page links the app sample and says it is sample data', () => {
  const html = page('harish-ops-colony');
  assert.match(html, /href="app\/"/);
  assert.match(html, /Sample data/);
});

test('writing never overwrites a page it did not generate', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-'));
  fs.mkdirSync(path.join(dir, 'projects', 'forgeloop'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'projects', 'forgeloop', 'index.html'), 'demo drop');
  writeProjectPages(dir);
  assert.equal(fs.readFileSync(path.join(dir, 'projects', 'forgeloop', 'index.html'), 'utf8'), 'demo drop');
  assert.equal(fs.readFileSync(path.join(dir, 'projects', 'recallx', 'index.html'), 'utf8'), page('recallx'));
  writeProjectPages(dir);
  assert.equal(fs.readFileSync(path.join(dir, 'projects', 'recallx', 'index.html'), 'utf8'), page('recallx'));
});

test('page copy has no em or en dashes and no Oxford comma', () => {
  for (const [rel, body] of Object.entries(pages)) {
    const text = body.replace(/<[^>]+>/g, ' ');
    assert.doesNotMatch(text, /[–—]/, rel);
    assert.doesNotMatch(text, /, (and|or) /, rel);
  }
});

test('the AutoColor app is committed at its project page and the generator leaves it alone', () => {
  const file = path.join(siteDir, 'projects', 'autocolor', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(html, new RegExp(MARKER), 'the app must not carry the generator marker');
  assert.match(html, /<title>AutoColor/);
  for (const f of ['app.js', 'worker.js', 'engine.js', 'config.js', 'engine.wasm.b64', 'licenses/NOTICE']) assert.ok(fs.existsSync(path.join(siteDir, 'projects', 'autocolor', f)), f);
  assert.ok(!fs.existsSync(path.join(siteDir, 'projects', 'autocolor', 'engine.wasm')), 'only the .b64 is committed');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-'));
  fs.mkdirSync(path.join(dir, 'projects', 'autocolor'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'projects', 'autocolor', 'index.html'), 'the app');
  writeProjectPages(dir);
  assert.equal(fs.readFileSync(path.join(dir, 'projects', 'autocolor', 'index.html'), 'utf8'), 'the app');
});
