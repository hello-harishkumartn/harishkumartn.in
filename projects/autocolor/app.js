// Page controller: input (files, drop, Drive), the ready list and Start, progress, result cards, downloads and the zip.
import { outputName, uniqueNames, classify, MESSAGES } from './names.js';
import { createQueue } from './queue.js';
import { createZip, crc32 } from './zip.js';
import * as config from './config.js';
import { driveState } from './drive-config.js';
import { createEngineClient } from './engine-client.js';

const $ = (s) => document.querySelector(s);
const phone = matchMedia('(pointer: coarse)').matches;
const engine = createEngineClient({ phone });
const results = [];

function summary(r) {
  const c = r.choice;
  const parts = [];
  if (c.exposure > 0) parts.push(`brightened by ${c.exposure.toFixed(1)} EV`);
  if (c.exposure < 0) parts.push(`darkened by ${(-c.exposure).toFixed(1)} EV`);
  if (c.shadows > 0) parts.push('shadows lifted');
  if (c.highlights < 0) parts.push('highlights recovered');
  if (c.black > 0 || c.white < 1) parts.push('black and white points set');
  if (c.contrast > 0) parts.push('contrast added');
  if (c.wb_strength >= 0.05) parts.push('colour cast reduced');
  if (c.vibrance > 0) parts.push('colours enriched');
  if (c.nr_luminance > 0) parts.push('noise reduced');
  if (!parts.length) return 'Looked good already, so it was left almost as it was.';
  const text = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  return `${text[0].toUpperCase()}${text.slice(1)}.`;
}

// per photo progress: the engine is one WASM call, so the bar moves in stage steps
const STAGES = {
  waiting: [0, 'Waiting'],
  downloading: [5, 'Downloading from Google Drive'],
  reading: [15, 'Reading'],
  correcting: [35, 'Analysing and correcting'],
  saving: [85, 'Saving'],
};

function setBar(bar, now, max, text) {
  bar.hidden = false;
  bar.max = max || 1;
  bar.value = max ? now : 0;
  bar.setAttribute('aria-valuetext', text);
}

function setStage(card, stage) {
  const [value, label] = STAGES[stage];
  card.querySelector('.state').textContent = label;
  setBar(card.querySelector('.bar'), value, 100, label);
}

function addCard(name) {
  const li = $('#card-template').content.firstElementChild.cloneNode(true);
  li.querySelector('.name').textContent = name;
  li.querySelector('.bar').setAttribute('aria-label', `Progress: ${name}`);
  $('#results').append(li);
  $('#results-section').hidden = false;
  return li;
}

/** A card that waits for Start, with a Remove button. */
function addReadyCard(job) {
  const card = (job.card = addCard(job.name));
  card.classList.add('ready');
  card.querySelector('.state').textContent = 'Ready';
  const remove = card.querySelector('.remove');
  remove.hidden = false;
  remove.setAttribute('aria-label', `Remove ${job.name}`);
  remove.addEventListener('click', () => {
    if (!queue.remove(job)) return;
    card.remove();
    $('#results-section').hidden = !$('#results').children.length;
    $('#start').focus();
  });
  return job;
}

function fail(card, message) {
  card.classList.add('failed');
  card.querySelector('.state').textContent = message;
  card.querySelector('.compare').remove();
  const bar = card.querySelector('.bar');
  if (!bar.hidden) setBar(bar, 100, 100, 'Failed');
}

function showResult(card, job, r) {
  const name = outputName(job.name);
  const compare = card.querySelector('.compare');
  const [after, before] = compare.querySelectorAll('img');
  after.src = URL.createObjectURL(r.after);
  before.src = URL.createObjectURL(r.before);
  after.alt = `${job.name} corrected`;
  before.alt = `${job.name} original`;
  compare.style.aspectRatio = `${r.w} / ${r.h}`;
  const range = compare.querySelector('input');
  range.setAttribute('aria-label', `Compare original and corrected: ${job.name}`);
  range.addEventListener('input', () => compare.style.setProperty('--pos', `${range.value}%`));
  card.querySelector('.state').textContent = `${summary(r.report)} ${r.w} x ${r.h}.`;
  setBar(card.querySelector('.bar'), 100, 100, 'Corrected');
  const a = card.querySelector('.download');
  a.href = URL.createObjectURL(r.out);
  a.download = name;
  a.hidden = false;
  a.setAttribute('aria-label', `Download ${name}`);
  card.dataset.path = r.report.path;
  card.classList.add('done');
}

let corrected = 0; // photos corrected in the current run
const photos = (n) => `${n} ${n === 1 ? 'photo' : 'photos'}`;

