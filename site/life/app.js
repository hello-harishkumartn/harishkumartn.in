import { unlockWithPassword, decryptEnvelope, exportKey, importKey } from './crypto.js';

const KEY_STORE = 'lifegraph.key.v1';
const $ = (s) => document.querySelector(s);

const TYPE_META = {
  day:        { color: '#f5f1ea', label: 'Days' },
  person:     { color: '#60a5fa', label: 'People' },
  place:      { color: '#34d399', label: 'Places' },
  activity:   { color: '#fb923c', label: 'Activities' },
  experience: { color: '#facc15', label: 'Experiences' },
  org:        { color: '#a78bfa', label: 'Orgs' },
  project:    { color: '#f472b6', label: 'Projects' },
  theme:      { color: '#22d3ee', label: 'Themes' },
  emotion:    { color: '#f87171', label: 'Feelings' },
};
const MOOD_COLOR = { '-2': '#f87171', '-1': '#fda4af', '0': '#b3aba1', '1': '#86efac', '2': '#34d399' };

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 720px)').matches || matchMedia('(pointer: coarse)').matches;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtDate = (d, opts = { weekday: 'short', day: 'numeric', month: 'short' }) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', opts);
const idOf = (x) => (typeof x === 'object' ? x.id : x);

// ------------------------------------------------------------------ unlock

let envelope = null;

async function loadEnvelope() {
  const res = await fetch('data.enc.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`data.enc.json ${res.status}`);
  return res.json();
}

function showMsg(text, err = false) {
  const m = $('#login-msg');
  m.textContent = text;
  m.classList.toggle('err', err);
}

async function tryRemembered() {
  const raw = localStorage.getItem(KEY_STORE);
  if (!raw) return null;
  try {
    const { salt, key } = JSON.parse(raw);
    if (salt !== envelope.salt) throw new Error('salt changed');
    return await decryptEnvelope(await importKey(key), envelope);
  } catch {
    localStorage.removeItem(KEY_STORE);
    return null;
  }
}

async function onLogin(ev) {
  ev.preventDefault();
  const pw = $('#password').value;
  if (!pw) return;
  const btn = $('#enter');
  btn.disabled = true;
  btn.textContent = 'Warming up...';
  showMsg('');
  try {
    envelope ??= await loadEnvelope();
    const { key, data } = await unlockWithPassword(pw, envelope);
    if ($('#remember').checked) {
      localStorage.setItem(KEY_STORE, JSON.stringify({ salt: envelope.salt, key: await exportKey(key) }));
    }
    $('#password').value = '';
    startApp(data);
  } catch (e) {
    const card = $('#login-form');
    card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    showMsg(e?.name === 'OperationError'
      ? 'Into the net. That password did not work, try again.'
      : `Could not load your graph (${e.message}).`, true);
    btn.disabled = false;
    btn.textContent = 'Enter the court';
    $('#password').select();
  }
}

function lock() {
  localStorage.removeItem(KEY_STORE);
  location.reload();
}

async function boot() {
  $('#login-form').addEventListener('submit', onLogin);
  try {
    envelope = await loadEnvelope();
    const data = await tryRemembered();
    if (data) return startApp(data);
  } catch (e) {
    showMsg(`Could not reach your data (${e.message}).`, true);
  }
}

// ------------------------------------------------------------------ app state

let G = null;           // ForceGraph3D instance
let data = null;        // {nodes, links, ...}
let byId = new Map();
let dayList = [];       // sorted dates
let cutIdx = 0;         // timeline position (index into dayList)
const hidden = new Set();
let selected = null;
let playing = null;

function startApp(graph) {
  data = graph;
  $('#login').hidden = true;
  $('#app').hidden = false;
  byId = new Map(data.nodes.map((n) => [n.id, n]));
  dayList = data.nodes.filter((n) => n.type === 'day').map((n) => n.date).sort();
  cutIdx = dayList.length - 1;
  // Neighbour lists for the panel and highlighting.
  for (const n of data.nodes) n.nbrs = new Set();
  for (const l of data.links) {
    byId.get(idOf(l.source))?.nbrs.add(idOf(l.target));
    byId.get(idOf(l.target))?.nbrs.add(idOf(l.source));
  }
  renderStats();
  renderLegend();
  initGraph();
  initTimeline();
  initSearch();
  $('#reset').addEventListener('click', resetView);
  $('#lock').addEventListener('click', lock);
  $('#panel-close').addEventListener('click', () => select(null));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') select(null); });
}

// ------------------------------------------------------------------ stats + legend

function renderStats() {
  const ents = data.nodes.filter((n) => n.type !== 'day');
  const count = (t) => ents.filter((n) => n.type === t).length;
  const themes = ents.filter((n) => n.type === 'theme').sort((a, b) => b.count - a.count).slice(0, 3).map((n) => n.name);
  $('#stats').innerHTML = `
    <div class="stat"><b>${dayList.length}</b>days journaled</div>
    <div class="stat"><b>${count('person')}</b>people</div>
    <div class="stat"><b>${count('place')}</b>places</div>
    <div class="stat"><b>${count('activity')}</b>activities</div>
    ${themes.length ? `<div class="stat themes">top themes <b>${themes.map(esc).join(' · ')}</b></div>` : ''}`;
}

function renderLegend() {
  const counts = {};
  for (const n of data.nodes) counts[n.type] = (counts[n.type] || 0) + 1;
  const el = $('#legend');
  el.innerHTML = Object.entries(TYPE_META)
    .filter(([t]) => counts[t])
    .map(([t, m]) => `<button class="chip" data-type="${t}" aria-pressed="true"><i style="background:${m.color}"></i>${m.label}<span class="n">${counts[t]}</span></button>`)
    .join('');
  el.addEventListener('click', (e) => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const t = b.dataset.type;
    hidden.has(t) ? hidden.delete(t) : hidden.add(t);
    b.classList.toggle('off', hidden.has(t));
    b.setAttribute('aria-pressed', String(!hidden.has(t)));
    applyFilter();
  });
}

