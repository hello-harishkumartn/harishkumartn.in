import * as THREE from 'three';

/** Procedural textures for the hand-built parts of the arena. */

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * One cell of the net: dark knotted cord around a square hole (alpha-tested).
 * Real badminton nets have 15–20 mm square mesh; repeat this once per cell.
 */
export function netTexture() {
  const t = canvasTexture(64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 64, 7);
    ctx.fillRect(0, 0, 7, 64);
    // Knot
    ctx.beginPath();
    ctx.arc(3.5, 3.5, 6, 0, Math.PI * 2);
    ctx.fill();
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Shuttle tube label: a band of colour with type, wraps around the cylinder. */
export function tubeLabel(accent = '#e8561b') {
  return canvasTexture(1024, 256, (ctx) => {
    ctx.fillStyle = '#e4dfd4';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 1024, 46);
    ctx.fillRect(0, 210, 1024, 46);
    ctx.fillStyle = '#16181d';
    ctx.textBaseline = 'middle';
    for (const x of [36, 548]) {
      ctx.font = '800 76px "Archivo Variable", system-ui, sans-serif';
      ctx.fillStyle = '#16181d';
      ctx.fillText('FEATHER', x, 108);
      ctx.font = '500 30px "JetBrains Mono", monospace';
      ctx.fillStyle = accent;
      ctx.fillText('SPEED 77 · 12 PCS', x + 4, 168);
    }
  });
}

/** Acoustic wall panels: vertical slats with dark gaps (colour + bump). */
export function slatTexture() {
  const t = canvasTexture(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = '#9a9a9a';
      ctx.fillRect(0, 0, 256, 256);
      for (let x = 0; x < 256; x += 32) {
        const g = ctx.createLinearGradient(x, 0, x + 32, 0);
        g.addColorStop(0, '#202020');
        g.addColorStop(0.18, '#b0b0b0');
        g.addColorStop(0.82, '#9a9a9a');
        g.addColorStop(1, '#303030');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, 32, 256);
      }
    },
    false,
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft radial glow sprite for light fixtures and haze cards. */
export function glowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
}
