# Goldfish Annotated Review Report

**Target:** `/workspace/site-egm/docs/designs/egm-redo.md` (`full file`)

## Prioritized Findings & AI Suggestions

### Issue 1 [egm-zoom-out, egm-design, egm-comprehension, egm-implementation-readiness, egm-codebase-details] - Severity: Blocker
*   **Affected Scope:** [Lines 119-121, 231-238](file:///workspace/site-egm/docs/designs/egm-redo.md#L119-L121) (Architectural Decisions 1 and Implementation Plan Item 6)
*   **Discrepancy Description:** The design proposes setting `mount3D = false` on low-tier hardware while leaving `off` as `false`. In `Hero.tsx`, this causes `show3D` to evaluate to true, calculating a 600svh empty scroll runway, rendering an unresolving `<Loader />` indicator and causing the button to display "Turn 3D off" instead of "Turn 3D on".
*   **Rationale:** The proposed internal state abstraction contradicts the existing codebase architecture and results in a broken UI.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** Use the existing, battle-tested `off` state architecture. Initialize `off` based on device tier, defaulting to `true` when `tier === 'low'` and no explicit user preference is stored in `localStorage`. This cleanly sets `show3D` to false, bounds hero height to `100svh`, displays the 2D scene with interactive cards, displays "Turn 3D court on", and avoids loading Three.js until clicked.
*   ***Proposed Edit:***
    *   Location: Section 7.2 (Architectural Decisions 1) and Section 11 (Item 6 `Hero.tsx`)
    *   Change: Replace `mount3D` low-tier gating with `off` state tier-default initialization:
        ```tsx
        const [off, setOff] = useState(() => {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored !== null) return stored === '1';
          return tier === 'low';
        });
        ```

### Issue 2 [egm-zoom-out, egm-design, egm-comprehension, egm-implementation-readiness, egm-codebase-details, egm-structural] - Severity: Blocker
*   **Affected Scope:** [Lines 122-124, 239-245](file:///workspace/site-egm/docs/designs/egm-redo.md#L122-L124) (Architectural Decisions 2 and Implementation Plan Item 7)
*   **Discrepancy Description:** Converting `sectionComponents` in `sections/index.ts` to `React.lazy` without adding a `<Suspense>` wrapper in `web/src/App.tsx` crashes React 19 at runtime. `App.tsx` was also missing from the target files list.
*   **Rationale:** In React 19, rendering a suspended component outside a Suspense boundary throws an unhandled render exception.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** Add `web/src/App.tsx` to the implementation plan, wrap section rendering in `<Suspense fallback={null}>`, and ensure all section components maintain their existing `<Section id={id} ...>` anchor wrappers so `Nav.tsx`'s `IntersectionObserver` and hash navigation remain stable.
*   ***Proposed Edit:***
    *   Location: Section 7.2 (Architectural Decisions 2) and Section 11 (Add `web/src/App.tsx` as Target File 7, shift subsequent items)
    *   Change: Specify `App.tsx` modification wrapping section loop in `<Suspense fallback={null}>`.

### Issue 3 [egm-codebase-details, egm-implementation-readiness] - Severity: Blocker
*   **Affected Scope:** [Lines 193-202](file:///workspace/site-egm/docs/designs/egm-redo.md#L193-L202) (Implementation Plan Item 1 `web/scripts/sync-site.mjs`)
*   **Discrepancy Description:** The plan mandates a pre-sync assertion checking the existence of `site/CNAME`. In the filesystem, `site/CNAME` does not exist prior to build sync because it is generated from `web/public/CNAME` into `web/dist/CNAME`.
*   **Rationale:** Enforcing a pre-sync assertion on a file that only exists in `web/dist/` causes `sync-site.mjs` to abort immediately.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** Update the pre-sync assertion to verify `web/dist/index.html`, `web/dist/CNAME` and `site/life/index.html`. Copy `web/dist/CNAME` to `site/CNAME`, and validate `site/CNAME` post-sync.
*   ***Proposed Edit:***
    *   Location: Section 7.2 (Architectural Decisions 4) and Section 11 (Item 1)
    *   Change: Update pre-sync assertions to check `web/dist/CNAME` and `site/life/index.html`; validate `site/CNAME` with content `harishkumartn.in` post-sync.

### Issue 4 [egm-inventive-catalyst, egm-design, egm-structural, egm-comprehension, egm-codebase-details] - Severity: Major
*   **Affected Scope:** [Lines 27, 128-136, 193-202](file:///workspace/site-egm/docs/designs/egm-redo.md#L27) (Goals G1, Architectural Decisions 4 and Implementation Plan Item 1)
*   **Discrepancy Description:** The sync script proposed an ad-hoc regex filter for `*.*.js` and `*.*.css`, which leaves orphaned fonts, maps, wasm and textures. Also, `site/.nojekyll` and `site/life/crypto.js` were omitted from assertions.
*   **Rationale:** Segmenting ephemeral assets cleanly is superior to a partial file extension filter.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** Treat `site/assets/` as strictly ephemeral build output. During sync, wipe `site/assets/` completely before copying `web/dist/assets/`, eliminating 100% of stale chunks across all file types. Assert that `site/life/**` (including `index.html` and `crypto.js`), `site/CNAME` and `site/.nojekyll` remain intact before and after sync.
*   ***Proposed Edit:***
    *   Location: Section 7.2 (Architectural Decisions 4) and Section 11 (Item 1)
    *   Change: Specify wiping `site/assets/` exclusively, copying `web/dist/assets/` into `site/assets/`, and asserting `site/.nojekyll`, `site/CNAME`, `site/life/index.html` and `site/life/crypto.js`.

### Issue 5 [egm-design, egm-implementation-readiness, egm-comprehension] - Severity: Major
*   **Affected Scope:** [Lines 252-256](file:///workspace/site-egm/docs/designs/egm-redo.md#L252-L256) (Implementation Plan Item 9 `.github/workflows/deploy.yml`)
*   **Discrepancy Description:** `.github/workflows/deploy.yml` unpacks `bundle/rest.tgz.b64.part-*` into `/tmp/rest` and runs `cp -rn /tmp/rest/site/. site/`. Because `-n` does not overwrite, any stale chunks pruned from `site/assets/` would be repopulated from `/tmp/rest/site/assets/` during deployment.
*   **Rationale:** Without an explicit command change, the deploy workflow would restore the 4.3 MB dead assets during CI runs.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** In `.github/workflows/deploy.yml`, add `rm -rf /tmp/rest/site/assets` immediately after tar extraction and before `cp -rn`. This guarantees that the bundle fills in only non-hashed media/life assets and never restores obsolete hashed JS/CSS chunks.
*   ***Proposed Edit:***
    *   Location: Section 11 (Detailed Implementation Plan Item 10 `.github/workflows/deploy.yml`)
    *   Change: Replace vague instruction with exact shell step: add `rm -rf /tmp/rest/site/assets` prior to `cp -rn /tmp/rest/site/. site/`.

### Issue 6 [egm-zoom-out, egm-structural, egm-comprehension] - Severity: Major
*   **Affected Scope:** [Lines 125-127](file:///workspace/site-egm/docs/designs/egm-redo.md#L125-L127) (Architectural Decisions 3)
*   **Discrepancy Description:** The design claimed that `Court.tsx` needed modification to eliminate background prefetching on mobile. In reality, `Court.tsx` line 40 already restricts prefetching with `if (high && !saveData)`.
*   **Rationale:** Documenting non-existent work creates confusion and churn.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** Clarify that `Court.tsx` already suppresses physics prefetching on low tier and mobile (`high === false`). Focus the physics optimization strictly on Vite Rollup `manualChunks` segmentation.
*   ***Proposed Edit:***
    *   Location: Section 7.2 (Architectural Decisions 3)
    *   Change: State that `Court.tsx` already restricts prefetching via `if (high && !saveData)`, and focus the task on Rollup chunk isolation in `vite.config.ts`.

### Issue 7 [egm-design, egm-implementation-readiness] - Severity: Major
*   **Affected Scope:** [Lines 125-127, 210-216](file:///workspace/site-egm/docs/designs/egm-redo.md#L125-L127) (Architectural Decisions 3 and Implementation Plan Item 3 `vite.config.ts`)
*   **Discrepancy Description:** Grouping `framer-motion` into `vendor-framework` defeats `App.tsx`'s `LazyMotion` optimization by loading the animation engine in the initial parse.
*   **Rationale:** `LazyMotion` was designed to keep Framer Motion out of the initial bundle.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** Configure `manualChunks` with `vendor-three` (`three`, `@react-three/fiber`, `@react-three/drei`), `vendor-rapier` (`@react-three/rapier`, `@dimforge/rapier3d-compat`), and keep `framer-motion` as an asynchronous dynamic bundle loaded via `LazyMotion`.
*   ***Proposed Edit:***
    *   Location: Section 7.2 and Section 11 (Item 3 `web/vite.config.ts`)
    *   Change: Exclude `framer-motion` from the primary synchronous vendor chunk.

### Issue 8 [egm-design, egm-codebase-details] - Severity: Nit
*   **Affected Scope:** [Lines 137-140, 217-222](file:///workspace/site-egm/docs/designs/egm-redo.md#L137-L140) (Architectural Decisions 5 and Implementation Plan Item 4 `Nav.tsx`)
*   **Discrepancy Description:** Using a hyphen delimiter in `aria-label="HK - Harish Kumar T N, back to top"` can cause screen readers to vocalize "HK hyphen...".
*   **Rationale:** A colon delimiter produces smoother speech synthesis while satisfying WCAG 2.5.3.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** Use `aria-label={`${site.monogram}: ${site.name}, back to top`}` which includes the visible "HK" label without literal hyphen vocalization.
*   ***Proposed Edit:***
    *   Location: Section 7.2 (Architectural Decisions 5) and Section 11 (Item 4 `Nav.tsx`)
    *   Change: Set `aria-label={`${site.monogram}: ${site.name}, back to top`}`.

### Issue 9 [egm-style, ca78bf9c, b24a7b20] - Severity: Major / Nit
*   **Affected Scope:** [Throughout lines 1-256](file:///workspace/site-egm/docs/designs/egm-redo.md)
*   **Discrepancy Description:** Style guide compliance: remove Oxford commas (lines 64, 214), remove marketing fluff ("seamlessly", "zero-cost"), calibrate mobile score target (line 170), remove redundant "Rejected by author:" prefixes (lines 149, 154, 159), and ensure regular hyphens only.
*   **Rationale:** Strict compliance with repository writing style rules.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** Improves conciseness, precision and adheres to the owner's explicit writing constraints.
*   ***Proposed Edit:***
    *   Location: Full document
    *   Change: Apply all proposed text edits from `s7-style` and `s9-style`.

### Issue 10 [egm-structural] - Severity: Nit
*   **Affected Scope:** [Lines 144-160](file:///workspace/site-egm/docs/designs/egm-redo.md#L144-L160) (Section 8: Alternatives Considered)
*   **Discrepancy Description:** Upstream `concepts_brief.md` evaluated Alternative 4 (Adopting external accessible UI component libraries like Radix Navigation Menu), but it was omitted from `egm-redo.md`.
*   **Rationale:** Preserves 1:1 structural symmetry with upstream artifacts.
*   ***AI Suggestion:*** PROPOSE FIX
*   ***Justification:** Document Alternative D in Alternatives Considered.
*   ***Proposed Edit:***
    *   Location: Section 8 (Alternatives Considered)
    *   Change: Insert Alternative D documenting rejection of external accessible component libraries.