// ------------------------------------------------------------------ 3D objects

const T = window.THREE;
const seg = small ? 8 : 16;
const geo = {
  sphere: new T.SphereGeometry(1, seg, Math.max(6, seg * 0.75)),
  feathers: new T.ConeGeometry(1, 1.5, small ? 8 : 16, 1, true),
  band: new T.CylinderGeometry(0.42, 0.42, 0.18, small ? 8 : 14),
  cork: new T.SphereGeometry(0.42, small ? 8 : 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
};
const mats = {};
const mat = (key, make) => (mats[key] ??= make());
const typeMat = (t) => mat(`t:${t}`, () => new T.MeshLambertMaterial({ color: TYPE_META[t]?.color || '#ccc', transparent: true, opacity: 0.92 }));

function shuttlecock(n) {
  // Feather skirt (open cone, wide end up) on a cork tip coloured by mood.
  const g = new T.Group();
  const f = new T.Mesh(geo.feathers, mat('feathers', () => new T.MeshLambertMaterial({
    color: '#f5f1ea', transparent: true, opacity: 0.85, side: T.DoubleSide,
  })));
  f.rotation.x = Math.PI; f.position.y = 1.05;
  const band = new T.Mesh(geo.band, mat('band', () => new T.MeshLambertMaterial({ color: '#fb923c' })));
  band.position.y = 0.25;
  const cork = new T.Mesh(geo.cork, mat(`mood:${n.moodScore}`, () => new T.MeshLambertMaterial({ color: MOOD_COLOR[n.moodScore] || '#f3d7b4' })));
  cork.position.y = 0.17;
  g.add(f, band, cork);
  g.scale.setScalar(6);
  g.rotation.z = 0.5; // tilted, mid flight
  return g;
}

function textSprite(text, color) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = '600 44px "Space Grotesk", system-ui, sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 24;
  c.width = w; c.height = 64;
  ctx.font = font;
  ctx.fillStyle = 'rgba(13,11,9,0.6)';
  ctx.beginPath(); ctx.roundRect(0, 4, w, 56, 14); ctx.fill();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 12, 34);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  const s = new T.Sprite(new T.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  s.scale.set(w / 8, 64 / 8, 1);
  s.renderOrder = 10;
  return s;
}

const radius = (count) => 2.4 + 2.1 * Math.sqrt(count);
const countAt = (n) => (n.type === 'day' ? 1 : n.dates.filter((d) => d <= dayList[cutIdx]).length);

let labelled = new Set();
let spine = 320;
let dayX = new Map();

