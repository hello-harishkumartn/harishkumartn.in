import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { brandIcons } from '../src/lib/brandIcons.ts';
import { contact } from '../src/content.ts';

const BRANDS = ['linkedin', 'instagram', 'x', 'youtube'];

test('has an official mark for LinkedIn, Instagram, X and YouTube', () => {
  assert.deepEqual(Object.keys(brandIcons).sort(), [...BRANDS].sort());
});

test('each mark is a single 24x24 SVG path with a title', () => {
  for (const [key, icon] of Object.entries(brandIcons)) {
    assert.ok(icon.title.trim(), key);
    assert.match(icon.path, /^M[0-9MmZzLlHhVvCcSsQqTtAa.,\s-]+$/, key);
    assert.ok(icon.path.length > 40, key);
  }
});

test('every social contact link has a brand mark', () => {
  for (const l of contact.links) if (l.icon !== 'mail') assert.ok(brandIcons[l.icon], l.icon);
});

test('Contact renders brand marks instead of generic lucide icons', () => {
  const src = fs.readFileSync(new URL('../src/sections/Contact.tsx', import.meta.url), 'utf8');
  assert.match(src, /from '\.\.\/lib\/brandIcons'/);
  for (const generic of ['BriefcaseBusiness', 'Camera', 'AtSign', 'CirclePlay']) assert.ok(!src.includes(generic), generic);
});
