# Drift report: every project opens a working app (19 Nov 2026)

Spec: docs/2026-11-19_live-demos_SPEC.md. Branch: projects-live-demos.

## Built as specified
- Five static exports of each repo's own Next.js frontend: forgeloop, recallx, complyai, sentinelx and agentmesh. Each one lives at /projects/<slug>/app/ with a "Sample data" banner, a Code on GitHub link and a link back to the site.
- `demos/<slug>/build.sh` clones the source repo at a pinned commit, applies `overlay/`, runs `npm ci` and `next build` and copies `out/` into site/. The source repos are unchanged.
- `projects.ts` has a new `demoUrl` field for all 8. The home card Open button uses `demoUrl ?? href`. Project pages link "Open the live demo" and drop "Live demo coming soon" when a demo exists.
- site/life/ is byte-identical before and after (sha1 of every file compared).

## Drift from the spec
- Fixtures: three demos (complyai, sentinelx and agentmesh) were recorded by running the repo's own backend offline with SQLite and its rule based or offline provider, not written by hand. `tools/record_*.py` re-records them. This is closer to the real app than the spec asked for.
- forgeloop has one page only, so its "routes" are the page plus a "Start a sample run" button added for the demo.
- recallx login lets anyone in as a sample Employee or Admin. Uploaded PDF and DOCX files are listed but not searchable. Text and Markdown uploads are.
- complyai report pages are static files captured at record time, so review decisions made in the demo do not change them.
- sentinelx and agentmesh runs started in the browser open at `incidents/view/?id=` and `runs/live/?id=` so they never 404.
- A bug in the original recallx chat page (an effect returned the value of `scrollIntoView`, which current Chrome returns as a Promise, so React crashed after the first answer) is fixed in the overlay. The source repo still has it.
- No binary files came out of any export, so no new .b64 files.
- Some upstream text in sentinelx and agentmesh still has em dashes. It is original app copy and was left as is. All new copy follows the writing rule.
- The Vite build changed the hash of every chunk in site/assets/. That is normal for this repo's sync step.

## Tests run
- `npm run build:all`: tsc, vite build, pages and sync all pass.
- `npm test`: 60 pass, 0 fail. New tests cover the demo links, the no "coming soon" rule and that every local demoUrl exists in site/.
- Headless Chromium over a copy of site/ with the deploy bundle unpacked and .b64 decoded: 68 pages (home, project index, 8 project pages, the 3 existing apps and every route of the 5 new apps) all 200, banner present, 0 console errors, 0 failed requests.
- Click-through in the same browser: forgeloop sample run steps through stages. recallx Admin login, then a sample chat question gets a cited answer. complyai approve with a rationale updates the review queue. sentinelx redis_failure investigation asks for approval after about 10s and resolves after approval. agentmesh Run demo reaches the approval gate and completes after Approve.
