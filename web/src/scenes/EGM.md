# Scenes Subsystem Blueprint

## Overview
Root scene registry and shared interface contracts for portfolio 3D hero scenes, orchestrating dynamic loading between the Badminton Court and Study Desk environments and defining frame-rate-decoupled signals.

## Interface
- `[index.ts:scenes]`: Registry record mapping scene IDs ('court', 'study-desk') to SceneDefinition objects with camera configs, path orders and dynamic loaders
- `[index.ts:SceneId]`: Union type of registered scene identifiers ('court' | 'study-desk')
- `[types.ts:Tier]`: Rendering tier type ('high' | 'low') for device capability targeting
- `[types.ts:SceneSignals]`: Mutable signaling container for scroll progress (0-1), rally score and camera motion flags
- `[types.ts:SceneProps]`: Unified component props interface implemented by all hero scenes
- `[types.ts:SceneDefinition]`: Metadata definition interface for hero scenes including camera presets, pathOrder and lazy load function
- Subdirectories and boundaries:
  - [Shared 3D Utilities](./shared/EGM.md): CameraRig, raycast-optimized Hotspot wrappers and Mortarboard mesh
  - [The Court](./court/EGM.md): Full arena environment with BWF court, lights, LED screens and Rapier rally physics
  - [Study Desk](./study/EGM.md): Golden-hour desk environment with PBR props, rotating globe and flickable shuttlecock

## Invariants
- `[types.ts:SceneProps]`: Hotspot identifiers passed to scenes must strictly match IDs defined in content.ts hero.hotspots
- `[types.ts:SceneSignals]`: Signals are mutated directly by page and scene systems during animation loops without triggering React re-renders
- `[index.ts:scenes]`: Scene components are packaged in distinct lazy chunks via dynamic import expressions

## Side Effects
- `[index.ts:scenes]`: Triggers asynchronous dynamic chunk imports when load() is invoked

## Verification
- Run: `npm run build` in `/workspace/site-egm/web`
