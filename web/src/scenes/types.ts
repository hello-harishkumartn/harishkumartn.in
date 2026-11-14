import type { ComponentType } from 'react';
import type { Hotspot } from '../content';

/**
 * Contract every 3D hero scene implements. The page only talks to scenes
 * through this interface, so swapping the desk for "The Court" or
 * "Journey Globe" is a one-line change in content.ts (site.scene).
 */

/** Rendering budget. `high` = laptops/desktops, `low` = phones and weak devices. */
export type Tier = 'high' | 'low';

/** Mutable values the page writes and the scene reads every frame (no React re-renders). */
export interface SceneSignals {
  /** 0 → 1 scroll progress through the hero's cinematic camera path. */
  progress: number;
  /** Mini-game score written by scenes that have one (The Court's rally). */
  rally?: { count: number; best: number; state: 'idle' | 'live' | 'over' };
  /** Set by the camera rig while the camera is still travelling (keeps the render loop at full rate). */
  moving?: boolean;
}

export interface SceneProps {
  /** Clickable things, from content.ts. Scenes place objects for the ids they know. */
  hotspots: Hotspot[];
  tier: Tier;
  /** Runtime downgrade from the PerformanceMonitor: drop the most expensive effects. */
  degraded: boolean;
  /** No idle animation, no scroll camera path, camera cuts instead of flies. */
  reducedMotion: boolean;
  /** Hotspot the camera is focused on (null = following the scroll path). */
  focusId: string | null;
  /** Ask the page to focus a hotspot (or clear focus with null). */
  onFocus: (id: string | null) => void;
  signals: SceneSignals;
  /** Fired once the scene has rendered with all of its assets. */
  onReady?: () => void;
  /** Scenes with a mini-game (`playable`): true while the visitor is playing. */
  playing?: boolean;
}

export interface SceneDefinition {
  id: string;
  name: string;
  camera: { position: [number, number, number]; fov: number; far?: number };
  /** Hotspot ids in the order the scroll camera visits them. */
  pathOrder: string[];
  /** Has a playable mini-game (shows the "Play a rally" button). */
  playable?: boolean;
  /** Lazy loader so each scene lands in its own chunk. */
  load: () => Promise<{ default: ComponentType<SceneProps> }>;
}