function nodeObject(n) {
  if (n.type === 'day') return shuttlecock(n);
  const g = new T.Group();
  const m = new T.Mesh(geo.sphere, typeMat(n.type));
  m.scale.setScalar(radius(countAt(n)));
  g.add(m);
  n.__ball = m;
  if (labelled.has(n.id)) {
    const s = textSprite(n.label || n.name, TYPE_META[n.type]?.color || '#fff');
    s.position.y = radius(n.count) + 7;
    g.add(s);
  }
  return g;
}

// BWF doubles court: 13.4 m x 6.1 m. Long axis along x, matching the time spine.
function courtObject(len) {
  const k = len / 13.4;
  const W = 6.1 * k, L = 13.4 * k;
  const g = new T.Group();
  const plane = new T.Mesh(new T.PlaneGeometry(L * 1.08, W * 1.16), new T.MeshBasicMaterial({
    color: '#1f6b4a', transparent: true, opacity: 0.28, side: T.DoubleSide, depthWrite: false,
  }));
  plane.rotation.x = -Math.PI / 2;
  g.add(plane);
  const pts = [];
  const seg = (x1, z1, x2, z2) => pts.push(x1 * k, 0.2, z1 * k, x2 * k, 0.2, z2 * k);
  const hx = 6.7, hz = 3.05, sz = 3.05 - 0.46, ss = 1.98, ld = 6.7 - 0.76;
  seg(-hx, -hz, hx, -hz); seg(-hx, hz, hx, hz);          // doubles sidelines
  seg(-hx, -sz, hx, -sz); seg(-hx, sz, hx, sz);          // singles sidelines
  seg(-hx, -hz, -hx, hz); seg(hx, -hz, hx, hz);          // back boundary
  seg(-ld, -hz, -ld, hz); seg(ld, -hz, ld, hz);          // doubles long service
  seg(-ss, -hz, -ss, hz); seg(ss, -hz, ss, hz);          // short service
  seg(-hx, 0, -ss, 0); seg(ss, 0, hx, 0);                // centre lines
  const lg = new T.BufferGeometry();
  lg.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
  g.add(new T.LineSegments(lg, new T.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 })));
  // Net: translucent mesh standing on the centre line.
  const net = new T.Mesh(new T.PlaneGeometry(W * 1.04, 1.55 * k), new T.MeshBasicMaterial({
    color: '#f5f1ea', transparent: true, opacity: 0.06, side: T.DoubleSide, depthWrite: false,
  }));
  net.rotation.y = Math.PI / 2; net.position.y = 0.775 * k;
  const tape = new T.Mesh(new T.BoxGeometry(0.3, 0.6, W * 1.04), new T.MeshBasicMaterial({ color: '#f5f1ea', transparent: true, opacity: 0.5 }));
  tape.position.y = 1.55 * k;
  g.add(net, tape);
  return g;
}

// ------------------------------------------------------------------ graph

function linkColor(l) {
  const s = idOf(l.source), t = idOf(l.target);
  const on = selected && (s === selected.id || t === selected.id);
  if (l.kind === 'next') return '#fb923c';
  if (on) return '#f5f1ea';
  return l.kind === 'rel' ? 'rgba(179,171,161,0.35)' : 'rgba(179,171,161,0.14)';
}

