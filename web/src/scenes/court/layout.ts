import type { CameraShot } from '../shared/CameraRig';

type V3 = [number, number, number];
interface Place {
  position: V3;
  rotation: V3;
}

/**
 * BWF court dimensions (metres, outer edges of the lines; lines are 40 mm wide and
 * belong to the area they bound). The court runs along z with the net at z = 0;
 * the visitor's side is +z.
 */
export const BWF = {
  length: 13.4,
  width: 6.1,
  singlesWidth: 5.18,
  line: 0.04,
  /** Short service line, measured from the net. */
  shortService: 1.98,
  /** Doubles long service line, measured in from the back boundary. */
  doublesLong: 0.76,
  postHeight: 1.55,
  netCentre: 1.524,
  netDepth: 0.76,
};

export const HALF_W = BWF.width / 2;
export const HALF_L = BWF.length / 2;

/** The green synthetic mat sits on the maple floor with a margin around the lines. */
export const MAT = { w: 7.6, l: 15.2, t: 0.0045 };

/** The arena shell. */
export const ARENA = { halfX: 16, halfZ: 15.5, height: 11.5 };

/** Where the props around the court stand. */
export const LAYOUT = {
  bench: { position: [4.75, 0, 2.6], rotation: [0, -Math.PI / 2, 0] },
  screen: { position: [4.85, 0, -2.0], rotation: [0, -Math.PI / 2 + 0.3, 0] },
  ticker: { position: [4.7, 0, -6.4], rotation: [0, -Math.PI / 2 + 0.42, 0] },
  chalkboard: { position: [-4.6, 0, -4.9], rotation: [0, Math.PI / 2 - 0.45, 0] },
  bookshelf: { position: [-5.55, 0, -1.6], rotation: [0, Math.PI / 2, 0] },
  globe: { position: [-4.7, 0, 2.7], rotation: [0, 0.4, 0] },
  scoreboard: { position: [0, 6.2, -13.2], rotation: [0, 0, 0] },
} satisfies Record<string, Place>;

/** Close-up framing for each hotspot when focused. */
export const FOCUS_SHOTS: Record<string, CameraShot> = {
  scoreboard: { position: [0.5, 4.0, -0.2], target: [0, 6.1, -13.2] },
  bench: { position: [2.1, 1.55, 3.9], target: [4.75, 0.55, 2.6] },
  screen: { position: [2.6, 1.55, -0.3], target: [4.85, 1.25, -2.0] },
  ticker: { position: [2.1, 1.6, -3.7], target: [4.7, 0.95, -6.4] },
  chalkboard: { position: [-2.4, 1.6, -3.0], target: [-4.6, 0.95, -4.9] },
  bookshelf: { position: [-2.7, 1.55, -0.6], target: [-5.55, 1.05, -1.6] },
  globe: { position: [-2.3, 1.85, 4.7], target: [-4.7, 1.2, 2.7] },
};

/** Behind the visitor's baseline, looking down the court for the rally. */
export const PLAY_SHOT: CameraShot = { position: [0, 2.6, 7.3], target: [0, 1.05, -3] };

/** Cinematic scroll path: wide intro → each spot in turn → pull back over the court. */
export const PATH: CameraShot[] = [
  { position: [7.6, 2.7, 12.6], target: [0, 2.1, -3] },
  { position: [1.0, 3.6, -0.6], target: [0, 6.0, -13.2] },
  { position: [2.4, 1.6, 4.6], target: [4.75, 0.55, 2.6] },
  { position: [2.6, 1.6, 0.2], target: [4.85, 1.2, -2.0] },
  { position: [2.2, 1.7, -3.4], target: [4.7, 0.95, -6.4] },
  { position: [-2.2, 1.7, -2.6], target: [-4.6, 0.95, -4.9] },
  { position: [-2.4, 1.6, 0.0], target: [-5.55, 1.05, -1.6] },
  { position: [-2.4, 1.8, 4.8], target: [-4.75, 1.05, 2.7] },
  { position: [0, 9.5, 13.5], target: [0, 0, -0.5] },
];

/** Hotspot order along the path (index i ↔ PATH[i + 1]). */
export const PATH_ORDER = ['scoreboard', 'bench', 'screen', 'ticker', 'chalkboard', 'bookshelf', 'globe'];

/** Rally geometry: the plane the visitor's racket moves in, and the opponent's. */
export const RALLY = { playerZ: 3.9, opponentZ: -3.9, minY: 0.55, maxY: 2.7, maxX: 2.8 };
