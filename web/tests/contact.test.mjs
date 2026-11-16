import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { contact } from '../src/content.ts';

const SOCIALS = {
  linkedin: 'https://www.linkedin.com/in/harish-kumar-tn/',
  instagram: 'https://www.instagram.com/harish_kumar_tn/',
  x: 'https://x.com/harish_kumar_tn',
  youtube: 'https://www.youtube.com/@harishkumar_tn',
};

test('contact lists email first, then LinkedIn, Instagram, X and YouTube', () => {
  assert.deepEqual(contact.links.map((l) => l.icon), ['mail', 'linkedin', 'instagram', 'x', 'youtube']);
  assert.equal(contact.links[0].href, 'mailto:hello.harishkumartn@gmail.com');
});

test('each social links to the right profile', () => {
  for (const [icon, href] of Object.entries(SOCIALS)) {
    assert.equal(contact.links.find((l) => l.icon === icon)?.href, href, icon);
  }
});

test('every web link is https and every card has a label and display text', () => {
  for (const l of contact.links) {
    if (!l.href.startsWith('mailto:')) assert.match(l.href, /^https:\/\//, l.label);
    assert.ok(l.label.trim() && l.display.trim(), l.href);
  }
});

test('the noscript fallback links every social too', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/)[1];
  for (const href of Object.values(SOCIALS)) assert.ok(noscript.includes(`href="${href}"`), href);
});