function initGraph() {
  const el = $('#graph');
  const ents = data.nodes.filter((n) => n.type !== 'day').sort((a, b) => b.count - a.count);
  labelled = new Set(small ? [] : ents.slice(0, 12).map((n) => n.id));
  spine = Math.max(320, dayList.length * 16);
  const sway = spine / 9;
  const floorY = -95;
  const tx = (i) => -spine / 2 + (spine * i) / Math.max(1, dayList.length - 1);
  dayX = new Map(dayList.map((d, i) => [d, tx(i)]));
  // Days are pinned on a rally path along the court's long axis, swaying across it.
  dayList.forEach((d, i) => {
    const n = byId.get(`day:${d}`);
    n.fx = tx(i); n.fy = 10 + Math.abs(Math.sin(i * 0.9)) * 18; n.fz = Math.sin(i * 0.9) * sway;
  });

  G = window.ForceGraph3D({ controlType: 'orbit' })(el)
    .backgroundColor('#0d0b09')
    .showNavInfo(false)
    .nodeId('id')
    .nodeThreeObject(nodeObject)
    .nodeLabel((n) => n.type === 'day'
      ? `<div>${esc(fmtDate(n.date))}</div><div class="tt-t">${esc(n.mood)}</div>`
      : `<div>${esc(n.name)}</div><div class="tt-t">${esc(n.type)} · ${n.count} day${n.count === 1 ? '' : 's'}</div>`)
    .linkColor(linkColor)
    .linkOpacity(0.6)
    .linkWidth((l) => (l.kind === 'next' ? 1.6 : selected && (idOf(l.source) === selected.id || idOf(l.target) === selected.id) ? 0.6 : 0))
    .linkCurvature((l) => (l.kind === 'next' ? 0.35 : 0))
    .linkCurveRotation((l) => (l.kind === 'next' ? Math.PI / 2 : 0))
    .linkDirectionalParticles((l) => (l.kind === 'next' && !small && !reduceMotion ? 2 : 0))
    .linkDirectionalParticleWidth(2.4)
    .linkDirectionalParticleColor(() => '#fde68a')
    .linkDirectionalParticleSpeed(0.006)
    .onNodeClick((n) => select(n, true))
    .onBackgroundClick(() => select(null))
    .enableNodeDrag(!small)
    .cooldownTicks(small ? 150 : 260)
    .warmupTicks(small ? 60 : 100);

  G.d3Force('center', null); // days are pinned; centring would drag entities off their days
  G.d3Force('charge').strength(-26).distanceMax(220);
  G.d3Force('link')
    .distance((l) => (l.kind === 'rel' ? 30 : 34))
    .strength((l) => (l.kind === 'next' ? 0 : l.kind === 'rel' ? 0.12 : 0.35));

  // Entities drift toward the time of their days and stay above the court.
  let simNodes = [];
  const rally = (alpha) => {
    const cut = dayList[cutIdx];
    for (const n of simNodes) {
      if (n.type === 'day') continue;
      const ds = n.dates.filter((d) => d <= cut);
      const x = ds.reduce((a, d) => a + dayX.get(d), 0) / (ds.length || 1);
      n.vx += (x - n.x) * 0.12 * alpha;
      if (n.y < floorY + 20) n.vy += (floorY + 20 - n.y) * 0.3 * alpha;
    }
  };
  rally.initialize = (ns) => { simNodes = ns; };
  G.d3Force('rally', rally);

  // Lighting and the court.
  const scene = G.scene();
  scene.add(new T.AmbientLight(0xffffff, 1.6));
  const sun = new T.DirectionalLight(0xffe7cc, 2.2);
  sun.position.set(80, 200, 120);
  scene.add(sun);
  const court = courtObject(spine * 1.25);
  court.position.y = floorY;
  scene.add(court);

  if (small) G.renderer().setPixelRatio(Math.min(devicePixelRatio, 1.5));
  addEventListener('resize', () => G.width(innerWidth).height(innerHeight));

  applyFilter();
  homeView(0);
}

function visibleData() {
  const cut = dayList[cutIdx];
  const nodes = data.nodes.filter((n) => !hidden.has(n.type) && (n.type === 'day' ? n.date <= cut : n.firstDate <= cut));
  const ids = new Set(nodes.map((n) => n.id));
  const links = data.links.filter((l) => ids.has(idOf(l.source)) && ids.has(idOf(l.target)) && l.dates[0] <= cut);
  return { nodes, links };
}

// Entities far from their (visible) days, e.g. after rewinding the timeline,
// are dropped back next to their latest visible day instead of drifting across.
function seedPositions(nodes) {
  const cut = dayList[cutIdx];
  for (const n of nodes) {
    if (n.type === 'day') continue;
    const ds = n.dates.filter((d) => d <= cut);
    const x = ds.reduce((a, d) => a + dayX.get(d), 0) / (ds.length || 1);
    if (n.x !== undefined && Math.abs(n.x - x) < spine / 8) continue;
    const day = byId.get(`day:${ds[ds.length - 1]}`);
    const j = () => (Math.random() - 0.5) * 50;
    n.x = x + j(); n.y = (day?.fy ?? 0) + j(); n.z = (day?.fz ?? 0) + j();
    n.vx = n.vy = n.vz = 0;
  }
}

