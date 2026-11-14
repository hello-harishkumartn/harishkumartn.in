import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, type RefObject } from 'react';
import * as THREE from 'three';
import type { ScreenPainter } from '../study/screens';

const frustum = new THREE.Frustum();
const viewProj = new THREE.Matrix4();

/**
 * Repaint a canvas screen at a capped rate (once under reduced motion, plus
 * once more when the web fonts have arrived). With `targets`, repaints (2D raster
 * plus a texture upload of up to 1536 x 672) are skipped while none of those
 * meshes is in the camera's view.
 */
export function useScreen(factory: () => ScreenPainter, fps: number, still: boolean, targets?: RefObject<THREE.Object3D | null>[]) {
  const screen = useMemo(factory, [factory]);
  useEffect(() => {
    screen.paint(4);
    let live = true;
    document.fonts?.ready.then(() => live && screen.paint(4));
    return () => {
      live = false;
      screen.dispose();
    };
  }, [screen]);
  const acc = useMemo(() => ({ t: 0, since: 0 }), []);
  useFrame(({ camera }, delta) => {
    if (still) return;
    acc.t += delta;
    acc.since += delta;
    if (acc.since < 1 / fps) return;
    if (targets?.length) {
      viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(viewProj);
      if (!targets.some((r) => r.current && frustum.intersectsObject(r.current))) return;
    }
    acc.since = 0;
    screen.paint(acc.t + 4);
  });
  return screen.texture;
}
