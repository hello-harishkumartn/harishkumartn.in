# Personal Portfolio Redo and Optimization Brief

* **Author:** Harish Kumar T N
* **Date:** 2026-11-14

## Overview

Modernize and optimize the personal portfolio repository on branch `egm-redo` (harishkumartn.in, "The Court", badminton-themed portfolio built with Vite, React 19, TypeScript, Tailwind CSS and React Three Fiber). The site features high-fidelity 3D interactive scenes, responsive storytelling sections and a password-protected 3D Life Graph application at `/life/`.

While desktop performance achieves acceptable scores, mobile performance suffers from severe main-thread starvation (Lighthouse mobile score 28, TBT 143,160 ms and LCP 21.9 s). In addition, previous build and deployment processes accumulated 14 stale hashed chunks totaling 4.3 MB in `site/assets/` (including an orphaned 2.2 MB duplicate Rapier physics bundle). Two accessibility defects also impair screen reader and voice navigation.

This initiative optimizes code quality, establishes a safe and idempotent build synchronization story that strictly safeguards `site/life/`, eliminates dead code and stale assets, defers heavy 3D and physics execution on mobile and resolves accessibility defects while preserving all existing visuals, copy, theme and URLs.

## Analysis

Comprehensive analysis conducted across specialized Goldfish review lenses (Contrarian/YAGNI, Systems Architecture, Codebase Details, Comprehension, Implementation Readiness, Structural Layout and Inventive Contradiction Resolution) identified the following core findings and trade-offs:

### 1. High-Fidelity 3D Immersion vs Mobile Bootup and Main-Thread Responsiveness
- **Contradiction:** Providing an immersive 3D hero stage currently triggers Three.js initialization, texture decompression, geometry compilation and postprocessing shader passes within 200 to 600 ms of page load across all devices. On low-tier mobile devices with constrained CPUs, this causes 174.1 s of main-thread execution and 143.1 s of Total Blocking Time.
- **Inventive Resolution:** Apply the Dynamics and Inversion principle. Decouple initial page load from 3D canvas instantiation. On mobile and low-tier devices (`tier === 'low'`), retain the instant 2D CSS and SVG gradient backdrop (`StaticScene`) during the critical rendering path. Defer mounting the 3D WebGL canvas (`HeroCanvas`) until after main-thread idle or explicit user interaction (such as toggling 3D or interacting with the stage). On desktop (`tier === 'high'`), maintain the existing automatic 3D mount.
- **Secondary Trade-offs:** Mobile visitors encounter a brief loading transition if they choose to activate 3D mode, but initial content renders instantly with near-zero blocking time.

### 2. Static Distribution Hygiene vs Immutable Life Graph Preservation
- **Contradiction:** Historical deployments used additive copying (`cp -rn`) to avoid wiping `site/life/`, which houses an independently updated, password-protected 3D Life Graph with browser encryption salts. Consequently, 14 stale hashed JS and CSS files totaling 4.3 MB accumulated in `site/assets/`. However, naive directory cleaning (`rm -rf site/*` or unconstrained rsync) would destroy `site/life/` and break nightly update workflows.
- **Inventive Resolution:** Apply the Extraction and Taking Out principle. Establish a deterministic, automated synchronization script (`web/scripts/sync-site.mjs` or `npm run sync`) that safely copies `web/dist/*` into `site/`, purges obsolete hashed chunks from `site/assets/` using the Vite build manifest and treats `site/life/**`, `site/CNAME` and `site/.nojekyll` as strictly immutable protected boundaries. Assert preservation of `site/life/index.html` and `site/life/crypto.js` before and after synchronization.
- **Secondary Trade-offs:** Requires an explicit synchronization script in the repository rather than relying solely on default Vite outDir settings.

### 3. Physics Mini-Game Capability vs Portfolio Bundle Weight
- **Contradiction:** The Rapier physics engine (`@react-three/rapier`) and its WebAssembly binary add 2.2 MB raw (~850 kB gzip). Desktop scenes currently trigger background prefetching of the physics chunk after 2.5 s, risking memory thrashing and unnecessary data consumption for visitors who never play the mini-game.
- **Inventive Resolution:** Apply the Segmentation principle. Enforce dynamic import boundaries in Vite configuration so that Rapier physics and the `Rally` mini-game reside in a dedicated chunk. Restrict prefetching to capable desktop clients while ensuring low-tier mobile clients load the physics chunk strictly on demand when the visitor clicks "Play a rally". Provide visual loading feedback while the physics simulation initializes.
- **Secondary Trade-offs:** A short sub-second initialization phase occurs when the visitor launches the rally mini-game.

### 4. Below-the-Fold Monolithic Bundle vs Progressive Code Splitting
- **Contradiction:** `App.tsx` statically imports all nine page sections (`About`, `Work`, `Education`, `Ideas`, `Markets`, `Badminton`, `Travel`, `Social` and `Contact`) into the primary entry bundle. Heavy dependencies like YouTube iframe embeds and complex SVG structures are parsed during initial bootup even though they reside far below the fold.
- **Inventive Resolution:** Code-split non-critical section components using `React.lazy` and dynamic imports, loading section bundles progressively as the user scrolls.
- **Secondary Trade-offs:** Section rendering requires standard Suspense boundaries.

