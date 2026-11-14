# Projects section

* **Author:** Harish Kumar T N
* **Date:** 2026-11-14
* **Status:** Revised 2026-11-14 to the final scope below; implemented on branch `projects-section`
* **Brief:** EGM brainstorm, with 7 Goldfish lenses

## Revision (final scope, overrides the rest of this doc where they differ)

- Exactly 7 public repos of hello-harishkumartn: forgeloop, recallx, complyai, sentinelx, agentmesh, harish-agents-map, harish-ops-colony. The 4 private repos are removed from the data and get no pages (recorded as skipped).
- Every card: title, one-line description, tags, "Open" to `/projects/<slug>/` and "Code" to `https://github.com/hello-harishkumartn/<repo>`. No `kind`, no `public` flag, no iframes.
- `scripts/project-pages.mjs` generates a static text page for all 7 slugs: title, description, tags, Code link, "Live demo coming soon". Optional `links` add the live agents map app and the colony `app/` sample (with a "Sample data" note). Pages carry a generator meta tag; the writer never overwrites an `index.html` without it, so later demo drops are safe.
- `Project` type: `slug`, `title`, `description`, `tags`, `repo`, derived `href` and `codeUrl` (always set), optional `links: {label, href, note?}[]`. The section reuses the original plan (lazy `sections/Projects.tsx`, `Section`/`Card`/`Pill`, hidden link suffix, nav item after Work).
- Marker: `<meta name="generator" content="project-pages">`. The writer silently skips an existing `index.html` without it. The colony `app/` copy is already in place and is not regenerated.
- Skipped repos are recorded in `/workspace/site-projects/SITE_RESULT.md`, not in code.
- Tests replace the old table: 7 slugs with repo URLs, page per slug with Code link and "coming soon", marker skip, sync keeps `site/projects`.
- Lighthouse checks are out of scope. Tests: `npm test` (`node --test`).

### Self-grill (answered from repo docs)

- Why not keep private repos as info cards? Final scope says list only public repos; private ones expose nothing clickable.
- Does the colony sample stay sanitized? Yes, `app/` is untouched and `ops-colony.test.mjs` still guards `status.json`.
- Does 3D change on phones? No, only a lazy section and a nav item are added.

## The problem

The site has no place to show what Harish has built. Eleven projects exist: five agent demos built separately, two static 3D apps and four private repos. Visitors need one list of them, one page per project, and a link to the code where the code is public.

## Goals

1. A Projects section with exactly 11 cards. Each card has a title, a one-line description, tech tags, an "Open" link to `/projects/<slug>/` in a new tab, and either a "Code" link to the GitHub repo or a "Private repo" tag.
2. A static homepage for each of the 6 non-demo slugs, plus `/projects/index.html`.
3. A sanitized copy of the ops colony app under `/projects/harish-ops-colony/app/`.
4. `npm run sync` never changes `site/projects/` or `site/life/`.
5. Accessibility stays at 100, and mobile Lighthouse performance does not drop below the baseline (35, measured at 3bcba8c with the bundle unpacked).

## Non-goals

- A 3D hotspot for Projects. The scenes and hero are unchanged, and 3D stays on for all phones.
- The 5 demo builds. They are dropped into `site/projects/<slug>/` later; until then their "Open" links show the 404 page.
- CI changes and a custom 404 page.

## Technical plan

```
web/src/projects.ts ──► sections/Projects.tsx (lazy chunk)  ──► #projects on home page
        │
        └──────────► scripts/project-pages.mjs ──► site/projects/{index.html, projects.css, <6 slugs>/index.html}
web/dist ──► scripts/sync-site.mjs (syncSite) ──► site/  (skips and hash-checks life/ and projects/)
```

