# The Court Scene Package

## Overview
The Court hero scene depicting a BWF-accurate indoor badminton arena at night, featuring a maple floor with PU synthetic mat, volumetric light shafts, instanced bleachers, animated courtside LED displays and a playable 120Hz Rapier physics badminton rally mini-game.

## Interface
- `[Court.tsx:default]`: Root 3D badminton court scene component implementing SceneProps
- `[Arena.tsx:bake]`: Utility merging static BufferGeometries into a single draw-call geometry
- `[Arena.tsx:courtLines]`: Function calculating BWF court line bounding rectangles
- `[Arena.tsx:Floor]`: Maple court floor mesh with MeshReflectorMaterial on high tier and PU green synthetic mat
- `[Arena.tsx:Net]`: BWF badminton net mesh (1.55m posts, 1.524m center sag) with alpha-tested cord texture and weighted wheel bases
- `[Arena.tsx:Shell]`: Arena boundary walls with slatted acoustic texture, kick band, ceiling and merged roof trusses
- `[Arena.tsx:Bleachers]`: Tiered spectator seating with concrete steps, railings and instanced colored seats
- `[Arena.tsx:FIXTURES]`: Spatial coordinates for 8 high-bay overhead light fixtures
- `[Arena.tsx:LightRigs]`: High-bay light fixture bodies with glowing emissive faces and volumetric beam cones
- `[Arena.tsx:PerimeterBoards]`: Courtside A-frame LED advertising boards with animated crawler screen
- `[Arena.tsx:useAimedLight]`: Hook attaching and tracking aim target for SpotLight or DirectionalLight
- `[Arena.tsx:Dust]`: Volumetric dust particle points drifting through arena light shafts
- `[layout.ts:BWF]`: Official Badminton World Federation court dimensions (13.4m length, 6.1m doubles width, 5.18m singles width, 40mm line width, 1.55m post height, 1.524m net center)
- `[layout.ts:HALF_W]`: Court half-width constant (3.05m)
- `[layout.ts:HALF_L]`: Court half-length constant (6.7m)
- `[layout.ts:MAT]`: Synthetic court mat dimensions (7.6m width, 15.2m length, 4.5mm thickness)
- `[layout.ts:ARENA]`: Arena shell dimensions (halfX: 16m, halfZ: 15.5m, height: 11.5m)
- `[layout.ts:LAYOUT]`: Coordinates and rotations for arena props (bench, screen, ticker, chalkboard, bookshelf, globe and scoreboard)
- `[layout.ts:FOCUS_SHOTS]`: Close-up camera framing keyframes for court hotspots
- `[layout.ts:PLAY_SHOT]`: Camera framing keyframe positioned behind visitor baseline for rally play
- `[layout.ts:PATH]`: 9-point cinematic Catmull-Rom camera scroll path
- `[layout.ts:PATH_ORDER]`: Hotspot traversal order (scoreboard, bench, screen, ticker, chalkboard, bookshelf and globe)
- `[layout.ts:RALLY]`: Playable rally geometry bounds (playerZ: 3.9, opponentZ: -3.9, minY: 0.55, maxY: 2.7, maxX: 2.8)
- `[Props.tsx:KitTextureSize]`: React context providing texture resolution (512 or 1024) for kit props
- `[Props.tsx:BenchKit]`: Wooden bench model with thermo bag, shuttle tubes, water bottle and leaning racket
- `[Props.tsx:ClipScreen]`: Rolling TV cart with animated top-down rally replay canvas
- `[Props.tsx:TickerBoard]`: Stand-mounted LED board with financial candlestick chart and scrolling ticker
- `[Props.tsx:Scoreboard]`: Hanging arena LED scoreboard displaying career history and live rally scores
- `[Props.tsx:Chalkboard]`: Standing chalkboard model with procedural chalk drawing overlay
- `[Props.tsx:Bookshelf]`: Wooden bookshelf with merged book spines, trophy and graduation mortarboard
- `[Props.tsx:GlobeStand]`: Plinth-mounted enlarged globe display
- `[Props.tsx:CourtLitter]`: Loose rackets and shuttlecocks scattered around court
- `[displays.ts:RallyScore]`: Score data interface containing count and best
- `[displays.ts:createScoreboard]`: Canvas painter factory for LED scoreboard
- `[displays.ts:createTicker]`: Canvas painter factory for courtside LED ticker
- `[displays.ts:createClipScreen]`: Canvas painter factory for top-down badminton rally replay
- `[displays.ts:createPerimeterBoard]`: Canvas painter factory for courtside LED crawler
- `[displays.ts:createChalk]`: Canvas texture generator for chalkboard handwriting
- `[displays.ts:createSpines]`: Canvas texture generator for book spines with degrees
- `[textures.ts:netTexture]`: Procedural alpha texture for net mesh and knot cells
- `[textures.ts:tubeLabel]`: Procedural label texture for shuttlecock cylinder packaging
- `[textures.ts:slatTexture]`: Procedural bump and albedo texture for wall slats
- `[textures.ts:glowTexture]`: Radial gradient texture for light fixtures and floor shadow blobs
- `[useScreen.ts:useScreen]`: Hook managing throttled canvas repaints with camera frustum culling
- `[Effects.tsx:default]`: Postprocessing stack for arena (N8AO, DepthOfField, Outline, Bloom, AgX ToneMapping, SMAA, Noise and Vignette)
- `[Rally.tsx:default]`: 120Hz Rapier physics badminton rally mini-game with AI opponent and visitor racket control

## Invariants
- `[Court.tsx:ShadowUpdates]`: Disables auto-updating shadow maps (gl.shadowMap.autoUpdate = false); selectively pulses updates only upon hover, focus or play state transitions
- `[Arena.tsx:Floor]`: Injects box-filtered anti-aliased line rendering directly into court mat physical material shader via onBeforeCompile
- `[Arena.tsx:Shell]`: Consolidates roof trusses into a single baked BufferGeometry
- `[useScreen.ts:useScreen]`: Skips canvas texture repaint when target meshes fall outside the active camera frustum
- `[Effects.tsx:Effects]`: When playing=true, adjusts depth-of-field target and lowers bokeh blur to maintain sharpness across the entire court
- `[Rally.tsx:Rally]`: Executes Rapier physics simulation at fixed 120Hz (DT = 1/120) with quadratic aerodynamic drag (VT = 6.8 m/s)
- `[Rally.tsx:Game]`: Automated play testing hook exposed via window.__autoplay

## Side Effects
- `[Court.tsx:Court]`: Prefetches ./Rally physics chunk 2.5s after mount on high-tier connections
- `[Props.tsx:useGLTF.preload]`: Preloads glTF models for bench, bookshelf and chalkboard
- `[Rally.tsx:Game]`: Mutates signals.rally object every physics step and writes best score to localStorage 'hk:rally-best'
- `[displays.ts:makeCanvas]`: Allocates HTMLCanvasElement and THREE.CanvasTexture resources

## Verification
- Run: `npm run build` in `/workspace/site-egm/web`