### 5. Semantic Accessibility Compliance vs Visual Compactness
- **Contradiction:** In `AnimatedHero.tsx`, action buttons use `role="listitem"` inside a `role="list"` container, which invalidates native button semantics in assistive technology trees. In `Nav.tsx`, the logo link displays visible text "HK" but provides `aria-label="Harish Kumar T N, back to top"`, violating WCAG 2.5.3 (Label in Name) for speech-control users.
- **Inventive Resolution:** Restructure hero shortcut buttons into a semantic unordered list (`<ul role="list"><li key={...}><Button ... /></li></ul>`) or accessible group, preserving identical styling and layout. Update the logo link accessible name to include the visible text: `aria-label={`${site.monogram} - ${site.name}, back to top`}`.
- **Secondary Trade-offs:** Minimal DOM nesting adjustments without any visual change.

### 6. SVG Filter CSS Relative URL Interpretation
- **Contradiction:** In `web/src/styles.css`, an inline SVG background references `filter='url(%23n)'`. Vite's CSS parser misinterprets `%23n` as a relative asset URL, producing 404 errors for `assets/%23n` and `assets/\``.
- **Inventive Resolution:** Correct the SVG filter quoting in `web/src/styles.css` so Vite processes the SVG data URI correctly without generating phantom missing asset warnings.

## Goals vs. Non-Goals

### In-Scope Goals
* **Code Quality & Maintainability:** Place source cleanly under `web/`, establish clear contract files (`EGM.md`), fix phantom CSS asset errors and document architecture.
* **Safe Build & Sync Pipeline:** Add an automated sync script that outputs `web/dist/` into `site/`, purges stale hashed chunks in `site/assets/` and strictly protects `site/life/`, `CNAME` and `.nojekyll`.
* **Mobile Performance Optimization:** Defer 3D canvas mounting on mobile / low-tier devices (`tier === 'low'`) to avoid main-thread blockage; preserve 2D CSS/SVG backdrop (`StaticScene`) during initial paint; code-split below-the-fold sections and heavy physics.
* **Preserve Desktop Immersion:** Keep full 3D visual fidelity, lighting, shadows and adaptive quality on desktop environments.
* **Full Accessibility Compliance:** Resolve logo link accessible name mismatch and replace invalid `role="listitem"` on hero buttons with semantic valid HTML.
* **Clean Deploy Workflow Story:** Update deployment documentation and GitHub Actions deploy configuration on this branch to prevent resurrecting stale chunks from historical archives.

### Out-of-Scope Non-Goals
* Visual redesign, changing color palette, modifying layout or altering typography.
* Adding new content, creating new sections or rewriting existing copy in `content.ts`.
* Touching, modifying or rotating encryption keys/salt for the Life Graph at `site/life/`.
* Deploying to GitHub Pages or running deployment workflows.
* Merging changes to `main` or pushing to any remote repository.

## Alternatives Weighed

* **Alternative 1: Replacing Rapier physics with a custom ballistic solver.**
  * *Rejected by author:* Rewriting aerodynamic self-stabilization, racket physics and collision boundaries is high-risk speculative engineering. Isolating the existing tuned Rapier chunk via dynamic imports achieves bundle savings without risking mini-game regressions.
* **Alternative 2: OffscreenCanvas rendering inside a Web Worker for mobile 3D.**
  * *Rejected by author:* Introducing Web Worker canvas transfers adds significant complexity, cross-browser touch event synchronization friction and fragile fallback branches for marginal gain on static portfolios. Deferring 3D mount until user interaction solves mobile responsiveness cleanly using existing code.
* **Alternative 3: Complete wipe of `site/` on build (`emptyOutDir: true`).**
  * *Rejected by author:* `site/life/` is a separate static application updated nightly on `main`. Wiping `site/` would destroy the Life Graph and its local encryption salt.
* **Alternative 4: Adopting a heavy accessible component library (e.g. Radix Navigation Menu).**
  * *Rejected by author:* Unnecessary bundle bloat. The reported accessibility issues only require inline semantic corrections (prefixing visible label in `aria-label` and wrapping hero buttons in semantic `<li>` tags).

## Key Decisions & Staging for Next Steps

1. **Build Sync Tooling:** Implement a dedicated script (`web/scripts/sync-site.mjs`) callable via `npm run sync` (and run as part of `npm run build:all`) that verifies `web/dist/`, synchronizes files into `site/`, removes orphaned hashed chunks in `site/assets/` and verifies that `site/life/` remains untouched.
2. **Mobile 3D Lifecycle:** Update `Hero.tsx` so that when `tier === 'low'`, `mount3D` defaults to false and initial render presents `StaticScene`. Provide seamless user activation via the existing 3D toggle button.
3. **Chunk Splitting:** Configure `vite.config.ts` Rollup `manualChunks` to cleanly isolate Three.js/R3F vendor libraries, UI utilities and Rapier physics.
4. **Accessibility Repairs:** Update `Nav.tsx` monogram `aria-label` and restructure `AnimatedHero.tsx` hero buttons into an authentic semantic list.
5. **Proceeding to Drafting:** Advance immediately to `/egm:egm-draft` to construct the formal design specification at `docs/designs/egm-redo.md`.
