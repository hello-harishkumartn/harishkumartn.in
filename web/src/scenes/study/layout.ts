import type { CameraShot } from '../shared/CameraRig';

type V3 = [number, number, number];
interface Place {
  position: V3;
  rotation: V3;
}

/** Where everything sits on the desk (metres; desk top at y = 0, wall behind at z ≈ -0.5). */
export const LAYOUT = {
  laptop: { position: [-0.24, 0, 0.06], rotation: [0, 0.22, 0] },
  monitor: { position: [0.12, 0, -0.3], rotation: [0, -0.1, 0] },
  lamp: { position: [-0.86, 0, -0.38], rotation: [0, 0.7, 0] },
  books: { position: [-0.74, 0, -0.36], rotation: [0, 0.12, 0] },
  notebook: { position: [-0.62, 0, 0.08], rotation: [0, 0.35, 0] },
  cap: { position: [-0.6, 0.024, 0.07], rotation: [0.05, 0.5, -0.03] },
  cup: { position: [-0.38, 0, -0.32], rotation: [0, 0.5, 0] },
  spectacles: { position: [0.06, 0.023, 0.24], rotation: [0, -2.6, 0] },
  globe: { position: [0.64, 0, -0.27], rotation: [0, 0, 0] },
  postcards: { position: [0.52, 0, 0.0], rotation: [0, 0.1, 0] },
  camera: { position: [0.83, 0, 0.02], rotation: [0, -0.7, 0] },
  compass: { position: [0.42, 0, -0.16], rotation: [0, 0.6, 0] },
  plant: { position: [0.88, 0, -0.36], rotation: [0, 0, 0] },
  racket: { position: [0.6, 0.012, 0.32], rotation: [-Math.PI / 2 + 0.012, 0, 1.05] },
  shuttle: { position: [0.26, 0, 0.24], rotation: [0, 0, 0] },
} satisfies Record<string, Place>;

/** Close-up framing for each hotspot when focused. */
export const FOCUS_SHOTS: Record<string, CameraShot> = {
  laptop: { position: [-0.12, 0.3, 0.55], target: [-0.26, 0.1, -0.02] },
  chart: { position: [0.1, 0.36, 0.42], target: [0.12, 0.32, -0.32] },
  racket: { position: [0.36, 0.46, 0.66], target: [0.3, 0.0, 0.14] },
  globe: { position: [0.44, 0.4, 0.5], target: [0.64, 0.23, -0.27] },
  books: { position: [-0.22, 0.5, 0.72], target: [-0.66, 0.1, -0.14] },
};

/** Cinematic scroll path: wide intro → each object in turn → pull back. */
export const PATH: CameraShot[] = [
  { position: [0.1, 0.78, 1.82], target: [0.08, 0.17, -0.12] },
  { position: [-0.05, 0.36, 0.7], target: [-0.25, 0.12, -0.02] },
  { position: [0.18, 0.4, 0.52], target: [0.12, 0.3, -0.3] },
  { position: [0.36, 0.5, 0.8], target: [0.3, 0.0, 0.14] },
  { position: [0.42, 0.38, 0.5], target: [0.64, 0.22, -0.27] },
  { position: [-0.26, 0.44, 0.58], target: [-0.68, 0.1, -0.16] },
  { position: [0.0, 1.05, 1.15], target: [0.0, 0.0, -0.08] },
];

/** Hotspot order along the path (index i ↔ PATH[i + 1]). */
export const PATH_ORDER = ['laptop', 'chart', 'racket', 'globe', 'books'];
