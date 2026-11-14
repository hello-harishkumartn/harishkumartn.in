# Presentation Components Package

## Overview
Core presentation components for site navigation, hero stage with 3D canvas and 2D fallback, section wrappers and media placeholders.

## Interface
- `[Hero.tsx:Hero]`: Primary 3D/2D interactive hero section managing scene stage, scroll chapters, focus panels and rally mini-game
- `[AnimatedHero.tsx:AnimatedHero]`: Headline and interactive action buttons overlaid on hero scene with rotating keywords
- `[HeroCanvas.tsx:default]`: Lazy-loaded WebGL canvas wrapping Three.js scene, performance monitoring and adaptive frameloop
- `[Loader.tsx:Loader]`: Real asset loading progress chip with shimmer indicator
- `[Nav.tsx:Nav]`: Floating navigation header with active section tracking and smooth scroll triggers
- `[Placeholder.tsx:PlaceholderBadge]`: Visual tag marking incomplete content flagged with placeholder: true
- `[Placeholder.tsx:PlaceholderArt]`: Procedural SVG placeholder art for missing photography
- `[Section.tsx:Section]`: Section container providing staggered scroll-reveal animations
- `[Section.tsx:Card]`: Interactive card component with dynamic pointer-following radial highlight
- `[Section.tsx:Pill]`: Status pill badge supporting active pulsing indicator
- `[Section.tsx:revealGroup]`: Framer Motion variant configuring staggered children transitions
- `[Section.tsx:revealItem]`: Framer Motion variant defining upward fade-in animation
- Child component contracts:
  - [UI Primitives](./ui/EGM.md): Reusable UI primitives (Button and TextShimmer)

## Invariants
- `[Hero.tsx:STORAGE_KEY]`: 3D scene disable toggle is persisted in localStorage under 'hk:3d-off'
- `[Hero.tsx:off]`: When no 'hk:3d-off' preference is stored, off defaults to false so the 3D court mounts on all device tiers (including low-tier mobile). A stored '1' still turns 3D off
- `[Hero.tsx:focusCopy]`: Hotspot details and actions are strictly constrained to valid SectionId entries
- `[HeroCanvas.tsx:dprRange]`: DPR is constrained between native device DPR, tier constraints and fallback floor
- `[Nav.tsx:IntersectionObserver]`: Active nav indicator updates when section boundaries intersect -30% 0px -65% 0px root margin
- `[Section.tsx:Card]`: Updates CSS variables --mx and --my on pointer movement within card bounds

## Side Effects
- `[Hero.tsx:window.__focus, window.__play]`: Binds global debug and testing hooks to window
- `[Hero.tsx:localStorage]`: Reads and writes 'hk:3d-off' key in browser local storage
- `[Hero.tsx:addEventListener]`: Registers event listeners on window for scroll, resize, keydown and hashchange
- `[HeroCanvas.tsx:addEventListener]`: Attaches event listeners for document visibilitychange and user interaction events
- `[HeroCanvas.tsx:PerformanceMonitor]`: Dynamically adjusts DPR and alters rendering tier upon framerate decline/incline
- `[Nav.tsx:addEventListener]`: Observes section DOM elements via IntersectionObserver and listens to scrollY changes

## Verification
- Run: `npm run build` in `/workspace/site-egm/web`
