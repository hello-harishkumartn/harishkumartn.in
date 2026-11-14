import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = path.resolve(fileURLToPath(import.meta.url), '../../../site/projects/harish-ops-colony/app');
const raw = () => fs.readFileSync(path.join(appDir, 'status.json'), 'utf8');

test('the colony app files are installed', () => {
  for (const f of ['index.html', 'colony.js', 'colony.part0.js', 'colony.part1.js', 'colony.part2.js', 'colony.part3.js', 'status.json']) {
    assert.ok(fs.existsSync(path.join(appDir, f)), f);
  }
});

test('sample status.json only has allowlisted keys', () => {
  const data = JSON.parse(raw());
  assert.deepEqual(Object.keys(data).sort(), ['activity', 'agentCount', 'desks', 'refreshedAt', 'routines', 'standalone', 'themeDefault']);
  const agentKeys = new Set(['id', 'name', 'short', 'status', 'next', 'detail', 'color', 'primary']);
  const agents = [...data.desks.flatMap((d) => d.agents), ...data.standalone];
  assert.ok(agents.length >= 8);
  for (const a of agents) for (const k of Object.keys(a)) assert.ok(agentKeys.has(k), k);
  for (const d of data.desks) assert.deepEqual(Object.keys(d).sort(), ['agents', 'color', 'id', 'label']);
  for (const r of data.routines) assert.deepEqual(Object.keys(r).sort(), ['id', 'name', 'schedule', 'status', 'tag']);
  for (const a of data.activity) assert.deepEqual(Object.keys(a).sort(), ['body', 'color', 'time']);
});

test('sample status.json has no money or personal data', () => {
  const text = raw().toLowerCase();
  for (const term of ['mudrex', 'usdt', 'balance', 'harish', 'abbu', 'whatsapp', 'calendar', 'drive', 'placement', 'trade', 'invest', '₹', '$', 'inr', 'rupee', 'doge', 'btc', '@']) {
    assert.ok(!text.includes(term), `found "${term}"`);
  }
  assert.match(text, /sample/);
});

test('the app shows "Sample data" instead of a balance chip', () => {
  const html = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
  assert.match(html, /id="mudrexChip">Sample data</);
  assert.doesNotMatch(fs.readFileSync(path.join(appDir, 'colony.part2.js'), 'utf8'), /'Mudrex —'/);
});
