# Design notes (v2)

How the **UI UX Pro Max** skill (`.claude/skills/ui-ux-pro-max`, MIT, Next Level Builder) was
used, what it recommended, and what was applied. The persisted system lives in
`design-system/harishkumartn-in/MASTER.md`.

## Queries run

```bash
S=.claude/skills/ui-ux-pro-max/scripts/search.py
python3 $S "personal portfolio immersive 3D interactive premium dark" --design-system -p "harishkumartn.in" --variance 6 --motion 7 --density 3
python3 $S "3D immersive portfolio cinematic" --design-system -p "harishkumartn.in" --variance 6 --motion 7 --density 3 --persist --output-dir .
python3 $S "3D immersive WebGL dark cinematic" --domain style -n 3
python3 $S "premium modern editorial elegant" --domain typography -n 4
python3 $S "portfolio dark warm premium" --domain color -n 3
python3 $S "WebGL scene performance" --stack threejs -n 5
python3 $S "hero 3D portfolio" --domain landing -n 2
python3 $S "reduced motion scroll animation" --domain ux -n 3
python3 $S "loading progress skeleton" --domain ux -n 2
```

The first `--design-system` run returned **Brutalism + Caveat/Quicksand** (handwritten), which
conflicts with a photoreal, premium brief. Following the skill's own rule ("retry once with a
narrower query"), the second run was used and persisted.

## What the skill recommended → what was applied

| Area | Skill recommendation | Applied |
|---|---|---|
| Pattern | **Hero-Centric Design**: hero dominates the first viewport, one clear CTA, static hero under reduced motion. First run also suggested **Scroll-Triggered Storytelling**: chapters, progress indicator, final readable state under reduced motion | Full-viewport sticky 3D hero; scroll drives a 5-chapter camera path with numbered chapter captions (`01 / 05`) and a vertical progress rail. Reduced motion → single-screen static hero |
| Style | **3D & Hyperrealism** (WebGL/three.js, realistic lighting and shadows, physics motion, 300–400 ms 3D transitions) + **Dark Mode** (dark greys, minimal glow, high-contrast text) | Photoreal desk with HDRI, PBR, soft shadows, AO, DoF; dark warm UI (`#0d0b09`), glow reserved for pins/screens |
| Anti-patterns | "2D-only layouts", "Poor image quality", "AI purple/pink gradients" | No purple gradients; 3D is the centrepiece; compressed but high-res textures |
| Typography | **Archivo** (headings) + **Space Grotesk** (body), "minimal, portfolio, designer" | Applied exactly, self-hosted variable fonts via Fontsource; JetBrains Mono added for kickers/code (matches the code-screen theme) |
| Colour | Portfolio palette: monochrome zinc + one accent; "Dark audio + warm accent" `#F97316`; minimalism run: safety-orange accent `#EA580C` | Warm near-black neutrals + single warm accent `#FB923C` (lighter step of the skill's orange, for ≥4.5:1 contrast on the dark background). Up/down chart colours kept separate |
| Effects | Subtle hover 200–250 ms, smooth transitions, clear type hierarchy, fast loading | 200–300 ms hovers on buttons/cards, cursor-following card highlight, staggered reveals ~0.7 s |
| Motion | Stagger list (300–450 ms, back-out ease), honour `prefers-reduced-motion` | Framer Motion stagger variants (`revealGroup`/`revealItem`), spring nav pill, `MotionConfig reducedMotion="user"` |
| Pre-delivery checklist | No emoji as icons (use SVG/Lucide), `cursor-pointer` on clickables, visible focus states, contrast 4.5:1, responsive 375–1440 | All UI icons are Lucide SVGs (content.ts emoji are kept as content text only); cursor-pointer on every interactive element; global `:focus-visible` ring; tested at 390×844 and 1440×900 |
| UX (touch) | Min 44×44 targets, don't rely on hover only | Close button 44 px, buttons 36–48 px; hotspots work via tap, and every hotspot also has an HTML chip |
| UX (loading) | Show progress for long operations | Loading screen with real percent from drei `useProgress` |
| three.js stack | Set `antialias` at construction, canvas `aria-label` + `role="img"`, fog for depth | Antialias decided up-front (off; SMAA in post), canvas has role/aria-label listing hotspots, fog for depth falloff |

## Not taken from the skill

- The skill's GSAP motion snippet: the project standard is Framer Motion (per the brief), so the same stagger idea was implemented with Framer Motion variants.
- Light-mode palette values (backgrounds `#FAFAFA` etc.): a dark scene reads better for a lamp-lit desk and lets the 3D glow.

## The Court (v3): what changed and what stayed

The design system in `design-system/harishkumartn-in/MASTER.md` is unchanged: Archivo +
Space Grotesk + JetBrains Mono, warm near-black neutrals, one orange accent (`#FB923C`),
glass panels, 200–300 ms hovers, Framer Motion stagger reveals, `MotionConfig reducedMotion="user"`.

Re-checked against the skill for the new theme:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "sports arena night immersive 3D game" --domain style -n 2
```

It again returned **3D & Hyperrealism** (realistic lighting/shadows, physics motion, 300–400 ms
3D transitions; accessibility risk: high → contrast 4.5:1, keyboard, visible focus, reduced
motion). Applied to the court:

| Skill guidance | Applied in The Court |
|---|---|
| Realistic lighting, complex shadows | Real spotlights from the high-bay fixtures (two with soft shadow maps), warm accent spots on each prop, HDRI reflections, reflective maple floor, N8AO, haze + light shafts |
| Physics-based motion | Rapier rally with real shuttle drag (terminal velocity ~6.8 m/s) and cork-first flip |
| Deep navy / forest green / gold palette for 3D | Navy acoustic walls and seats, forest-green court mat, gold trophy; UI accent stays the site orange, reused on the LED boards and scoreboard so 3D and UI read as one system |
| Reduced motion, keyboard, contrast | Reduced motion: static camera, frozen LED boards/dust, camera cuts. Every hotspot also has an HTML button; the rally HUD has a real Exit button and Esc; HUD text sits on a glass panel ≥4.5:1 |

The 21st.dev Animated Hero is kept; its cycling words now come from `hero.words`
("on court", "building", "learning markets", …) and spring over the court, and it gains a
"Play a rally" action. Panels, captions and the loader copy say "court" instead of "desk"
(`hero.place`).