function applyFilter() {
  const vis = visibleData();
  seedPositions(vis.nodes);
  G.graphData(vis);
  for (const n of data.nodes) if (n.__ball) n.__ball.scale.setScalar(radius(countAt(n)));
}

function refreshLinks() {
  G.linkColor(linkColor).linkWidth(G.linkWidth());
}

// ------------------------------------------------------------------ camera


function focus(n, ms = 1000) {
  if (!n || n.x === undefined) return;
  // Approach from the current viewing direction, slightly above.
  const dist = (n.type === 'day' ? 150 : 110 + radius(n.count) * 4) * (innerHeight > innerWidth ? 1.5 : 1);
  const c = G.camera().position;
  const dx = c.x - n.x, dy = c.y - n.y, dz = c.z - n.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  G.cameraPosition({ x: n.x + (dx / len) * dist, y: n.y + (dy / len) * dist + 15, z: n.z + (dz / len) * dist }, n, reduceMotion ? 0 : ms);
}

// Landscape: elevated courtside view. Portrait: from behind the back line,
// so the rally runs away from you down the court.
function homeView(ms = 900) {
  const at = { x: 0, y: -20, z: 0 };
  const pos = innerHeight > innerWidth
    ? { x: -spine * 1.05, y: spine * 0.85, z: 0 }
    : { x: 0, y: spine * 0.5, z: spine * 1.05 };
  G.cameraPosition(pos, at, reduceMotion ? 0 : ms);
}

function resetView() {
  select(null);
  homeView();
}

// ------------------------------------------------------------------ panel

function select(n, fly = false) {
  selected = n;
  refreshLinks();
  const panel = $('#panel');
  if (!n) { panel.hidden = true; return; }
  panel.hidden = false;
  $('#panel-body').innerHTML = n.type === 'day' ? dayPanel(n) : entityPanel(n);
  panel.scrollTop = 0;
  if (fly) focus(n);
}

function badge(t) {
  const m = TYPE_META[t] || { color: '#ccc', label: t };
  return `<span class="badge"><i style="background:${m.color}"></i>${esc(t)}</span>`;
}

function entityPanel(n) {
  const snips = n.snippets.map((s) => `<p class="snip"><span class="d">${esc(fmtDate(s.date))}</span><q>${esc(s.text)}</q></p>`).join('');
  return `
    <h2>${esc(n.name)}</h2>
    <div class="meta">${badge(n.type)}<span><b>${n.count}</b> day${n.count === 1 ? '' : 's'}</span><span>first seen <b>${esc(fmtDate(n.firstDate, { day: 'numeric', month: 'short' }))}</b></span></div>
    <h3>Days</h3>
    <div class="days">${n.dates.map((d) => `<button data-go="day:${d}">${esc(fmtDate(d, { day: 'numeric', month: 'short' }))}</button>`).join('')}</div>
    ${snips ? `<h3>From your journal</h3>${snips}` : ''}
    ${connected(n, (m) => m.type !== 'day', 'Linked with')}`;
}

function dayPanel(n) {
  const mood = `<span class="mood"><span class="dot" style="background:${MOOD_COLOR[n.moodScore]}"></span>${esc(n.mood)} <span class="mono" style="color:var(--muted)">(${n.moodScore > 0 ? '+' : ''}${n.moodScore})</span></span>`;
  const i = dayList.indexOf(n.date);
  const nav = [i > 0 && `<button data-go="day:${dayList[i - 1]}">&larr; ${esc(fmtDate(dayList[i - 1], { day: 'numeric', month: 'short' }))}</button>`,
    i < dayList.length - 1 && `<button data-go="day:${dayList[i + 1]}">${esc(fmtDate(dayList[i + 1], { day: 'numeric', month: 'short' }))} &rarr;</button>`].filter(Boolean).join('');
  return `
    <h2>${esc(fmtDate(n.date, { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>
    <div class="meta">${badge('day')}${mood}</div>
    <p>${esc(n.summary)}</p>
    ${connected(n, (m) => m.type !== 'day', 'On this day')}
    ${nav ? `<h3>Rally</h3><div class="days">${nav}</div>` : ''}`;
}

function connected(n, pred, title) {
  const list = [...n.nbrs].map((id) => byId.get(id)).filter((m) => m && pred(m));
  if (!list.length) return '';
  const order = Object.keys(TYPE_META);
  list.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type) || b.count - a.count);
  return `<h3>${title}</h3><div class="ents">${list.map((m) =>
    `<button data-go="${esc(m.id)}"><i style="background:${TYPE_META[m.type]?.color}"></i>${esc(m.name)}</button>`).join('')}</div>`;
}

