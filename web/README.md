# harishkumartn.in

My personal site: a cinematic 3D badminton arena at night ("The Court") you scroll through, click around and can actually play a rally in (BWF-accurate court, CC0 models, HDRI + spotlights with light shafts, post-processing, Rapier physics), plus simple sections for work, education, ideas, markets learnings, badminton, travel and social highlights. The earlier "Study Desk" scene is still available as a one-line switch.

Built with Vite, React, TypeScript, @react-three/fiber, @react-three/drei and framer-motion. There's no backend; it's a fully static site.

```bash
npm install
npm run dev        # local dev server at http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the built dist/ locally
```

---

## Editing content

**All text and media references live in one file: [`src/content.ts`](src/content.ts).** The components render only from it, so you never need to touch React code to update the site.

- Each section has its own exported object (`about`, `work`, `education`, `ideas`, `markets`, `badminton`, `travel`, `social`, `contact`).
- Lists like `ideas.entries` or `travel.stories` are arrays. Copy an entry to add another one, or delete it to remove it.
- Anything with `placeholder: true` shows a yellow **Placeholder** badge on the site. **Remove that flag once you've added the real thing.**
- TypeScript checks the file, so if you mistype a field, `npm run build` will tell you.

### What's still placeholder

| Section | What to fill in |
| --- | --- |
| About | `about.photo.src` (your headshot) |
| Ideas | `ideas.entries` (3 "Coming soon" notes) |
| Markets | `markets.learnings` (3 "Coming soon" learnings). Learnings only: no positions or tips. The not-financial-advice note is `markets.disclaimer`. |
| Badminton | `badminton.videos` (3 empty video slots) |
| Travel | `travel.stories` (4 cards with generated gradient art) |
| Social highlights | `social.posts` (3 empty embed slots) |

---

## Adding media

Put files in `public/media/...`. In `content.ts`, refer to them **without** the `public/` prefix:

```
public/media/about/       → headshot etc.        e.g. "media/about/me.jpg"
public/media/travel/      → trip photos          e.g. "media/travel/coorg.jpg"
public/media/badminton/   → short mp4 clips      e.g. "media/badminton/smash.mp4"
public/media/social/      → anything else
```

**Photos.** Export them as JPG or WebP at about 1600px on the long edge, ideally under 400 KB each. Then set the path:

```ts
// about
photo: { src: 'media/about/me.jpg', alt: 'Me at the beach' },

// travel
{ title: 'Coorg with the gang', place: 'Coorg', date: 'Dec 2025',
  caption: 'Rain, coffee and a very muddy trek.',
  image: 'media/travel/coorg.jpg', palette: ['#a8e063', '#2bb3a3'] },
```

