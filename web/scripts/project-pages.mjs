#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/projects.ts';

/**
 * Renders the static /projects/ pages from src/projects.ts and writes them into site/projects/.
 * Pages carry MARKER; an existing index.html without it (a demo drop) is never overwritten.
 * Projects with appPage set host their app at /projects/<slug>/, so no page is rendered for them.
 */
export const MARKER = '<meta name="generator" content="project-pages">';

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const CSS = `:root {
  color-scheme: dark;
  --bg: #0d0b09;
  --card: #17130f;
  --line: #2a241d;
  --fg: #f5efe6;
  --muted: #b3a89a;
  --accent: #fb923c;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font: 17px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
main { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
a { color: var(--accent); text-underline-offset: 3px; }
a:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }
.back { display: inline-block; margin-bottom: 2rem; color: var(--muted); }
.kicker { margin: 0; color: var(--accent); font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; }
h1 { margin: 0.3rem 0 0.75rem; font-size: clamp(2rem, 6vw, 2.75rem); line-height: 1.1; }
h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
.lead, .muted { color: var(--muted); }
.tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1.25rem 0; padding: 0; list-style: none; }
.tags li { padding: 0.15rem 0.7rem; border: 1px solid var(--line); border-radius: 999px; font-size: 0.85rem; color: var(--muted); }
.actions { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 1.5rem 0; padding: 0; list-style: none; }
.button { display: inline-block; padding: 0.55rem 1.1rem; border: 1px solid var(--accent); border-radius: 999px; text-decoration: none; font-weight: 600; }
.note { margin: 1.5rem 0; padding: 1rem 1.25rem; border: 1px solid var(--line); border-radius: 12px; background: var(--card); }
.cards { display: grid; gap: 1rem; margin: 2rem 0 0; padding: 0; list-style: none; }
.cards li { padding: 1.25rem; border: 1px solid var(--line); border-radius: 14px; background: var(--card); }
.cards p { margin: 0.25rem 0 0; }
`;

function layout({ title, description, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${MARKER}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="stylesheet" href="/projects/projects.css">
</head>
<body>
<main>
<a class="back" href="/#projects">Back to harishkumartn.in</a>
${body}
</main>
</body>
</html>
`;
}

function projectPage(p) {
  const tags = p.tags.map((t) => `<li>${esc(t)}</li>`).join('');
  const extra = (p.links ?? [])
    .map((l) => `<li><a class="button" href="${esc(l.href)}">${esc(l.label)}</a>${l.note ? ` <span class="muted">${esc(l.note)}</span>` : ''}</li>`)
    .join('\n');
  return layout({
    title: `${p.title} | Harish Kumar T N`,
    description: p.description,
    body: `<p class="kicker">Project</p>
<h1>${esc(p.title)}</h1>
<p class="lead">${esc(p.description)}</p>
<ul class="tags" aria-label="Tech stack">${tags}</ul>
<ul class="actions">
<li><a class="button" href="${esc(p.codeUrl)}">Code on GitHub</a></li>
${extra}
</ul>${p.demoUrl ? '' : '\n<p class="note">Live demo coming soon.</p>'}`,
  });
}

function indexPage() {
  const cards = projects
    .map((p) => `<li><h2><a href="${p.href}">${esc(p.title)}</a></h2><p class="muted">${esc(p.description)}</p></li>`)
    .join('\n');
  return layout({
    title: 'Projects | Harish Kumar T N',
    description: 'Projects built by Harish Kumar T N.',
    body: `<p class="kicker">Projects</p>
<h1>Things I've built</h1>
<p class="lead">Agent systems, 3D dashboards and browser tools. Every project is open source on GitHub.</p>
<ul class="cards">
${cards}
</ul>`,
  });
}

/** relative path under projects/ -> file body */
export function renderPages() {
  const out = { 'index.html': indexPage(), 'projects.css': CSS };
  for (const p of projects) if (!p.appPage) out[`${p.slug}/index.html`] = projectPage(p);
  return out;
}

/** Writes the pages into <siteDir>/projects, skipping any index.html this script did not generate. */
export function writeProjectPages(siteDir, log = () => {}) {
  for (const [rel, body] of Object.entries(renderPages())) {
    const file = path.join(siteDir, 'projects', rel);
    if (rel.endsWith('.html') && fs.existsSync(file) && !fs.readFileSync(file, 'utf8').includes(MARKER)) {
      log(`skipped ${rel} (not generated here)`);
      continue;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, body);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const siteDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../site');
  writeProjectPages(siteDir, (m) => console.log(`[project-pages] ${m}`));
  console.log('[project-pages] Done.');
}
