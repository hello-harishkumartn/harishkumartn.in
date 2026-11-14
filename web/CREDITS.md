# Credits & licences

Every third-party asset, component and tool used on harishkumartn.in.

## The Court (default scene): 3D models (all CC0 1.0, Poly Haven)

Downloaded as 1k glTF from the Poly Haven API, then compressed with gltf-transform
(`optimize --compress meshopt --texture-compress webp --texture-size 1024`) into
`public/assets/court/models/*.glb`.

| File | Asset | Author(s) | Source | Licence | Used as |
|---|---|---|---|---|---|
| `painted_wooden_bench.glb` | Painted Wooden Bench | Kirill Sannikov | https://polyhaven.com/a/painted_wooden_bench | CC0 1.0 | Courtside bench (About) |
| `wooden_bookshelf_worn.glb` | Wooden Bookshelf Worn | Ulan Cabanilla | https://polyhaven.com/a/wooden_bookshelf_worn | CC0 1.0 | Bookshelf (Education) |
| `standing_chalkboard_01.glb` | Standing Chalkboard 01 | ParzivalCG | https://polyhaven.com/a/standing_chalkboard_01 | CC0 1.0 | Ideas board (chalk composited in code) |

## The Court: textures & lighting (all CC0 1.0, Poly Haven)

Converted to WebP with ffmpeg into `public/assets/court/`. The floor albedo was brightened and
warmed towards sports maple; nothing else was edited.

| File | Asset | Author(s) | Source | Licence |
|---|---|---|---|---|
| `textures/floor_{diff,nor,arm}_{1024,2048}.webp` | Wood Floor | Dimitrios Savva | https://polyhaven.com/a/wood_floor | CC0 1.0 |
| `textures/mat_{nor,rough}_1024.webp` | Concrete Floor Painted (micro-surface of the court mat) | Rob Tuytel | https://polyhaven.com/a/concrete_floor_painted | CC0 1.0 |
| `textures/fabric_{diff,nor,arm}_1024.webp` | Denim Fabric 04 (kit-bag nylon, towel) | colormass, Rico Cilliers | https://polyhaven.com/a/denim_fabric_04 | CC0 1.0 |
| `textures/leather_{diff,nor}_1024.webp` | Fabric Leather 02 (bag panel, handles) | Rob Tuytel | https://polyhaven.com/a/fabric_leather_02 | CC0 1.0 |
| `textures/wall_{diff,nor,arm}_1024.webp` | Brushed Concrete (arena walls) | Dario Barresi, Dimitrios Savva | https://polyhaven.com/a/brushed_concrete | CC0 1.0 |
| `hdri/squash_court_1k.hdr` | Squash Court (HDRI, reflections only) | Greg Zaal, Jarod Guest | https://polyhaven.com/a/squash_court | CC0 1.0 |

Also reused from the Study Desk scene: the NASA Blue Marble earth texture (globe), and the
hand-built racket, shuttlecock and mortarboard.

Built in code (no third-party asset; Poly Haven has no sports-hall kit): the BWF court mat and
every line (13.4 × 6.1 m, 40 mm lines, singles/doubles side lines, short and long service
lines, centre lines), the net (1.55 m posts, 1.524 m centre, 760 mm mesh, 75 mm tape) and its
wheeled posts, arena walls, roof trusses, bleachers (instanced seats), high-bay fixtures with
volumetric light shafts and dust, LED perimeter boards, the hanging scoreboard, the markets
ticker, the courtside clip screen, the racket thermo bag, shuttle tubes, water bottle, books,
trophy and the globe plinth. All LED/screen content is painted on canvases from `content.ts`.

> Author names above are taken from each asset's Poly Haven page/API at download time.

## Study Desk scene: 3D models (all CC0 1.0, Poly Haven)

Downloaded as 1k glTF from the Poly Haven API, then compressed with gltf-transform
(meshopt geometry, WebP textures resized to 512–1024 px) into `public/assets/models/*.glb`.

