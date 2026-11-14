#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Folders in site/ that the build never writes. life/ is the Life Graph app;
 * projects/ holds generated project pages (scripts/project-pages.mjs) and demo drops.
 */
export const PROTECTED_DIRS = ['life', 'projects'];

/** path -> sha256 for every file under dir ({} if dir is missing). */
function snapshot(dir) {
  const out = {};
  if (!fs.existsSync(dir)) return out;
  for (const rel of fs.readdirSync(dir, { recursive: true })) {
    const file = path.join(dir, rel);
    if (fs.statSync(file).isFile()) out[rel] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  return out;
}

function changedFiles(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((k) => before[k] !== after[k]);
}

/**
 * Copies a fresh Vite build (distDir) into siteDir and stages previewDir.
 * Wipes site/assets/ so stale hashed chunks cannot pile up, never writes the
 * protected folders and throws if any of them changed.
 */
export function syncSite({ distDir, siteDir, previewDir, log = () => {} }) {
  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    throw new Error(`${distDir}/index.html does not exist. Run npm run build first.`);
  }
  const distAssetsDir = path.join(distDir, 'assets');
  if (!fs.existsSync(distAssetsDir)) throw new Error(`${distAssetsDir} does not exist.`);
  if (!fs.existsSync(path.join(siteDir, 'life', 'index.html'))) {
    throw new Error('Protected site/life/ application is missing.');
  }

  const before = Object.fromEntries(PROTECTED_DIRS.map((d) => [d, snapshot(path.join(siteDir, d))]));

  // 1. Replace site/assets/ with the fresh build's assets.
  const siteAssetsDir = path.join(siteDir, 'assets');
  fs.rmSync(siteAssetsDir, { recursive: true, force: true });
  fs.cpSync(distAssetsDir, siteAssetsDir, { recursive: true });

  // 2. Copy root entries from dist/, skipping assets and the protected folders.
  const skip = new Set(['assets', ...PROTECTED_DIRS]);
  const rootEntries = fs.readdirSync(distDir).filter((item) => !skip.has(item));
  for (const item of rootEntries) {
    fs.cpSync(path.join(distDir, item), path.join(siteDir, item), { recursive: true });
  }
  fs.writeFileSync(path.join(siteDir, 'CNAME'), 'harishkumartn.in\n');
  const nojekyll = path.join(siteDir, '.nojekyll');
  if (!fs.existsSync(nojekyll)) fs.writeFileSync(nojekyll, '');
  log(`site/ updated: ${rootEntries.length} root entries, assets replaced.`);

  // 3. Rebuild preview/ from the build plus the protected folders from site/.
  fs.rmSync(previewDir, { recursive: true, force: true });
  fs.mkdirSync(previewDir, { recursive: true });
  for (const item of fs.readdirSync(distDir).filter((i) => !PROTECTED_DIRS.includes(i))) {
    fs.cpSync(path.join(distDir, item), path.join(previewDir, item), { recursive: true });
  }
  for (const d of PROTECTED_DIRS) {
    const src = path.join(siteDir, d);
    if (fs.existsSync(src)) fs.cpSync(src, path.join(previewDir, d), { recursive: true });
  }
  log('preview/ staged with life/ and projects/.');

  // 4. Post-sync checks.
  for (const d of PROTECTED_DIRS) {
    const changed = changedFiles(before[d], snapshot(path.join(siteDir, d)));
    if (changed.length) throw new Error(`site/${d}/ changed during sync: ${changed.slice(0, 5).join(', ')}`);
  }
  if (fs.readFileSync(path.join(siteDir, 'CNAME'), 'utf8').trim() !== 'harishkumartn.in') {
    throw new Error('site/CNAME is missing or invalid.');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const repoRoot = path.resolve(webDir, '..');
  try {
    syncSite({
      distDir: path.join(webDir, 'dist'),
      siteDir: path.join(repoRoot, 'site'),
      previewDir: path.join(repoRoot, 'preview'),
      log: (m) => console.log(`[sync-site] ${m}`),
    });
    console.log('[sync-site] Done: site/life/ and site/projects/ unchanged, CNAME verified, preview staged.');
  } catch (err) {
    console.error(`[sync-site] Error: ${err.message}`);
    process.exit(1);
  }
}
