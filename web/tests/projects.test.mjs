import test from 'node:test';
import assert from 'node:assert/strict';
import { projects, projectsSection } from '../src/projects.ts';

const SLUGS = ['forgeloop', 'recallx', 'complyai', 'sentinelx', 'agentmesh', 'harish-agents-map', 'harish-ops-colony', 'autocolor'];
const REPOS = {
  forgeloop: 'autonomous-agent-harness',
  recallx: 'enterprise-knowledge-ai',
  complyai: 'agentic-compliance-auditor',
  sentinelx: 'autonomous-incident-response',
  agentmesh: 'multi-agent-control',
  'harish-agents-map': 'harish-agents-map',
  'harish-ops-colony': 'harish-ops-colony',
  autocolor: 'autocolor',
};

test('lists exactly the 8 public projects in order', () => {
  assert.deepEqual(projects.map((p) => p.slug), SLUGS);
});

test('slugs are unique, lowercase and url safe', () => {
  const slugs = projects.map((p) => p.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const s of slugs) assert.match(s, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('every Open link is /projects/<slug>/', () => {
  for (const p of projects) assert.equal(p.href, `/projects/${p.slug}/`);
});

test('every entry links its public GitHub repo', () => {
  for (const p of projects) assert.equal(p.codeUrl, `https://github.com/hello-harishkumartn/${REPOS[p.slug]}`, p.slug);
});

test('each card has a title, a one line description and tags', () => {
  for (const p of projects) {
    assert.ok(p.title.length > 0);
    assert.ok(p.description.length > 20 && p.description.length <= 140, `${p.slug}: ${p.description.length}`);
    assert.ok(p.tags.length >= 2 && p.tags.length <= 6, p.slug);
  }
});

test('visible copy has no em or en dashes and no Oxford comma', () => {
  const text = JSON.stringify({ projects, projectsSection });
  assert.doesNotMatch(text, /[–—]/);
  assert.doesNotMatch(text, /, (and|or) /);
});

test('only AutoColor hosts its app at its project page', () => {
  assert.deepEqual(projects.filter((p) => p.appPage).map((p) => p.slug), ['autocolor']);
});

test('every project has a working app link and local ones exist in site/', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const siteDir = path.resolve(fileURLToPath(import.meta.url), '../../../site');
  for (const p of projects) {
    assert.ok(p.demoUrl, p.slug);
    if (p.demoUrl.startsWith('/')) assert.ok(fs.existsSync(path.join(siteDir, p.demoUrl, 'index.html')), p.demoUrl);
    else assert.match(p.demoUrl, /^https:\/\/hello-harishkumartn\.github\.io\//, p.slug);
  }
});
