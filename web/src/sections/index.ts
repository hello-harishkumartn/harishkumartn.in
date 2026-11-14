import { lazy, type ComponentType } from 'react';
import type { SectionId } from '../content';

/**
 * Section id → component. Page order follows `nav` in content.ts.
 * Sections are code-split and lazy loaded.
 */
export const sectionComponents: Record<Exclude<SectionId, 'home'>, ComponentType> = {
  about: lazy(() => import('./About').then((m) => ({ default: m.About }))),
  work: lazy(() => import('./Work').then((m) => ({ default: m.Work }))),
  education: lazy(() => import('./Education').then((m) => ({ default: m.Education }))),
  ideas: lazy(() => import('./Ideas').then((m) => ({ default: m.Ideas }))),
  markets: lazy(() => import('./Markets').then((m) => ({ default: m.Markets }))),
  badminton: lazy(() => import('./Badminton').then((m) => ({ default: m.Badminton }))),
  travel: lazy(() => import('./Travel').then((m) => ({ default: m.Travel }))),
  social: lazy(() => import('./Social').then((m) => ({ default: m.Social }))),
  contact: lazy(() => import('./Contact').then((m) => ({ default: m.Contact }))),
};
