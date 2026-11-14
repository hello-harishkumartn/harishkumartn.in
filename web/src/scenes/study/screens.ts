import * as THREE from 'three';

/**
 * Live "screen" textures, painted on 2D canvases and uploaded as CanvasTextures.
 * Both are purely decorative: illustrative pipeline code and a simulated chart.
 */

const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const SANS = '"Space Grotesk Variable", system-ui, sans-serif';

export interface ScreenPainter {
  texture: THREE.CanvasTexture;
  /** Repaint for time `t` (seconds). Cheap enough to call ~20×/s. */
  paint: (t: number) => void;
  dispose: () => void;
}

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

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// ───────────────────────────── Laptop: code editor ─────────────────────────────

type Tok = [string, string];
const C = {
  kw: '#ff9e64',
  fn: '#7dcfff',
  str: '#9ece6a',
  com: '#5c6370',
  num: '#e0af68',
  txt: '#c8ccd4',
  dec: '#bb9af7',
};

// Illustrative Airflow + Spark style code (generic, not a real codebase).
const CODE: Tok[][] = [
  [['from', C.kw], [' airflow ', C.txt], ['import', C.kw], [' DAG', C.txt]],
  [['from', C.kw], [' pyspark.sql ', C.txt], ['import', C.kw], [' SparkSession, functions ', C.txt], ['as', C.kw], [' F', C.txt]],
  [],
  [['# nightly events pipeline: kafka → spark → s3', C.com]],
  [['@task', C.dec]],
  [['def', C.kw], [' extract', C.fn], ['(topic: str) -> str:', C.txt]],
  [['    batch = consume(topic, max_records=', C.txt], ['50_000', C.num], [')', C.txt]],
  [['    return', C.kw], [' stage_to_s3(batch, ', C.txt], ['"raw/events"', C.str], [')', C.txt]],
  [],
  [['@task', C.dec]],
  [['def', C.kw], [' transform', C.fn], ['(path: str) -> str:', C.txt]],
  [['    spark = SparkSession.builder.getOrCreate()', C.txt]],
  [['    df = spark.read.json(path)', C.txt]],
  [['    clean = (df.dropDuplicates([', C.txt], ['"event_id"', C.str], ['])', C.txt]],
  [['        .withColumn(', C.txt], ['"day"', C.str], [', F.to_date(', C.txt], ['"ts"', C.str], ['))', C.txt]],
  [['        .filter(F.col(', C.txt], ['"valid"', C.str], [')))', C.txt]],
  [['    return', C.kw], [' write_parquet(clean, ', C.txt], ['"curated/events"', C.str], [')', C.txt]],
  [],
  [['@task', C.dec]],
  [['def', C.kw], [' load', C.fn], ['(path: str) -> None:', C.txt]],
  [['    warehouse.copy_into(', C.txt], ['"analytics.events"', C.str], [', path)', C.txt]],
  [],
  [['with', C.kw], [' DAG(', C.txt], ['"events_daily"', C.str], [', schedule=', C.txt], ['"@daily"', C.str], ['):', C.txt]],
  [['    load(transform(extract(', C.txt], ['"events"', C.str], [')))', C.txt]],
  [],
  [['# ── devops portal (react + go) ──', C.com]],
  [['func', C.kw], [' (s *Server) ', C.txt], ['Deploy', C.fn], ['(w http.ResponseWriter, r *http.Request) {', C.txt]],
  [['    job := s.queue.Enqueue(r.Context(), parse(r))', C.txt]],
  [['    json.NewEncoder(w).Encode(job.Status())', C.txt]],
  [['}', C.txt]],
  [],
];

