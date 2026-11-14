import { PATH_ORDER as COURT_ORDER } from './court/layout';
import { PATH_ORDER as DESK_ORDER } from './study/layout';
import type { SceneDefinition } from './types';

/**
 * Registry of available hero scenes. To add one (e.g. "Journey Globe"):
 *   1. Create src/scenes/<name>/ with a default component taking SceneProps.
 *   2. Add an entry below.
 *   3. Set site.scene in src/content.ts to its id and add its hotspots there.
 */
export const scenes = {
  court: {
    id: 'court',
    name: 'The Court',
    camera: { position: [7.6, 2.7, 12.6], fov: 34, far: 90 },
    pathOrder: COURT_ORDER,
    playable: true,
    load: () => import('./court/Court'),
  },
  'study-desk': {
    id: 'study-desk',
    name: 'Study Desk',
    camera: { position: [0.08, 0.86, 2.05], fov: 32 },
    pathOrder: DESK_ORDER,
    load: () => import('./study/StudyDesk'),
  },
} satisfies Record<string, SceneDefinition>;

export type SceneId = keyof typeof scenes;
