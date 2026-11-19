# Spec: every project opens a working app (19 Nov 2026)

## Goal
All 8 projects on harishkumartn.in open something that works. The home card Open button goes straight to the working app. No paid hosting, no API keys.

## Today
- Working: autocolor (/projects/autocolor/), harish-ops-colony (/projects/harish-ops-colony/app/), harish-agents-map (GitHub Pages).
- Not working: forgeloop, recallx, complyai, sentinelx, agentmesh. Pages say "Live demo coming soon". Each is a Python backend plus a Next.js frontend that needs Docker, Postgres and LLM keys.

## Approach for the 5
Each frontend talks to its backend through one file, lib/api.ts. For each project:
1. `demos/<slug>/` in this repo holds an overlay: a mock lib/api.ts backed by recorded fixtures, a next.config that sets `output: "export"`, `basePath: "/projects/<slug>/app"` and `trailingSlash: true`, `generateStaticParams` for dynamic routes and a visible "Sample data" banner.
2. `demos/<slug>/build.sh` clones the source repo at a pinned commit into a temp folder, applies the overlay, runs `next build` and copies `out/` into `site/projects/<slug>/app/`.
3. Fixtures come from the repo's own sample_data, seed scripts, eval sets and docs/DEMO.md. Nothing personal, no secrets, no keys.
4. Actions that would write (approve, upload, run) work in memory for the session so the demo feels alive.
5. The source repos are not changed.

Fallback if a frontend cannot be exported: a small static replay page at the same path.

## Site changes
- `projects.ts`: new optional `demoUrl` field. Set for all 8. Add an "Open the live demo" link with a "Sample data" note on the 5.
- Home card (`sections/Projects.tsx`): Open goes to `demoUrl` when set, else the project page. Code link stays.
- `project-pages.mjs`: show "Live demo coming soon" only when no demo exists.
- Tests updated for the new links. site/life/ untouched.

## Done when
- `npm run build`, `npm test` pass.
- All 8 demo URLs and every route inside the 5 new apps return 200 from a static server rooted at site/, all asset links resolve and pages load in a browser without console errors.
- Work is on branch `projects-live-demos` with an unmerged PR to main.

## Review notes (fresh-context review, folded in)
- Not every call goes through lib/api.ts: forgeloop fetches in app/page.tsx; complyai review-actions.tsx and upload-button.tsx and agentmesh ApprovalActions.tsx and RunDemo.tsx fetch directly. Overlays replace those files too.
- agentmesh pages set `dynamic = "force-dynamic"`. The overlay strips it.
- sentinelx incidents/[id] is a client page. It gets a server wrapper with generateStaticParams.
- complyai detail pages are server components, so their data is fixed at build time. Client actions update in memory and never reload the page.
- Raw `<a href="/...">` and `window.location` skip basePath. Overlays fix them. Links to backend URLs are replaced.
- Binary files in the export are stored as .b64, the same rule as the rest of site/.
- Builds use `npm ci` from each lockfile.
- `href` stays the project page. Open uses `demoUrl ?? href`, and the tests change to match.