| File | Asset | Author(s) | Source | Licence |
|---|---|---|---|---|
| `desk-lamp.glb` | Desk Lamp Arm 01 | Yann Kervran, Kuutti Siitonen | https://polyhaven.com/a/desk_lamp_arm_01 | CC0 1.0 |
| `plant.glb` | Potted Plant 04 | James Ray Cock | https://polyhaven.com/a/potted_plant_04 | CC0 1.0 |
| `camera.glb` | Camera 01 | Rajil Jose Macatangay | https://polyhaven.com/a/Camera_01 | CC0 1.0 |
| `postcards.glb` | Postcard Set 01 | James Ray Cock, Jurita Burger | https://polyhaven.com/a/postcard_set_01 | CC0 1.0 |
| `spectacles.glb` | Round Spectacles | Sean Buckley | https://polyhaven.com/a/round_spectacles | CC0 1.0 |
| `stationery.glb` | Stationery Supplies | Mateusz Sadek | https://polyhaven.com/a/stationery_supplies | CC0 1.0 |
| `compass.glb` | Seadogs Compass | Benny Weimer | https://polyhaven.com/a/seadogs_compass | CC0 1.0 |
| `books.glb` | Book Encyclopedia Set 01 | John Malcolm | https://polyhaven.com/a/book_encyclopedia_set_01 | CC0 1.0 |
| `notebook.glb` | Binder Notebook | DaDrood | https://polyhaven.com/a/binder_notebook | CC0 1.0 |

## Study Desk scene: textures & lighting

| File | Asset | Author(s) | Source | Licence |
|---|---|---|---|---|
| `textures/wood_{diff,nor,arm}_{1024,2048}.webp` | Wood Table 001 (PBR set) | Dimitrios Savva, Rico Cilliers | https://polyhaven.com/a/wood_table_001 | CC0 1.0 |
| `hdri/brown_photostudio_02_1k.hdr` | Brown Photostudio 02 (HDRI) | Sergej Majboroda | https://polyhaven.com/a/brown_photostudio_02 | CC0 1.0 |
| `textures/earth_2048.webp` | Blue Marble: Land Surface, Shallow Water, and Shaded Topography | NASA Goddard Space Flight Center (Reto Stöckli; Visible Earth) | https://visibleearth.nasa.gov/images/57752 (file `land_shallow_topo_2048.jpg`) | Public domain (NASA imagery) |

Built in code (no third-party asset): the laptop, monitor, globe stand/pins/arcs, badminton
racket, shuttlecock, mortarboard, desk top geometry, wall plaster, feather/string/grip textures
and both animated screens. Poly Haven has no modern laptop/monitor/racket/shuttle, so these use
PBR materials with bevelled geometry instead.

## UI components (21st.dev)

21st.dev's registry (`https://21st.dev/r/...`, also via `npx shadcn add`) returned
`403 Authentication required`, so each component was taken from the source repository that its
21st.dev page links to, then adapted.

| Component | Author | 21st.dev page | Source | Licence | Used in |
|---|---|---|---|---|---|
| Animated Hero | Tommy Jepsen | https://21st.dev/@tommyjepsen/components/animated-hero | https://github.com/tommyjepsen/twblocks (`blocks/hero/hero5.tsx`) | MIT, © 2024 Tommy Jepsen | `src/components/AnimatedHero.tsx` |
| Button (shadcn/ui, as shipped with the hero) | Tommy Jepsen / shadcn | same as above | https://github.com/tommyjepsen/twblocks (`components/ui/button.tsx`) | MIT | `src/components/ui/button.tsx` |
| Text Shimmer | Julien Thibeaut (ibelick), motion-primitives | https://21st.dev/@ibelick/components/text-shimmer | https://github.com/ibelick/motion-primitives (`components/core/text-shimmer.tsx`) | MIT | `src/components/ui/text-shimmer.tsx` (loading screen) |

## Claude Code skill

| Skill | Author | Source | Licence |
|---|---|---|---|
| UI UX Pro Max (`.claude/skills/ui-ux-pro-max`) | Next Level Builder | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill (commit `28b3b8d`) | MIT, © 2024 Next Level Builder (LICENSE copied alongside) |

## Fonts (self-hosted via Fontsource)

| Font | Designer | Licence |
|---|---|---|
| Archivo (variable) | Omnibus-Type | SIL Open Font License 1.1 |
| Space Grotesk (variable) | Florian Karsten | SIL Open Font License 1.1 |
| JetBrains Mono | JetBrains | SIL Open Font License 1.1 |

## Libraries

three.js (MIT), @react-three/fiber, drei, postprocessing & rapier (MIT, Poimandres),
postprocessing (zlib, Raoul van Rüschen), n8ao (ISC, N8python), Rapier (Apache-2.0, Dimforge),
framer-motion (MIT), Tailwind CSS (MIT), class-variance-authority, clsx, tailwind-merge (MIT),
Radix Slot (MIT), lucide-react (ISC), gltf-transform (MIT, build-time only).
