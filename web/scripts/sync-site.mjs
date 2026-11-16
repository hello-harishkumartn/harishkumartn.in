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

/** Extensions copied as they are; every other build file is a binary and is committed as <name>.b64. */
const TEXT_EXT = new Set([
  '', '.html', '.js', '.mjs', '.css', '.map', '.svg', '.json', '.txt', '.xml', '.webmanifest', '.md', '.yml', '.yaml', '.csv',
]);
const isText = (file) => TEXT_EXT.has(path.extname(file).toLowerCase());
const sameText = (a, b) => a.replace(/\r\n/g, '\n') === b.replace(/\r\n/g, '\n');

/**
 * Writes one build file into site/, the way the deploy expects it: text as is, binaries as
 * wrapped base64 in <name>.b64 (the workflow decodes them). Leaves the target alone when its
 * content already matches, so line endings in the working copy never show up as changes.
 * Returns the site path it owns.
 */
function writeBuildFile(src, dest) {
  const bytes = fs.readFileSync(src);
  if (isText(src)) {
    if (!(fs.existsSync(dest) && sameText(fs.readFileSync(dest, 'utf8'), bytes.toString('utf8')))) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, bytes);
    }
    return dest;
  }
  const target = `${dest}.b64`;
  if (!(fs.existsSync(target) && Buffer.from(fs.readFileSync(target, 'utf8'), 'base64').equals(bytes))) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes.toString('base64').replace(/.{76}/g, '$&\n') + '\n');
  }
  return target;
}

/** Every file under dir, as paths relative to dir. */
const filesUnder = (dir) =>
  fs.readdirSync(dir, { recursive: true }).filter((rel) => fs.statSync(path.join(dir, rel)).isFile());

/**
 * Follows imports from index.html through site/assets/ and returns the chunk names that are
 * referenced but missing. Catches a sync that left the page pointing at chunks it did not write.
 */
export function missingChunks(siteDir) {
  const assets = path.join(siteDir, 'assets');
  // Only real chunk references: "./X.js" between chunks, "/assets/X.js" in index.html and
  // "assets/X.js" in __vite__mapDeps. Bare names inside library code are ignored.
  const re = /(?:\.\/|assets\/)([A-Za-z0-9_.-]+\.(?:js|css))\b/g;
  const refs = (text) => [...text.matchAll(re)].map((m) => m[1]);
  const seen = new Set();
  const missing = new Set();
  const queue = refs(fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8'));
  while (queue.length) {
    const name = queue.pop();
    if (seen.has(name)) continue;
    seen.add(name);
    const file = path.join(assets, name);
    if (!fs.existsSync(file)) { missing.add(name); continue; }
    if (name.endsWith('.js')) queue.push(...refs(fs.readFileSync(file, 'utf8')));
  }
  return [...missing].sort();
}

/**
 * Copies a fresh Vite build (distDir) into siteDir and stages previewDir.
 * The top level of site/assets/ belongs to the build: files there from older builds are removed so
 * stale hashed chunks cannot pile up. Subfolders of site/assets/ (hand-managed .b64 models, HDRIs
 * and textures) are never deleted. Never writes the protected folders and throws if any changed,
 * or if index.html can reach a chunk that does not exist.
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

  // 1. Write every build file except the protected folders and CNAME (step 3 owns it),
  //    text as is and binaries as .b64.
  const siteAssetsDir = path.join(siteDir, 'assets');
  const written = new Set();
  const buildFiles = filesUnder(distDir).filter(
    (rel) => rel !== 'CNAME' && !PROTECTED_DIRS.includes(rel.split(path.sep)[0]),
  );
  for (const rel of buildFiles) written.add(writeBuildFile(path.join(distDir, rel), path.join(siteDir, rel)));

  // 2. Remove top-level files in site/assets/ that this build did not write. Subfolders stay.
  let removed = 0;
  if (fs.existsSync(siteAssetsDir)) {
    for (const entry of fs.readdirSync(siteAssetsDir, { withFileTypes: true })) {
      const file = path.join(siteAssetsDir, entry.name);
      if (entry.isFile() && !written.has(file)) { fs.rmSync(file); removed += 1; }
    }
  }

  // 3. CNAME: written only when its content is wrong, so line endings never show as a change.
  const cname = path.join(siteDir, 'CNAME');
  if (!fs.existsSync(cname) || fs.readFileSync(cname, 'utf8').trim() !== 'harishkumartn.in') {
    fs.writeFileSync(cname, 'harishkumartn.in\n');
  }
  log(`site/ updated: ${buildFiles.length} build files checked, ${removed} stale asset files removed.`);

  // 4. Rebuild preview/ from the build plus the protected folders from site/.
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

  // 5. Post-sync checks.
  for (const d of PROTECTED_DIRS) {
    const changed = changedFiles(before[d], snapshot(path.join(siteDir, d)));
    if (changed.length) throw new Error(`site/${d}/ changed during sync: ${changed.slice(0, 5).join(', ')}`);
  }
  if (fs.readFileSync(path.join(siteDir, 'CNAME'), 'utf8').trim() !== 'harishkumartn.in') {
    throw new Error('site/CNAME is missing or invalid.');
  }
  const missing = missingChunks(siteDir);
  if (missing.length) throw new Error(`site/index.html reaches chunks that do not exist: ${missing.join(', ')}`);
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
