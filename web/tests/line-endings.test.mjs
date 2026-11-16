import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The deploy decodes *.b64 with base64 -d and tests compare generated files byte for byte,
// so every checkout (Windows included) must have LF line endings.
const root = fileURLToPath(new URL('..', new URL('..', import.meta.url)));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });

test('.gitattributes pins LF for text files whatever core.autocrlf says', () => {
  for (const file of ['site/index.html', 'site/assets/court/hdri/squash_court_1k.hdr.b64', 'web/scripts/sync-site.mjs', 'site/CNAME']) {
    assert.match(git('check-attr', 'eol', '--', file), /eol: lf$/m, file);
  }
});

test('no file is stored in git with CR line endings', () => {
  // i/-text: git saw a stray CR and stored the file raw (how site/index.html once got CRLF in).
  const bad = git('ls-files', '--eol', '--stage').split('\n').filter((l) => /\bi\/(crlf|mixed|-text)\b/.test(l));
  assert.deepEqual(bad, []);
});

test('no tracked file is checked out with CRLF', () => {
  const crlf = git('ls-files', '--eol').split('\n').filter((l) => /\bw\/(crlf|mixed)\b/.test(l));
  assert.deepEqual(crlf, []);
});