- **Data.** `web/src/projects.ts` holds the typed list: `slug`, `title`, `description`, `tags`, `repo`, `public`, `kind` (`demo` | `live` | `app` | `info`), `features`, `note`, `embedUrl`. It has no imports and uses only syntax Node can strip, so Node 24 can import it directly. `content.ts` gains only `'projects'` in `SectionId` and a nav item after Work. Keeping the cards in a separate module keeps them out of the initial bundle, because Nav and Hero import `content.ts`.
- **Section.** `sections/Projects.tsx` is lazy-loaded through `sections/index.ts` and built from the existing `Section`, `Card` and `Pill` components. Link text stays "Open" and "Code", with a visually hidden suffix ("ForgeLoop, opens in a new tab") so the accessible name contains the visible label. Links use `target="_blank"` with `rel="noreferrer"`.
- **Pages.** `scripts/project-pages.mjs` renders HTML from `projects.ts` for every non-demo slug, plus the index and `projects.css`. It never writes a demo slug's folder. Pages use system fonts, the site's dark tokens (`#0d0b09`, accent `#fb923c`) and a "Back to harishkumartn.in" link to `/#projects`. Live and app pages embed an iframe that has a `title` and an "Open full screen" link. Info pages have a "Source is private" note, a features list and a "Live demo not available yet" reason.
- **Ops colony.** `index.html`, `colony.js` and `colony.part*.js` are copied as is, apart from two edits: the Mudrex chip shows "Sample data" and the legend shows the sample desk names. The app's own `status.json` (it holds a real balance) is not copied. A hand-written sample replaces it, with fake agents that reuse the app's layout ids.
- **Sync.** `sync-site.mjs` exports `syncSite({ distDir, siteDir, previewDir })`. It throws instead of calling `process.exit`, skips the protected folders (`life`, `projects`) when copying `dist/`, hashes the protected trees before and after and throws if they differ, and copies `site/projects/` into `preview/projects/`. The CLI runs only when the file is executed directly.
- **Build order.** `build:all` runs `build`, then `pages`, then `sync`.

## Alternatives considered

- Data in `content.ts`. Rejected by author: it adds every project's copy to the initial bundle.
- Hand-written pages in `web/public/projects/`. Rejected by author: the copy would be duplicated, and the sync step would overwrite the folder that demo drops share.
- A sandboxed iframe for the colony app. Rejected: it breaks the app's `localStorage` theme save and the local `status.json` fetch.
- Vitest. Rejected: `node:test` with type stripping needs no new dependency.

## Acceptance and tests (`npm test`, `node --test`)

| Check | Where |
|---|---|
| 11 entries, slugs unique, lowercase and URL-safe; private entries have no code URL; every Open link is `/projects/<slug>/` | `web/tests/projects.test.mjs` |
| Generated pages match `projects.ts` (rerun `npm run pages` if not) and are never written for demo slugs | `web/tests/project-pages.test.mjs` |
| No em or en dashes in the data or in generated pages | `web/tests/projects.test.mjs` |
| Sample `status.json` keys match an allowlist, with no money or personal terms | `web/tests/ops-colony.test.mjs` |
| `syncSite` leaves `site/projects` and `site/life` unchanged even if `dist/projects` exists, and stages `preview/projects` | `web/tests/sync-site.test.mjs` |
| 11 cards, the pages load, the colony renders robots, screenshots | agent-browser (manual) |
| Accessibility 100; mobile performance at or above 35 | Lighthouse, `/workspace/site-projects/lighthouse/LIGHTHOUSE.md` |

## Open issues

- The demo slugs show a 404 until their builds are dropped in.
- The colony app loads Three.js 0.160.0 from unpkg on the same origin as `/life/`.
- Renaming a slug leaves its old generated folder in place; delete it by hand.

## Drift report (2026-11-14, revised scope vs code)

- Matches: `projects.ts` has the 7 public entries with `codeUrl` always set and optional `links`; `sections/Projects.tsx` is lazy in `sections/index.ts`; nav item after Work; `scripts/project-pages.mjs` writes 7 text pages, the index and `projects.css` with the generator marker; `build:all` runs build, pages, sync; `sync-site.mjs` keeps `site/projects` (tested).
- Drift from the original body (superseded by the revision): no iframes, no private info pages, no Lighthouse run, the "never write demo slugs" rule is now the marker check.
- Open: the Code button text on pages is "Code on GitHub"; local smoke shows 404s for court textures because binaries are stored as `.b64` and only decoded in deploy (pre-existing).
