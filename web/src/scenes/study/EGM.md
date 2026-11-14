# Study Desk Scene Package

## Overview
The Study Desk hero scene depicting a warm golden-hour workspace with PBR electronics (laptop and monitor), Poly Haven CC0 furniture and stationery, an interactive journey globe, procedural screen simulations and a Rapier-physics flickable shuttlecock with realistic aerodynamic drag.

## Interface
- `[StudyDesk.tsx:default]`: Root 3D study desk scene component implementing SceneProps
- `[layout.ts:LAYOUT]`: World coordinates and Euler rotations for desk props and hotspots
- `[layout.ts:FOCUS_SHOTS]`: Camera position and target keyframes for study hotspots (laptop, chart, racket, globe and books)
- `[layout.ts:PATH]`: 7-point cinematic Catmull-Rom camera scroll path
- `[layout.ts:PATH_ORDER]`: Ordered list of hotspot IDs traversed during scroll (laptop, chart, racket, globe and books)
- `[Badminton.tsx:Racket]`: Shared 3D badminton racket mesh with frame, strings, shaft and overgrip
- `[Badminton.tsx:SHUTTLE]`: Constants for shuttlecock cork radius (0.0128m), skirt length (0.066m) and skirt radius (0.033m)
- `[Badminton.tsx:ShuttleMesh]`: 3D mesh component rendering shuttlecock cork, colored band, feathers skirt and binding threads
- `[Electronics.tsx:Laptop]`: 3D laptop model with instanced keyboard keys and live code pipeline screen
- `[Electronics.tsx:Monitor]`: 3D desktop monitor model with live simulated market chart screen
- `[Globe.tsx:GLOBE_R]`: Constant for globe sphere radius (0.12m)
- `[Globe.tsx:PINS]`: Geographic journey coordinates and labels (Bengaluru, Chennai IIT Madras and London UCL)
- `[Globe.tsx:latLon]`: Helper converting latitude/longitude to Vector3 matching Three.js SphereGeometry UV layout
- `[Globe.tsx:Globe]`: Interactive rotating globe with 23.4° axis tilt, animated journey pins and expanding flight arcs
- `[Room.tsx:DESK]`: Desk dimensions (width: 2.0m, depth: 0.95m, thickness: 0.045m, backZ: -0.475m)
- `[Room.tsx:Desk]`: Desk surface, steel legs, back wall and bounce floor meshes
- `[Room.tsx:DeskLamp]`: Desk lamp with emissive light bulb material
- `[Room.tsx:Plant]`: Preloaded plant model primitive
- `[Room.tsx:CameraProp]`: Preloaded vintage camera model primitive
- `[Room.tsx:Compass]`: Preloaded brass compass model primitive
- `[Room.tsx:Spectacles]`: Preloaded spectacles model primitive
- `[Room.tsx:PencilCup]`: Pencil cup model with nested pen and pencil primitives
- `[Room.tsx:Postcards]`: Fanned postcard models on desk
- `[Room.tsx:Books]`: Row of encyclopedic books with leaning end book
- `[Room.tsx:Notebook]`: Closed binder notebook model primitive
- `[Room.tsx:Mortarboard]`: Re-export of Mortarboard component from shared
- `[screens.ts:ScreenPainter]`: Interface for 2D dynamic canvas painters with texture, paint() and dispose()
- `[screens.ts:createCodeScreen]`: Factory generating 2D canvas texture simulating a code editor and Airflow/Spark DAG execution
- `[screens.ts:createChartScreen]`: Factory generating 2D canvas texture simulating a candlestick financial chart with PRNG random walk
- `[textures.ts:stringsTexture]`: Procedural 2D canvas texture for racket string bed
- `[textures.ts:featherTexture]`: Procedural 2D canvas texture generating 16 goose feathers for shuttlecock skirt
- `[textures.ts:gripTexture]`: Procedural 2D canvas texture for perforated overgrip wrap
- `[textures.ts:plasterTexture]`: Procedural 2D canvas texture for soft wall plaster bump map
- `[Effects.tsx:default]`: Postprocessing stack for study desk (N8AO, DepthOfField, Outline, Bloom, AgX ToneMapping, SMAA, Noise and Vignette)
- `[Physics.tsx:default]`: Rapier physics world with fixed desk/wall colliders and interactive flickable shuttlecock
- `[assets.ts:asset]`: Helper prefixing base asset URL with import.meta.env.BASE_URL

## Invariants
- `[StudyDesk.tsx:StudyDesk]`: Calls onReady only after 2 initial frames are rendered
- `[StudyDesk.tsx:StudyDesk]`: Defers loading Rapier physics chunk by 400ms after initial render when reducedMotion=false
- `[StudyDesk.tsx:StudyDesk]`: Disables SoftShadows on low tier, falling back to ContactShadows
- `[Globe.tsx:Globe]`: Smoothly rotates to target longitude faceY (-135°) and scales to 1.18x when focused
- `[Physics.tsx:Shuttle]`: Applies quadratic air drag at skirt center of pressure (cork-first aerodynamic self-stabilization at ~6.8 m/s terminal velocity)
- `[Physics.tsx:Shuttle]`: Automatically respawns shuttle to desk home position if y < -0.6 or |x| > 1.4 or z > 1.2
- `[screens.ts:createChartScreen]`: Uses deterministic PRNG mulberry32(7) ensuring consistent candlestick chart patterns across loads

## Side Effects
- `[StudyDesk.tsx:StudyDesk]`: Dynamically imports ./Physics chunk on idle
- `[Room.tsx:MODELS]`: Preloads 9 glTF binary assets from assets/models/ via useGLTF.preload
- `[Physics.tsx:Shuttle]`: Assigns global flick function to window.__flick
- `[Physics.tsx:Shuttle]`: Updates document.body.style.cursor to 'grab' on hover
- `[screens.ts:ScreenPainter]`: Allocates HTMLCanvasElement and THREE.CanvasTexture per screen instance

## Verification
- Run: `npm run build` in `/workspace/site-egm/web`
