#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webDir, '..');
const distDir = path.join(webDir, 'dist');
const siteDir = path.join(repoRoot, 'site');
const previewDir = path.join(repoRoot, 'preview');
const lifeDir = path.join(siteDir, 'life');

console.log('[sync-site] Starting safe site synchronization...');

// 1. Pre-sync assertions
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('[sync-site] Error: web/dist/index.html does not exist. Run npm run build first.');
  process.exit(1);
}

if (!fs.existsSync(lifeDir) || !fs.existsSync(path.join(lifeDir, 'index.html'))) {
  console.error('[sync-site] Error: Protected site/life/ application is missing.');
  process.exit(1);
}

const preLifeIndexStat = fs.statSync(path.join(lifeDir, 'index.html'));
console.log(`[sync-site] Pre-check passed: site/life/ is intact (index.html size: ${preLifeIndexStat.size} bytes).`);

// 2. Clean and synchronize site/assets/
const siteAssetsDir = path.join(siteDir, 'assets');
const distAssetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distAssetsDir)) {
  console.error('[sync-site] Error: web/dist/assets/ does not exist.');
  process.exit(1);
}

let prunedCount = 0;
if (fs.existsSync(siteAssetsDir)) {
  const existingAssets = fs.readdirSync(siteAssetsDir);
  for (const file of existingAssets) {
    fs.rmSync(path.join(siteAssetsDir, file), { recursive: true, force: true });
    prunedCount++;
  }
} else {
  fs.mkdirSync(siteAssetsDir, { recursive: true });
}

const newAssets = fs.readdirSync(distAssetsDir);
for (const file of newAssets) {
  fs.cpSync(path.join(distAssetsDir, file), path.join(siteAssetsDir, file), { recursive: true });
}
console.log(`[sync-site] Ephemeral assets reconciled: pruned ${prunedCount} old files, wrote ${newAssets.length} fresh assets.`);

// 3. Copy root entry files from web/dist/ into site/ (strictly preserving site/life/)
const distEntries = fs.readdirSync(distDir);
let rootCopiedCount = 0;
for (const item of distEntries) {
  if (item === 'assets' || item === 'life') continue;
  const srcPath = path.join(distDir, item);
  const destPath = path.join(siteDir, item);
  const stat = fs.statSync(srcPath);
  if (stat.isFile()) {
    fs.copyFileSync(srcPath, destPath);
    rootCopiedCount++;
  } else if (stat.isDirectory()) {
    fs.cpSync(srcPath, destPath, { recursive: true });
    rootCopiedCount++;
  }
}

// Ensure CNAME and .nojekyll in site/
const cnamePath = path.join(siteDir, 'CNAME');
fs.writeFileSync(cnamePath, 'harishkumartn.in\n');
const nojekyllPath = path.join(siteDir, '.nojekyll');
if (!fs.existsSync(nojekyllPath)) {
  fs.writeFileSync(nojekyllPath, '');
}

console.log(`[sync-site] Root files synchronized: updated ${rootCopiedCount} items in site/.`);

// 4. Synchronize preview/ tree (including preview/life/)
// Wipe first so leftover hashed chunks from earlier builds cannot accumulate.
if (fs.existsSync(previewDir)) {
  fs.rmSync(previewDir, { recursive: true, force: true });
}
fs.mkdirSync(previewDir, { recursive: true });
fs.cpSync(distDir, previewDir, { recursive: true });
const previewLifeDir = path.join(previewDir, 'life');
fs.cpSync(lifeDir, previewLifeDir, { recursive: true });
console.log('[sync-site] Local preview tree synchronized under preview/ (including Life Graph preview).');

// 5. Post-sync boundary assertions
if (!fs.existsSync(path.join(lifeDir, 'index.html'))) {
  console.error('[sync-site] FATAL: site/life/index.html was removed during sync!');
  process.exit(1);
}

const postLifeIndexStat = fs.statSync(path.join(lifeDir, 'index.html'));
if (postLifeIndexStat.size !== preLifeIndexStat.size) {
  console.error('[sync-site] FATAL: site/life/index.html size changed unexpectedly!');
  process.exit(1);
}

if (!fs.existsSync(path.join(siteDir, 'CNAME')) || fs.readFileSync(path.join(siteDir, 'CNAME'), 'utf8').trim() !== 'harishkumartn.in') {
  console.error('[sync-site] FATAL: site/CNAME is missing or invalid!');
  process.exit(1);
}

if (!fs.existsSync(nojekyllPath)) {
  console.error('[sync-site] FATAL: site/.nojekyll is missing!');
  process.exit(1);
}

if (!fs.existsSync(path.join(previewDir, 'index.html')) || !fs.existsSync(path.join(previewDir, 'life', 'index.html'))) {
  console.error('[sync-site] FATAL: preview tree is incomplete!');
  process.exit(1);
}

console.log('[sync-site] Post-sync verification passed: site/life/ is intact, site/CNAME verified and preview staged.');
console.log('[sync-site] Synchronization completed successfully.');