export function createCodeScreen(w = 1024, h = 640): ScreenPainter {
  const { ctx, texture } = makeCanvas(w, h);
  const lineH = 26;
  const top = 76;
  const gutter = 64;
  const editorW = w * 0.66;

  const paint = (t: number) => {
    // Window chrome
    ctx.fillStyle = '#16171d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#101116';
    ctx.fillRect(0, 0, w, 40);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(22 + i * 22, 20, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.font = `500 15px ${SANS}`;
    ctx.fillStyle = '#8b8f99';
    ctx.textAlign = 'center';
    ctx.fillText('events_pipeline — workspace', w / 2, 26);
    ctx.textAlign = 'left';

    // Tabs
    ctx.fillStyle = '#1b1c23';
    ctx.fillRect(0, 40, editorW, 30);
    ctx.fillStyle = '#16171d';
    ctx.fillRect(0, 40, 150, 30);
    ctx.fillStyle = '#ff9e64';
    ctx.fillRect(0, 68, 150, 2);
    ctx.font = `14px ${MONO}`;
    ctx.fillStyle = '#e6e6e6';
    ctx.fillText('pipeline.py', 18, 60);
    ctx.fillStyle = '#6b6f7a';
    ctx.fillText('portal.go', 170, 60);

    // Scrolling code
    const scroll = (t * 14) % (CODE.length * lineH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - 4, editorW, h - top - 26);
    ctx.clip();
    ctx.font = `15px ${MONO}`;
    const visible = Math.ceil((h - top) / lineH) + 2;
    const first = Math.floor(scroll / lineH);
    const cursorLine = (first + 9) % CODE.length;
    for (let i = 0; i < visible; i++) {
      const idx = (first + i) % CODE.length;
      const y = top + 16 + i * lineH - (scroll % lineH);
      if (idx === cursorLine) {
        ctx.fillStyle = 'rgba(255,255,255,0.045)';
        ctx.fillRect(0, y - 18, editorW, lineH);
      }
      ctx.fillStyle = idx === cursorLine ? '#c8ccd4' : '#4a4e5a';
      ctx.textAlign = 'right';
      ctx.fillText(String(idx + 1), gutter - 16, y);
      ctx.textAlign = 'left';
      let x = gutter;
      for (const [text, color] of CODE[idx]) {
        ctx.fillStyle = color;
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;
      }
      if (idx === cursorLine && Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = '#ffcc66';
        ctx.fillRect(x + 2, y - 15, 2, 19);
      }
    }
    ctx.restore();

    // Right panel: DAG run
    const px = editorW;
    ctx.fillStyle = '#121318';
    ctx.fillRect(px, 40, w - px, h - 40);
    ctx.fillStyle = '#e6e6e6';
    ctx.font = `600 16px ${SANS}`;
    ctx.fillText('DAG · events_daily', px + 22, 72);
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = '#6b6f7a';
    ctx.fillText('illustrative run', px + 22, 94);

    const steps = ['extract', 'transform', 'load'];
    const cycle = (t / 2.2) % (steps.length + 1.5);
    steps.forEach((s, i) => {
      const y = 140 + i * 92;
      const done = cycle > i + 1;
      const running = !done && cycle > i;
      roundRect(ctx, px + 22, y, w - px - 44, 60, 12);
      ctx.fillStyle = running ? 'rgba(255,158,100,0.12)' : 'rgba(255,255,255,0.04)';
      ctx.fill();
      ctx.strokeStyle = running ? 'rgba(255,158,100,0.7)' : done ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = done ? '#34d399' : running ? '#ff9e64' : '#3c3f49';
      ctx.beginPath();
      ctx.arc(px + 46, y + 30, 7 + (running ? Math.sin(t * 8) * 1.5 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e6e6e6';
      ctx.font = `500 16px ${MONO}`;
      ctx.fillText(s, px + 66, y + 27);
      ctx.fillStyle = '#7b7f8a';
      ctx.font = `12px ${MONO}`;
      ctx.fillText(done ? 'success' : running ? 'running…' : 'queued', px + 66, y + 46);
      if (running) {
        const pw = (w - px - 44) * ((cycle - i) % 1);
        ctx.fillStyle = 'rgba(255,158,100,0.85)';
        ctx.fillRect(px + 22, y + 57, pw, 3);
      }
      if (i < steps.length - 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.beginPath();
        ctx.moveTo(px + 46, y + 60);
        ctx.lineTo(px + 46, y + 92);
        ctx.stroke();
      }
    });

    // Throughput sparkline
    const sy = 440;
    ctx.fillStyle = '#7b7f8a';
    ctx.font = `12px ${MONO}`;
    ctx.fillText('records / s', px + 22, sy);
    ctx.strokeStyle = '#7dcfff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const x = px + 22 + (i / 40) * (w - px - 44);
      const v = Math.sin(i * 0.45 + t * 1.3) * 0.5 + Math.sin(i * 0.17 - t * 0.6) * 0.5;
      const y = sy + 70 - (v * 0.5 + 0.5) * 50;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Status bar
    ctx.fillStyle = '#ff9e64';
    ctx.fillRect(0, h - 24, w, 24);
    ctx.fillStyle = '#1a1208';
    ctx.font = `600 13px ${MONO}`;
    ctx.fillText('⎇ main   spark 3.5   airflow   kafka   aws', 14, h - 7);
    ctx.textAlign = 'right';
    ctx.fillText('Python  UTF-8', w - 14, h - 7);
    ctx.textAlign = 'left';

    texture.needsUpdate = true;
  };

  return { texture, paint, dispose: () => texture.dispose() };
}

// ───────────────────────────── Monitor: candlestick chart ─────────────────────────────

interface Candle {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

/** Deterministic PRNG so the chart looks the same on every load. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createChartScreen(w = 1024, h = 576): ScreenPainter {
  const { ctx, texture } = makeCanvas(w, h);
  const rnd = mulberry32(7);
  const N = 54;
  const candles: Candle[] = [];
  let last = 100;
  const next = (): Candle => {
    const o = last;
    const drift = (rnd() - 0.47) * 3.2;
    const c = Math.max(40, o + drift);
    const h2 = Math.max(o, c) + rnd() * 1.6;
    const l = Math.min(o, c) - rnd() * 1.6;
    last = c;
    return { o, h: h2, l, c, v: 0.3 + rnd() * 0.7 };
  };
  for (let i = 0; i < N; i++) candles.push(next());
  let lastStep = 0;

  const paint = (t: number) => {
    // New candle every ~1.4 s; the live candle wiggles in between.
    if (t - lastStep > 1.4) {
      lastStep = t;
      candles.shift();
      candles.push(next());
    }
    const live = candles[candles.length - 1];
    const wiggle = Math.sin(t * 5.3) * 0.5 + Math.sin(t * 2.1) * 0.4;
    const liveC = live.c + wiggle;
    const liveH = Math.max(live.h, liveC);
    const liveL = Math.min(live.l, liveC);

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0f1115');
    g.addColorStop(1, '#0a0b0e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Header
    ctx.fillStyle = '#e8e6e3';
    ctx.font = `600 22px ${SANS}`;
    ctx.fillText('Practice chart', 28, 42);
    ctx.font = `13px ${MONO}`;
    ctx.fillStyle = '#7a7f89';
    ctx.fillText('simulated random walk · not market data', 28, 64);
    roundRect(ctx, w - 128, 22, 100, 30, 15);
    ctx.fillStyle = 'rgba(251,146,60,0.14)';
    ctx.fill();
    ctx.fillStyle = '#fb923c';
    ctx.font = `600 13px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText('DEMO', w - 78, 42);
    ctx.textAlign = 'left';

    // Plot area
    const x0 = 28;
    const x1 = w - 28;
    const y0 = 92;
    const y1 = h - 110;
    const vy0 = h - 96;
    const vy1 = h - 28;
    let lo = Infinity;
    let hi = -Infinity;
    candles.forEach((k) => {
      lo = Math.min(lo, k.l);
      hi = Math.max(hi, k.h);
    });
    lo = Math.min(lo, liveL) - 2;
    hi = Math.max(hi, liveH) + 2;
    const Y = (v: number) => y1 - ((v - lo) / (hi - lo)) * (y1 - y0);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = y0 + (i / 5) * (y1 - y0);
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      const x = x0 + (i / 8) * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x, vy1);
      ctx.stroke();
    }

    const step = (x1 - x0) / N;
    const bw = step * 0.62;
    candles.forEach((k, i) => {
      const isLive = i === candles.length - 1;
      const c = isLive ? liveC : k.c;
      const hh = isLive ? liveH : k.h;
      const ll = isLive ? liveL : k.l;
      const up = c >= k.o;
      const col = up ? '#34d399' : '#f87171';
      const x = x0 + i * step + step / 2;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, Y(hh));
      ctx.lineTo(x, Y(ll));
      ctx.stroke();
      ctx.fillStyle = col;
      const top = Y(Math.max(k.o, c));
      ctx.fillRect(x - bw / 2, top, bw, Math.max(2, Y(Math.min(k.o, c)) - top));
      // Volume
      ctx.globalAlpha = 0.35;
      const vh = k.v * (vy1 - vy0);
      ctx.fillRect(x - bw / 2, vy1 - vh, bw, vh);
      ctx.globalAlpha = 1;
    });

    // Moving average
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    candles.forEach((_, i) => {
      const from = Math.max(0, i - 8);
      let s = 0;
      for (let j = from; j <= i; j++) s += j === candles.length - 1 ? liveC : candles[j].c;
      const v = s / (i - from + 1);
      const x = x0 + i * step + step / 2;
      if (i === 0) ctx.moveTo(x, Y(v));
      else ctx.lineTo(x, Y(v));
    });
    ctx.stroke();

    // Live line
    const ly = Y(liveC);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(251,146,60,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x0, ly);
    ctx.lineTo(x1, ly);
    ctx.stroke();
    ctx.setLineDash([]);

    texture.needsUpdate = true;
  };

  return { texture, paint, dispose: () => texture.dispose() };
}
