import * as THREE from 'three';
import { education, ideas, markets, site, work } from '../../content';
import type { ScreenPainter } from '../study/screens';

/**
 * Everything that glows around the court: the hanging LED scoreboard, the markets
 * ticker, the courtside clip screen, the perimeter LED boards, and the chalk on the
 * ideas board. Each is a 2D canvas uploaded as a CanvasTexture and repainted at a
 * capped rate. Text comes from content.ts; nothing here makes content claims.
 */

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const DISPLAY = '"Archivo Variable", "Space Grotesk Variable", system-ui, sans-serif';
const SANS = '"Space Grotesk Variable", system-ui, sans-serif';

const AMBER = '#ffb25c';
const ORANGE = '#fb923c';
const GREEN = '#4ade80';
const RED = '#f87171';

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return { canvas, ctx, texture };
}

/** A dot-matrix mask: each LED is a soft round dot on a dark board. */
function ledMask(w: number, h: number, pitch: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d')!;
  const tile = document.createElement('canvas');
  tile.width = tile.height = pitch;
  const t = tile.getContext('2d')!;
  const g = t.createRadialGradient(pitch / 2, pitch / 2, 0, pitch / 2, pitch / 2, pitch * 0.5);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  t.fillStyle = g;
  t.fillRect(0, 0, pitch, pitch);
  x.fillStyle = x.createPattern(tile, 'repeat')!;
  x.fillRect(0, 0, w, h);
  return c;
}