const queue = createQueue(
  async (job) => {
    if (job.drive) setStage(job.card, 'downloading');
    const blob = await job.getBlob();
    const r = await engine.correct(blob, job.kind, (stage) => setStage(job.card, stage));
    if (!r.ok) throw new Error(r.message);
    return r;
  },
  {
    onProgress: ({ done, total, state, ready }) => {
      $('#start').disabled = state !== 'ready';
      $('#clear').disabled = state === 'running' || state === 'paused';
      const overall = $('#overall');
      if (total) setBar(overall, done, total, `${done} of ${total} corrected`);
      else overall.hidden = true;
      const status = $('#status');
      if (state === 'running') status.textContent = `Correcting ${done + 1} of ${total}`;
      else if (state === 'done') status.textContent = `Done: ${corrected} of ${total} photos corrected`;
      else if (state === 'ready') status.textContent = `${total ? `Done: ${corrected} of ${total} photos corrected. ` : ''}${photos(ready)} ready. Press Start correcting.`;
      else if (state === 'empty') status.textContent = '';
    },
    onResult: async (job, r, error) => {
      if (error?.name === 'DriveAuthError') {
        driveRetry.push(job);
        job.card.querySelector('.state').textContent = 'Paused: reconnect Google Drive to continue';
        $('#reconnect').hidden = false;
        queue.pause();
        return;
      }
      if (error) return fail(job.card, error.message);
      const data = new Uint8Array(await r.out.arrayBuffer());
      results.push({ name: outputName(job.name), blob: r.out, crc: crc32(data), size: data.length });
      corrected++;
      showResult(job.card, job, r);
      $('#zip').disabled = false;
    },
  },
);

function addFiles(files) {
  const jobs = [];
  for (const file of files) {
    const kind = classify(file.name, file.type);
    if (kind === 'raw' || kind === 'unsupported') fail(addCard(file.name), MESSAGES[kind]);
    else jobs.push(addReadyCard({ name: file.name, kind, getBlob: async () => file }));
  }
  queue.add(jobs);
}

$('#start').addEventListener('click', () => {
  if (queue.state !== 'ready') return;
  corrected = 0;
  for (const card of document.querySelectorAll('#results .card.ready')) {
    card.classList.remove('ready');
    card.querySelector('.remove').hidden = true;
    setStage(card, 'waiting');
  }
  queue.start();
});

$('#pick').addEventListener('click', () => $('#file').click());
$('#file').addEventListener('change', (e) => {
  addFiles([...e.target.files]);
  e.target.value = '';
});
const drop = $('#drop');
['dragenter', 'dragover'].forEach((t) =>
  drop.addEventListener(t, (e) => {
    e.preventDefault();
    drop.classList.add('over');
  }),
);
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, () => drop.classList.remove('over')));
drop.addEventListener('drop', (e) => {
  e.preventDefault();
  addFiles([...e.dataTransfer.files]);
});

$('#zip').addEventListener('click', () => {
  const names = uniqueNames(results.map((r) => r.name));
  const blob = createZip(results.map((r, i) => ({ ...r, name: names[i] })));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'autocolor-photos.zip';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
});

$('#clear').addEventListener('click', () => {
  if (queue.size) return;
  queue.reset();
  for (const img of document.querySelectorAll('#results img, #results a')) URL.revokeObjectURL(img.src || img.href);
  $('#results').replaceChildren();
  results.length = 0;
  $('#zip').disabled = true;
  $('#results-section').hidden = true;
});

// Google Drive
const driveRetry = [];
const state = driveState(config);
const driveButton = $('#drive');
driveButton.querySelector('span').textContent = state.label;
driveButton.disabled = !state.ready;
$('#drive-note').hidden = state.ready;
let drive = null;
const getDrive = async () => (drive ??= (await import('./drive.js')).createDrive(config));
driveButton.addEventListener('click', async () => {
  try {
    const d = await getDrive();
    const files = await d.pick();
    queue.add(files.map((f) => addReadyCard({ name: f.name, kind: classify(f.name, f.mimeType), drive: true, getBlob: () => d.download(f) })));
  } catch (e) {
    $('#status').textContent = `Google Drive: ${e.message}`;
  }
});
$('#reconnect').addEventListener('click', async () => {
  try {
    await (await getDrive()).reconnect();
    $('#reconnect').hidden = true;
    queue.resume();
    queue.retry(driveRetry.splice(0));
  } catch (e) {
    $('#status').textContent = `Google Drive: ${e.message}`;
  }
});
