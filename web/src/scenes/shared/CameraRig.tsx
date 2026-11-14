import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { SceneSignals } from '../types';

export interface CameraShot {
  position: [number, number, number];
  target: [number, number, number];
}

interface Props {
  /** Keyframes of the cinematic scroll path (progress 0 → 1 visits them in order). */
  path: CameraShot[];
  /** Focus override; null = follow the scroll path. */
  focus: CameraShot | null;
  signals: SceneSignals;
  reducedMotion: boolean;
  /** Subtle pointer parallax (desktop). */
  parallax: boolean;
  /** Fires with the focus target once the camera has settled on it (used to aim depth of field). */
  onSettle?: (target: THREE.Vector3 | null) => void;
  /** Keep the focus shot centred (no room left for the HTML panel), e.g. while playing. */
  centered?: boolean;
}

const smootherstep = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

/**
 * Drives the camera for any scene: scroll-scrubbed Catmull-Rom path with short
 * holds at each stop, smooth fly-to on focus, pointer parallax, and a framing
 * offset so the subject sits beside (desktop) or above (mobile) the HTML overlay.
 */
export function CameraRig({ path, focus, signals, reducedMotion, parallax, onSettle, centered = false }: Props) {
  const { camera, size } = useThree();
  const curves = useMemo(() => {
    const pos = new THREE.CatmullRomCurve3(path.map((s) => new THREE.Vector3(...s.position)), false, 'centripetal');
    const look = new THREE.CatmullRomCurve3(path.map((s) => new THREE.Vector3(...s.target)), false, 'centripetal');
    return { pos, look };
  }, [path]);

  const cur = useRef({ pos: new THREE.Vector3(...path[0].position), look: new THREE.Vector3(...path[0].target) });
  const goal = useRef({ pos: new THREE.Vector3(), look: new THREE.Vector3() });
  const offset = useRef(new THREE.Vector2());
  // Scratch objects reused every frame (no per-frame allocations).
  const scratch = useMemo(() => ({ off: new THREE.Vector2() }), []);
  const settled = useRef(false);
  const onSettleRef = useRef(onSettle);
  onSettleRef.current = onSettle;

  useEffect(() => {
    settled.current = false;
    if (!focus) onSettleRef.current?.(null);
  }, [focus]);

  const aspect = size.width / Math.max(size.height, 1);
  const portrait = aspect < 1;
  // Widen the lens on narrow screens rather than dollying far back.
  const baseFov = useRef((camera as THREE.PerspectiveCamera).fov);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = portrait ? baseFov.current * 1.55 : aspect < 1.4 ? baseFov.current * 1.2 : baseFov.current;
    cam.updateProjectionMatrix();
  }, [camera, portrait, aspect]);

  useFrame((state, delta) => {
    const g = goal.current;
    let offX = 0;
    let offY = 0;
    const debug = (window as { __shot?: CameraShot }).__shot;
    if (debug) {
      g.pos.set(...debug.position);
      g.look.set(...debug.target);
    } else if (focus) {
      g.pos.set(...focus.position);
      g.look.set(...focus.target);
      // Narrow screens: back off a little so the subject still fits.
      const fit = portrait ? 1.25 : 1;
      g.pos.sub(g.look).multiplyScalar(fit).add(g.look);
      if (centered) offY = 0;
      else if (portrait) offY = 0.17;
      else offX = 0.2;
    } else {
      // Map progress to the path with a hold at each keyframe.
      const p = reducedMotion ? 0 : THREE.MathUtils.clamp(signals.progress, 0, 1);
      const segs = path.length - 1;
      const t = p * segs;
      const i = Math.min(Math.floor(t), segs - 1);
      const f = smootherstep(THREE.MathUtils.clamp((t - i - 0.18) / 0.64, 0, 1));
      const u = (i + f) / segs;
      curves.pos.getPoint(u, g.pos);
      curves.look.getPoint(u, g.look);
      const fit = portrait ? 1.28 : 1;
      g.pos.sub(g.look).multiplyScalar(fit).add(g.look);
      // Intro shot: push the desk right on wide screens to clear the hero copy; down on phones.
      const intro = 1 - THREE.MathUtils.clamp(t / 0.6, 0, 1);
      if (portrait) offY = -0.3 * intro;
      else offX = 0.13 * intro;
      if (parallax && !reducedMotion) {
        // Scale the sway with shot distance so it feels the same on a desk or in an arena.
        const d = g.pos.distanceTo(g.look);
        g.pos.x += state.pointer.x * 0.03 * d;
        g.pos.y += state.pointer.y * 0.018 * d;
      }
    }

    if (reducedMotion) {
      cur.current.pos.copy(g.pos);
      cur.current.look.copy(g.look);
      offset.current.set(offX, offY);
    } else {
      const k = 1 - Math.exp(-delta * (focus ? 2.6 : 4));
      cur.current.pos.lerp(g.pos, k);
      cur.current.look.lerp(g.look, k);
      offset.current.lerp(scratch.off.set(offX, offY), 1 - Math.exp(-delta * 3));
    }
    // Tell the render loop whether the camera is still travelling (phones render on demand).
    const dist = Math.max(g.pos.distanceTo(g.look), 1e-3);
    signals.moving =
      cur.current.pos.distanceToSquared(g.pos) > (dist * 2e-4) ** 2 ||
      cur.current.look.distanceToSquared(g.look) > (dist * 2e-4) ** 2 ||
      Math.abs(offset.current.x - offX) + Math.abs(offset.current.y - offY) > 1e-3;

    camera.position.copy(cur.current.pos);
    camera.lookAt(cur.current.look);
    const cam = camera as THREE.PerspectiveCamera;
    const w = size.width;
    const h = size.height;
    cam.setViewOffset(w, h, -offset.current.x * w, offset.current.y * h, w, h);

    if (focus && !settled.current && cur.current.pos.distanceTo(g.pos) < 0.01 * g.pos.distanceTo(g.look)) {
      settled.current = true;
      onSettleRef.current?.(g.look.clone());
    }
  });

  return null;
}