(`palette` is only used when there's no `image`.)

**Badminton videos.** You have two options:

1. **YouTube (recommended for anything longer than a few seconds).** Upload the clip as *Unlisted*, then copy the id from the URL, e.g. `https://www.youtube.com/watch?v=AbC123xyz` → `youtubeId: 'AbC123xyz'`. It's embedded through the privacy-friendly `youtube-nocookie.com`.
2. **MP4 file.** Put a compressed clip in `public/media/badminton/` and set `mp4: 'media/badminton/rally.mp4'`, plus an optional `poster: 'media/badminton/rally.jpg'`. Keep it under about 8 MB, for example:
   `ffmpeg -i in.mov -vf scale=-2:720 -c:v libx264 -crf 28 -preset slow -an out.mp4`

If both are set, `youtubeId` wins.

**Social highlights.** Auto-syncing feeds isn't realistic (the Instagram, LinkedIn and X APIs are closed or paid), so you hand-pick posts instead:

- `url` is the normal public link to the post, shown as "View on …".
- `embedUrl` is optional. If you set it, the post shows inline in an iframe:
  - **Instagram:** the post URL with `embed` added, e.g. `https://www.instagram.com/p/POST_ID/embed`
  - **LinkedIn:** on the post, open **⋯ → Embed this post** and copy the `src` from the iframe it gives you (it looks like `https://www.linkedin.com/embed/feed/update/urn:li:share:…`).
  - **X:** X has no simple iframe URL, so just set `url` and leave `embedUrl` empty.

---

## Project structure

```
index.html                 SEO: title, description, Open Graph, favicon
public/
  favicon.svg              "HK" monogram
  og-image.png             social preview image (regenerate: python3 scripts/make-og-image.py)
  media/{about,travel,badminton,social}/
  assets/                  3D assets (see CREDITS.md): court/{models,textures,hdri} for The
                           Court; models/, textures/, hdri/ for the Study Desk
src/
  content.ts               ← ALL CONTENT
  App.tsx                  page = Nav + Hero + sections in nav order (LazyMotion)
  styles.css               Tailwind v4 + design tokens (see DESIGN-NOTES.md)
  components/
    Nav.tsx                floating glass nav, animated active pill
    Hero.tsx               sticky 3D stage, scroll chapters, focus panel, test hooks, 2D fallback
    AnimatedHero.tsx       hero copy (adapted from 21st.dev "Animated Hero")
    HeroCanvas.tsx         lazy-loaded WebGL canvas + PerformanceMonitor + loader progress
    Loader.tsx             loading chip (real progress from drei useProgress)
    Section.tsx            section wrapper, Card, Pill, staggered reveals
    ui/                    shadcn-style Button, Text Shimmer (21st.dev)
  sections/                one component per section + index.ts registry
  scenes/
    types.ts               SceneProps / SceneDefinition contract
    index.ts               scene registry
    court/                 the default hero scene ("The Court")
      Court.tsx            composition, arena lights (spots + accents), environment, hotspots
      layout.ts            BWF dimensions, prop placements, focus shots, scroll path, rally planes
      Arena.tsx            maple floor (reflective), court mat + every BWF line, net + posts,
                           walls, trusses, bleachers, fixtures + light shafts, dust, LED boards
      Props.tsx            bench + kit bag, clip screen, ticker, scoreboard, chalkboard,
                           bookshelf, globe plinth, loose rackets/shuttles
      displays.ts          canvas painters for the LED scoreboard/ticker/boards, screen, chalk
      Rally.tsx            playable rally: Rapier world, drag, cork-first flip, trail, AI (lazy)
      Effects.tsx          post-processing stack (lazy chunk)
    study/                 the previous hero scene ("Study Desk")
      StudyDesk.tsx        composition, lights, environment
      layout.ts            object placements, focus shots, scroll camera path
      Room.tsx             desk, wall, Poly Haven props, mortarboard
      Electronics.tsx      laptop + monitor with live canvas screens (screens.ts)
      Globe.tsx            globe with glowing pins and arcs
      Badminton.tsx        racket + shuttlecock
      Physics.tsx          Rapier world + flickable shuttle (lazy chunk)
      Effects.tsx          post-processing stack (lazy chunk)
    shared/CameraRig.tsx   scroll path, focus fly-to, parallax, framing offset
    shared/Hotspot.tsx     hover lift, label, outline reporting, click → focus
    shared/Mortarboard.tsx graduation cap (used by both scenes)
  lib/                     media paths, scrolling, device tier, icons, cn()
```

### Adding a section

1. Add the id to `SectionId` and to `nav` in `content.ts`, plus a content object for it.
2. Create `src/sections/MySection.tsx` using the `<Section>` wrapper.
3. Register it in `src/sections/index.ts`.

### Swapping the 3D scene

`site.scene` in `content.ts` picks the hero scene: `'court'` (default) or `'study-desk'`. Each
scene's hero copy, cycling words and hotspots live in `heroScenes` in the same file.

The hero only talks to scenes through `SceneProps` in `src/scenes/types.ts`. To add one (e.g. "Journey Globe"):

1. Create `src/scenes/<name>/<Name>.tsx` with a default export that takes `SceneProps`. Wrap each clickable object in `<Hotspot>` and use `<CameraRig>` (scroll path + focus shots).
2. Add it to the registry in `src/scenes/index.ts` with its `pathOrder` (hotspot ids in scroll order) and `playable` if it has a mini-game.
3. Add its copy and hotspots to `heroScenes` in `content.ts` and set `site.scene` to its id.

### The Court: what's where

| Spot | Section | Notes |
|---|---|---|
| Hanging LED scoreboard | Work | Shows the two latest roles from `work.items`, plus the live rally score |
| Bench + kit bag | About | Poly Haven bench, racket thermo bag, shuttle tubes, towel, bottle |
| Courtside screen | Badminton | Animated rally replay until real clips are added |
| LED ticker | Markets | Simulated line + the *tags* of `markets.learnings`, "not financial advice" |
| Chalkboard | Ideas | Chalk written from `ideas` tags |
| Bookshelf | Education | Book spines from `education`, mortarboard, trophy |
| Globe on a plinth | Travel | Pins for Bengaluru, Chennai (IIT Madras), London (UCL) |

**The rally.** "Play a rally" (hero, or the Badminton focus panel) moves the camera behind your
baseline. Move the mouse (or drag on touch) to place your racket; the ring shows where the
opponent's shot will cross your hitting plane. Rapier integrates the 5 g shuttle with quadratic
drag tuned to a real shuttle's ~6.8 m/s terminal velocity, so it decelerates hard and drops
steeply, and it turns cork-first along its flight (flipping after every hit). Shots are aimed by
simulating that same flight model so they clear the 1.524 m net. Best rally is kept in
localStorage. Esc, Exit or scrolling leaves.

### Performance and accessibility

- three.js/R3F/drei, the scene, the post-processing stack and Rapier physics are separate lazy chunks. The hero copy renders first; the canvas mounts after the first paint, compiles its shaders with `compileAsync` and fades in. Physics (the largest, Rapier WASM) is prefetched in the background on desktops only; phones fetch it when Play is tapped.
- Static meshes that share a material are merged (books, trusses, bleachers, fixtures, light shafts), hotspots are picked with one invisible box each, shadow maps re-render only while something moves (hover, focus, rally), and the canvas screens skip repainting while off-camera. Measurements and the harness are in `perf/` (see `perf/REPORT.md`).
- **Tiers.** The Court, `high`: DPR up to 2, 4 key spotlights (2 with soft shadows) + 6 accent spots, reflective maple floor, dust in the light shafts, 8 bleacher rows, 2k floor textures, N8AO, depth of field, hover outlines, bloom, grain, vignette. The Court, `low`: 2 wide key lights (1 shadow), no accents/reflections/dust/AO/DoF/outline, 6 bleacher rows, 1k textures (light shafts, bloom, grain and vignette stay). Study Desk `high`: PCSS soft shadows and the same post stack with 2k desk textures. `low` (phones, touch, ≤4 cores or ≤4 GB RAM): DPR 1.25 rising to at most 1.5, no AO/DoF/outline/PCSS, baked contact shadows, 1k textures. The Court on `low` also uses a 512 px HDRI, 512 px kit, wall and mat textures, a lighter globe, no clearcoat/sheen on the floor and mat, a shorter bloom chain, no grain, and renders on demand (every frame while the camera moves or you touch/scroll, 30 fps when idle). A `PerformanceMonitor` lowers DPR (never above the screen's own) and then drops AO/DoF at runtime if frames fall below ~45 fps; phones that still struggle at DPR 1 keep only tone mapping and the vignette (toggled inside the same composer, so nothing recompiles). Force a tier with `?tier=low` or `?tier=high`.
- With `prefers-reduced-motion`: no scroll camera path (the hero is a single screen), camera cuts instead of flying, frozen screens/globe, no physics, no text animations.
- Without WebGL, or if the canvas crashes, a 2D grid replaces it. Visitors can also switch 3D off (remembered in localStorage).
- Rendering pauses when the hero is out of view or the tab is hidden.

### Test hooks

- `#focus=<id>` in the URL, or `window.__focus('<id>')` / `window.__focus(null)` in the console. Court ids: `scoreboard`, `bench`, `screen`, `ticker`, `chalkboard`, `bookshelf`, `globe` (desk: `laptop`, `chart`, `racket`, `globe`, `books`).
- `window.__play(true)` / `window.__play(false)` starts/stops the rally; `window.__autoplay = true` lets your racket play itself.
- `?capture` keeps the last finished frame in the drawing buffer and pins DPR to 1 (for headless screenshots with software GL); `?dpr=1.5` pins a DPR; `?tier=low|high` forces a tier.
- `window.__r3f` is the R3F root state (`__r3f.gl.info` for draw calls).
- `window.__flick()` flicks the desk shuttlecock (Study Desk only).
- `window.__shot = { position: [x, y, z], target: [x, y, z] }` overrides the camera (debugging); `delete window.__shot` to release.

---

## Deploying

### Option A: Vercel (recommended)

1. Push this repo to GitHub (it's only local right now).
2. On vercel.com, choose **Add New → Project** and import the repo. Vercel detects Vite automatically (build `npm run build`, output `dist`).
3. Every push to `main` redeploys.

### Option B: GitHub Pages

1. Build with the right base path. For `https://<user>.github.io/<repo>/` use `BASE_PATH=/<repo>/ npm run build`. For a custom domain, the default `/` is fine.
2. Publish `dist/`, either with a GitHub Actions workflow (`actions/upload-pages-artifact` + `actions/deploy-pages`) or with the `gh-pages` package.
3. For a custom domain on Pages, add a `public/CNAME` file containing `harishkumartn.in`.

### Pointing the GoDaddy domain (docs only, nothing has been changed)

**For Vercel:** In Vercel, go to **Project → Settings → Domains** and add `harishkumartn.in` and `www.harishkumartn.in`. Then in GoDaddy, go to **My Products → harishkumartn.in → DNS** and set:

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

Remove any conflicting `A @` or "Parked" records. Vercel issues HTTPS automatically once DNS propagates (minutes to a few hours). Always double-check the values Vercel shows in its Domains screen, because they're the source of truth.

**For GitHub Pages:** create `A @` records pointing to `185.199.108.153`, `185.199.109.153`, `185.199.110.153` and `185.199.111.153`, plus `CNAME www → <user>.github.io`. Then set the custom domain in the repo's **Settings → Pages** and tick "Enforce HTTPS".

---

## SEO

The title, description and Open Graph/Twitter tags are in `index.html`. If you change the tagline in `content.ts`, update `index.html` too, since social previews read the static HTML. `public/og-image.png` is generated by `scripts/make-og-image.py` (requires Pillow).