$('#panel-body').addEventListener('click', (e) => {
  const b = e.target.closest('[data-go]');
  if (!b) return;
  goTo(byId.get(b.dataset.go));
});

function goTo(n) {
  if (!n) return;
  if (hidden.has(n.type)) {
    hidden.delete(n.type);
    document.querySelector(`.chip[data-type="${n.type}"]`)?.classList.remove('off');
  }
  const first = n.type === 'day' ? n.date : n.firstDate;
  if (first > dayList[cutIdx]) setCut(dayList.length - 1);
  else applyFilter();
  select(n);
  // Positions may not exist yet if the node just appeared.
  setTimeout(() => focus(n), n.x === undefined ? 600 : 0);
}

// ------------------------------------------------------------------ timeline

function setCut(i) {
  cutIdx = Math.max(0, Math.min(dayList.length - 1, i));
  $('#slider').value = cutIdx;
  $('#slider-date').textContent = fmtDate(dayList[cutIdx]);
  applyFilter();
}

function initTimeline() {
  const s = $('#slider');
  s.max = dayList.length - 1;
  s.value = cutIdx;
  $('#slider-date').textContent = fmtDate(dayList[cutIdx]);
  s.addEventListener('input', () => { stop(); setCut(+s.value); });
  $('#play').addEventListener('click', () => (playing ? stop() : play()));
}

function play() {
  const btn = $('#play');
  btn.innerHTML = '&#10073;&#10073;';
  btn.setAttribute('aria-label', 'Pause');
  if (cutIdx >= dayList.length - 1) setCut(0);
  playing = setInterval(() => {
    if (cutIdx >= dayList.length - 1) return stop();
    setCut(cutIdx + 1);
  }, reduceMotion ? 1200 : 750);
}

function stop() {
  clearInterval(playing);
  playing = null;
  const btn = $('#play');
  btn.innerHTML = '&#9654;';
  btn.setAttribute('aria-label', 'Play the season');
}

// ------------------------------------------------------------------ search

function score(n, q) {
  const name = (n.type === 'day' ? `${n.date} ${fmtDate(n.date, { weekday: 'long', day: 'numeric', month: 'long' })} ${n.mood}` : `${n.name} ${n.label || ''}`).toLowerCase();
  if (name.startsWith(q)) return 3;
  if (name.split(/\s+/).some((w) => w.startsWith(q))) return 2.5;
  if (name.includes(q)) return 2;
  let i = 0; // loose subsequence match ("bdmtn" finds badminton)
  for (const c of name) if (c === q[i]) i++;
  return i === q.length ? 1 : 0;
}

function initSearch() {
  const input = $('#search');
  const box = $('#search-results');
  let hits = [];
  let active = 0;
  const render = () => {
    box.hidden = !hits.length;
    box.innerHTML = hits.map((n, i) => `<li role="option" data-i="${i}" aria-selected="${i === active}">
      <span class="badge"><i style="background:${TYPE_META[n.type]?.color}"></i></span>
      ${esc(n.type === 'day' ? fmtDate(n.date) : n.name)}<span class="t">${n.type === 'day' ? esc(n.mood) : n.count + 'd'}</span></li>`).join('');
  };
  const pick = (n) => { if (!n) return; hits = []; render(); input.blur(); goTo(n); };
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    active = 0;
    hits = q ? data.nodes.map((n) => [n, score(n, q)]).filter(([, s]) => s > 0)
      .sort((a, b) => b[1] - a[1] || (b[0].count || 0) - (a[0].count || 0)).slice(0, 8).map(([n]) => n) : [];
    render();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { active = Math.min(hits.length - 1, active + 1); render(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { active = Math.max(0, active - 1); render(); e.preventDefault(); }
    else if (e.key === 'Enter') pick(hits[active]);
    else if (e.key === 'Escape') { input.value = ''; hits = []; render(); }
  });
  box.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li');
    if (li) { e.preventDefault(); pick(hits[+li.dataset.i]); }
  });
  input.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
  input.addEventListener('focus', () => { if (hits.length) box.hidden = false; });
}

boot();
