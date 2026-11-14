import * as THREE from 'three';

/** Small procedural textures for the hand-built props (racket strings, feathers, grip, plaster). */

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

/** Racket string bed: white strings on transparent, clipped to the head ellipse in UV space. */
export function stringsTexture() {
  return canvasTexture(512, 512, (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(256, 256, 252, 252, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = 'rgba(245,245,240,1)';
    ctx.lineWidth = 2.4;
    for (let i = 0; i <= 22; i++) {
      const x = 12 + (i / 22) * 488;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(230,230,224,1)';
    for (let i = 0; i <= 22; i++) {
      const y = 12 + (i / 22) * 488;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    ctx.restore();
  });
}

/** 16 goose feathers around a shuttle skirt (u = around, v = along the skirt). */
export function featherTexture() {
  return canvasTexture(1024, 256, (ctx) => {
    ctx.clearRect(0, 0, 1024, 256);
    const n = 16;
    const fw = 1024 / n;
    for (let i = 0; i < n; i++) {
      const cx = i * fw + fw / 2;
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, 'rgba(250,248,242,0.95)');
      g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.fillStyle = g;
      ctx.beginPath();
      // Vane: narrow at the cork (v=0), wide and rounded at the tip (v=1).
      ctx.moveTo(cx - fw * 0.08, 0);
      ctx.bezierCurveTo(cx - fw * 0.5, 120, cx - fw * 0.62, 210, cx - fw * 0.3, 252);
      ctx.quadraticCurveTo(cx, 262, cx + fw * 0.3, 252);
      ctx.bezierCurveTo(cx + fw * 0.62, 210, cx + fw * 0.5, 120, cx + fw * 0.08, 0);
      ctx.closePath();
      ctx.fill();
      // Barbs
      ctx.strokeStyle = 'rgba(200,196,186,0.35)';
      ctx.lineWidth = 1;
      for (let y = 40; y < 245; y += 7) {
        ctx.beginPath();
        ctx.moveTo(cx, y);
        ctx.lineTo(cx - fw * 0.4, y + 10);
        ctx.moveTo(cx, y);
        ctx.lineTo(cx + fw * 0.4, y + 10);
        ctx.stroke();
      }
      // Rachis (shaft)
      ctx.strokeStyle = 'rgba(225,220,205,1)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, 236);
      ctx.stroke();
    }
  });
}

/** Overgrip wrap: diagonal ridges, used as a bump map. */
export function gripTexture() {
  const t = canvasTexture(
    256,
    256,
    (ctx) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 256, 256);
      for (let i = -256; i < 512; i += 32) {
        const g = ctx.createLinearGradient(i, 0, i + 32, 0);
        g.addColorStop(0, '#303030');
        g.addColorStop(0.15, '#d0d0d0');
        g.addColorStop(0.85, '#a0a0a0');
        g.addColorStop(1, '#303030');
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(i, 0);
        ctx.transform(1, 0, 0.55, 1, 0, 0);
        ctx.fillRect(0, 0, 32, 256);
        ctx.restore();
      }
      // Micro perforations
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let k = 0; k < 900; k++) ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
    },
    false,
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Soft plaster noise for the wall (bump map). */
export function plasterTexture() {
  const t = canvasTexture(
    512,
    512,
    (ctx) => {
      const img = ctx.createImageData(512, 512);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 118 + Math.random() * 20;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      ctx.filter = 'blur(1.2px)';
      ctx.drawImage(ctx.canvas, 0, 0);
    },
    false,
  );
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 2);
  return t;
}
