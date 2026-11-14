# Shared 3D Scene Components Package

## Overview
Shared Three.js and React Three Fiber components for 3D hero scenes, including a scroll- and focus-driven camera controller (CameraRig), pointer-interactive object wrappers with hover lifts and HTML tooltips (Hotspot) and a 3D graduation cap geometry (Mortarboard).

## Interface
- `[CameraRig.tsx:CameraShot]`: Keyframe camera position and look-at target tuple interface
- `[CameraRig.tsx:CameraRig]`: R3F camera controller supporting scroll Catmull-Rom path scrubbing, focus fly-to with responsive framing offsets, pointer parallax and settling events
- `[Hotspot.tsx:Hotspot]`: Interactive 3D object wrapper providing raycast bounding-box optimization, hover elevation, cursor updates and HTML tooltip rendering
- `[Mortarboard.tsx:Mortarboard]`: 3D mesh component rendering a graduation mortarboard cap with skull, diamond board and Catmull-Rom tube tassel

## Invariants
- `[CameraRig.tsx:CameraRig]`: Adjusts perspective FOV responsively on portrait viewports (baseFov * 1.55 when aspect < 1, baseFov * 1.2 when aspect < 1.4)
- `[CameraRig.tsx:CameraRig]`: Computes responsive camera view offset via camera.setViewOffset to prevent 3D subjects from colliding with HTML overlay text unless centered=true
- `[CameraRig.tsx:CameraRig]`: When reducedMotion is enabled, bypasses camera path interpolation and clamps progress to 0
- `[CameraRig.tsx:CameraRig]`: Overrides camera trajectory when global window.__shot is defined
- `[Hotspot.tsx:Hotspot]`: Disables per-triangle raycasting on child meshes (mesh.raycast = () => {}) and substitutes a single cached bounding-box hit mesh with minimum 0.05m bounds
- `[Hotspot.tsx:Hotspot]`: Renders hover tooltip only when active=false, quiet=false and hovered=true

## Side Effects
- `[CameraRig.tsx:CameraRig]`: Mutates signals.moving flag every frame to notify the render loop whether the camera is moving
- `[CameraRig.tsx:CameraRig]`: Mutates Three.js camera position, FOV and projection matrix via useFrame
- `[CameraRig.tsx:CameraRig]`: Fires onSettle callback with cloned target Vector3 or null
- `[Hotspot.tsx:Hotspot]`: Modifies document.body.style.cursor to 'pointer' on hover and resets to '' on unhover
- `[Hotspot.tsx:Hotspot]`: Fires onHover callback with hovered group or null and onSelect callback on click

## Verification
- Run: `npm run build` in `/workspace/site-egm/web`