/** Paint `draw` and then punch it through an LED dot mask, over unlit dots. */
function ledPaint(ctx: CanvasRenderingContext2D, mask: HTMLCanvasElement, draw: () => void) {
  const { width: w, height: h } = ctx.canvas;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  draw();
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  // Unlit LEDs behind the lit ones.
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 0.16;
  ctx.drawImage(mask, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#050608';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

const pad2 = (n: number) => String(Math.max(0, Math.min(99, n))).padStart(2, '0');
const upper = (s: string) => s.toUpperCase();

// ───────────────────────────── Scoreboard (Work) ─────────────────────────────

export interface RallyScore {
  count: number;
  best: number;
}

/** The hanging arena scoreboard: work history as "players", the rally as the live score. */
export function createScoreboard(score: () => RallyScore, w = 1536, h = 672): ScreenPainter {
  const { ctx, texture } = makeCanvas(w, h);
  const mask = ledMask(w, h, 6);
  const rows = work.items.slice(0, 2);

  const paint = (t: number) => {
    const s = score();
    ledPaint(ctx, mask, () => {
      // Header bar
      ctx.fillStyle = ORANGE;
      ctx.font = `600 54px ${MONO}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(upper(site.name), 48, 62);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e8e4dc';
      ctx.fillText('WORK', w - 48, 62);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(251,146,60,0.9)';
      ctx.fillRect(48, 112, w - 96, 6);

      // Two "players": the two most recent roles.
      rows.forEach((r, i) => {
        const y = 196 + i * 150;
        const live = r.current && Math.floor(t * 1.4) % 2 === 0;
        ctx.fillStyle = r.current ? (live ? GREEN : 'rgba(74,222,128,0.35)') : '#6b6f78';
        ctx.beginPath();
        ctx.arc(70, y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f4f1ea';
        ctx.font = `600 58px ${MONO}`;
        ctx.fillText(upper(r.org).slice(0, 26), 110, y - 22);
        ctx.fillStyle = AMBER;
        ctx.font = `500 38px ${MONO}`;
        ctx.fillText(upper(r.role).replace('SWE INTERN → ', 'INTERN → ').slice(0, 40), 110, y + 34);
        ctx.textAlign = 'right';
        ctx.fillStyle = r.current ? GREEN : '#c9c4ba';
        ctx.font = `600 50px ${MONO}`;
        ctx.fillText(upper(r.period.replace(/Mar |Jul /g, '')), w - 48, y);
        ctx.textAlign = 'left';
      });

      // Live rally score (the mini-game writes here).
      const y = h - 96;
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(48, y - 62, w - 96, 4);
      ctx.font = `500 40px ${MONO}`;
      ctx.fillStyle = '#9aa0aa';
      ctx.fillText('RALLY', 48, y);
      ctx.fillText('BEST', w / 2 + 40, y);
      ctx.font = `700 92px ${MONO}`;
      ctx.fillStyle = '#ff5a36';
      ctx.fillText(pad2(s.count), 230, y + 6);
      ctx.fillStyle = AMBER;
      ctx.fillText(pad2(s.best), w / 2 + 210, y + 6);
      // Shot clock-ish blinker
      ctx.fillStyle = Math.floor(t * 2) % 2 ? '#ff5a36' : 'rgba(255,90,54,0.25)';
      ctx.beginPath();
      ctx.arc(w - 80, y, 16, 0, Math.PI * 2);
      ctx.fill();
    });
    texture.needsUpdate = true;
  };
  return { texture, paint, dispose: () => texture.dispose() };
}

// ───────────────────────────── Ticker (Markets) ─────────────────────────────

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Courtside LED ticker: a simulated price line plus a crawl of the *topics* in the
 * markets notes. Illustrative only (no real instruments, no prices).
 */
export function createTicker(w = 1536, h = 512): ScreenPainter {
  const { ctx, texture } = makeCanvas(w, h);
  const mask = ledMask(w, h, 5);
  const rnd = mulberry32(7);
  const series: number[] = [];
  let v = 0.5;
  for (let i = 0; i < 400; i++) {
    v += (rnd() - 0.48) * 0.06;
    v = Math.min(0.92, Math.max(0.08, v));
    series.push(v);
  }
  const tags = [...new Set(markets.learnings.flatMap((l) => l.tags ?? []))];
  const items = ['LEARNING NOTES', ...tags.map(upper), 'RISK FIRST', 'COMPOUNDING', 'NOT FINANCIAL ADVICE'];

  const paint = (t: number) => {
    ledPaint(ctx, mask, () => {
      ctx.textBaseline = 'middle';
      // Title strip
      ctx.font = `600 46px ${MONO}`;
      ctx.fillStyle = ORANGE;
      ctx.fillText(upper(markets.kicker) + ' · ' + upper(markets.title).replace('WHAT ', ''), 40, 52);

      // Chart: a scrolling simulated line with candles.
      const top = 104;
      const ch = 250;
      const n = 96;
      const off = Math.floor(t * 6) % (series.length - n);
      const bw = (w - 80) / n;
      for (let i = 0; i < n; i++) {
        const a = series[off + i];
        const b = series[off + i + 1] ?? a;
        const up = b >= a;
        ctx.fillStyle = up ? GREEN : RED;
        const y0 = top + ch * (1 - Math.max(a, b));
        const y1 = top + ch * (1 - Math.min(a, b));
        ctx.fillRect(40 + i * bw + bw * 0.2, y0, bw * 0.6, Math.max(4, y1 - y0));
      }
      ctx.strokeStyle = 'rgba(255,178,92,0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const y = top + ch * (1 - series[off + i]);
        if (i === 0) ctx.moveTo(40, y);
        else ctx.lineTo(40 + i * bw + bw / 2, y);
      }
      ctx.stroke();

      // Crawl
      ctx.font = `600 52px ${MONO}`;
      const text = items.join('   ▲   ') + '   ▼   ';
      const tw = ctx.measureText(text).width;
      const x = 40 - ((t * 140) % tw);
      ctx.fillStyle = '#f4f1ea';
      ctx.fillText(text, x, h - 70);
      ctx.fillText(text, x + tw, h - 70);
    });
    texture.needsUpdate = true;
  };
  return { texture, paint, dispose: () => texture.dispose() };
}

// ───────────────────────────── Clip screen (Badminton) ─────────────────────────────

/**
 * Courtside TV: an animated top-down "replay" of a rally drawn on a court diagram,
 * with a play button and progress bar, until real clips are added in content.ts.
 */
export function createClipScreen(w = 1280, h = 720): ScreenPainter {
  const { ctx, texture } = makeCanvas(w, h);
  // Court diagram (top-down, net vertical in the middle).
  const cx = w * 0.5;
  const cy = h * 0.47;
  const L = 560;
  const W = L * (6.1 / 13.4);
  const rnd = mulberry32(3);
  const shots = Array.from({ length: 9 }, (_, i) => ({
    x: (i % 2 ? 1 : -1) * (0.15 + rnd() * 0.33),
    y: (rnd() - 0.5) * 0.85,
  }));

  const paint = (t: number) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1d18');
    g.addColorStop(1, '#06100d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Court
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = '#17604a';
    ctx.fillRect(-L / 2, -W / 2, L, W);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-L / 2, -W / 2, L, W);
    const sx = L / 13.4;
    const sw = (W * (5.18 / 6.1)) / 2;
    ctx.beginPath();
    ctx.moveTo(-L / 2, -sw);
    ctx.lineTo(L / 2, -sw);
    ctx.moveTo(-L / 2, sw);
    ctx.lineTo(L / 2, sw);
    for (const s of [-1, 1]) {
      ctx.moveTo(s * 1.98 * sx, -W / 2);
      ctx.lineTo(s * 1.98 * sx, W / 2);
      ctx.moveTo(s * (6.7 - 0.76) * sx, -W / 2);
      ctx.lineTo(s * (6.7 - 0.76) * sx, W / 2);
      ctx.moveTo(s * 1.98 * sx, 0);
      ctx.lineTo((s * L) / 2, 0);
    }
    ctx.stroke();
    ctx.strokeStyle = '#e8e4dc';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, -W / 2 - 18);
    ctx.lineTo(0, W / 2 + 18);
    ctx.stroke();

    // Rally replay: shuttle path between alternating ends with a fading trail.
    const seg = (t * 0.9) % (shots.length - 1);
    const i = Math.floor(seg);
    const f = seg - i;
    const pt = (k: number) => ({ x: (shots[k].x * L) / 2, y: (shots[k].y * W) / 2 });
    for (let k = Math.max(0, i - 3); k <= i; k++) {
      const a = pt(k);
      const b = pt(k + 1);
      const end = k === i ? f : 1;
      ctx.strokeStyle = `rgba(255,178,92,${0.25 + 0.25 * (k - i + 3)})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + (b.x - a.x) * end, a.y + (b.y - a.y) * end);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const a = pt(i);
    const b = pt(i + 1);
    const px = a.x + (b.x - a.x) * f;
    const py = a.y + (b.y - a.y) * f - Math.sin(f * Math.PI) * 26;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = ORANGE;
    ctx.shadowBlur = 24;
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Players
    for (const k of [i, i + 1]) {
      const p = pt(k);
      ctx.fillStyle = k === i + 1 ? ORANGE : 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Chrome: title, live dot, play button, progress.
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, w, 84);
    ctx.font = `600 34px ${SANS}`;
    ctx.fillStyle = '#f4f1ea';
    ctx.textBaseline = 'middle';
    ctx.fillText('On court, every day', 40, 44);
    ctx.textAlign = 'right';
    ctx.font = `500 26px ${MONO}`;
    ctx.fillStyle = Math.floor(t * 1.5) % 2 ? '#ff5a36' : '#7a2a1c';
    ctx.fillText('● REPLAY', w - 40, 44);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, h - 92, w, 92);
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.moveTo(44, h - 62);
    ctx.lineTo(44, h - 30);
    ctx.lineTo(72, h - 46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(100, h - 50, w - 300, 8);
    ctx.fillStyle = ORANGE;
    ctx.fillRect(100, h - 50, (w - 300) * ((t * 0.04) % 1), 8);
    ctx.font = `500 24px ${MONO}`;
    ctx.fillStyle = '#c9c4ba';
    ctx.fillText('CLIPS COMING SOON', w - 180 - 80, h - 46);
    texture.needsUpdate = true;
  };
  return { texture, paint, dispose: () => texture.dispose() };
}

// ───────────────────────────── Perimeter LED boards ─────────────────────────────

/** Long courtside advertising boards, here running the site's own name. */
export function createPerimeterBoard(w = 2048, h = 128): ScreenPainter {
  const { ctx, texture } = makeCanvas(w, h);
  const mask = ledMask(w, h, 4);
  const msgs = [site.domain.toUpperCase(), 'ON COURT, EVERY DAY', 'CODE · MARKETS · BADMINTON · TRIPS'];
  const paint = (t: number) => {
    ledPaint(ctx, mask, () => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#120804');
      g.addColorStop(0.5, '#1e0c05');
      g.addColorStop(1, '#120804');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.font = `800 78px ${DISPLAY}`;
      ctx.textBaseline = 'middle';
      const text = msgs.join('     ◆     ') + '     ◆     ';
      const tw = ctx.measureText(text).width;
      const x = -((t * 90) % tw);
      ctx.fillStyle = '#ffb066';
      ctx.fillText(text, x, h / 2 + 4);
      ctx.fillText(text, x + tw, h / 2 + 4);
    });
    texture.needsUpdate = true;
  };
  return { texture, paint, dispose: () => texture.dispose() };
}

// ───────────────────────────── Chalk (Ideas) + book spines ─────────────────────────────

/** Chalk handwriting on transparent, laid over the standing chalkboard. */
export function createChalk(w = 1024, h = 1024): THREE.CanvasTexture {
  const { ctx, texture } = makeCanvas(w, h);
  ctx.clearRect(0, 0, w, h);
  const chalk = (text: string, x: number, y: number, size: number, color = 'rgba(245,242,232,0.92)', rot = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = `500 ${size}px ${SANS}`;
    ctx.fillStyle = color;
    // A few jittered passes give the dusty chalk edge.
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.32;
      ctx.fillText(text, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };
  chalk(upper(ideas.kicker), 90, 170, 132, 'rgba(255,196,140,0.95)', -0.03);
  ctx.strokeStyle = 'rgba(255,196,140,0.7)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(90, 205);
  ctx.quadraticCurveTo(300, 190, 480, 212);
  ctx.stroke();
  const tags = [...new Set(ideas.entries.flatMap((e) => e.tags ?? []))];
  tags.forEach((tag, i) => chalk(`→ ${tag}`, 100, 330 + i * 120, 64, undefined, (i % 2 ? 1 : -1) * 0.02));
  chalk('?', 830, 250, 200, 'rgba(255,255,255,0.45)', 0.2);
  chalk(ideas.intro.split(':')[0].split(',')[0], 96, 330 + tags.length * 120 + 40, 46, 'rgba(230,230,220,0.7)');
  // Doodle: a shuttle's flight arc
  ctx.strokeStyle = 'rgba(245,242,232,0.6)';
  ctx.lineWidth = 5;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.moveTo(560, 880);
  ctx.quadraticCurveTo(760, 560, 940, 860);
  ctx.stroke();
  ctx.setLineDash([]);
  texture.needsUpdate = true;
  return texture;
}

/** Spines for the books on the shelf, labelled with the schools in content.ts. */
export function createSpines(w = 1024, h = 256): THREE.CanvasTexture {
  const { ctx, texture } = makeCanvas(w, h);
  const cols = ['#5b2a1d', '#1f3b57', '#2f4a2e', '#6b4b1f', '#3a2742', '#7a2f1e', '#22313f', '#5a5a2a'];
  const labels = [...education.items.map((e) => e.degree), education.dream.title.replace(/[^\w\s]/g, '').trim(), 'Fintech', 'Markets'];
  const n = 8;
  const sw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cols[i];
    ctx.fillRect(i * sw, 0, sw, h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(i * sw + 4, 0, 4, h);
    ctx.fillStyle = 'rgba(214,180,110,0.9)';
    ctx.fillRect(i * sw + 10, 18, sw - 20, 3);
    ctx.fillRect(i * sw + 10, h - 22, sw - 20, 3);
    ctx.save();
    ctx.translate(i * sw + sw / 2, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.font = `600 ${Math.min(26, sw * 0.24)}px ${SANS}`;
    ctx.fillStyle = 'rgba(232,210,160,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((labels[i % labels.length] ?? '').slice(0, 16), 0, 0);
    ctx.restore();
  }
  texture.needsUpdate = true;
  return texture;
}
