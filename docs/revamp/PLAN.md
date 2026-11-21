# Portfolio revamp plan

Branch: `revamp/neon`. Nothing here touches `main`, `gh-pages`, DNS or `site/life/`.

## Target

- One Next.js app in `next/`: profile at `/`, each project at `/projects/<slug>`.
- One free Neon Postgres project (`harishkumartn-portfolio`) with one schema per project.
- Shared auth (Better Auth) in the `public` schema, used by every project.
- Hosted on Vercel (Hobby, free). `harishkumartn.in` moves to Vercel only after Harish says yes.
- File uploads, when a project needs them: Vercel Blob free tier.

## Today

- Live site: static build in `site/`, published to `gh-pages` by GitHub Actions on every push to `main`.
- Source: Vite + React 19 + React Three Fiber in `web/`. All text in `web/src/content.ts`, projects in `web/src/projects.ts`.
- Social hub: Cloudflare Worker + D1 in `api/` (stays as it is for now).
- Five demos (forgeloop, recallx, complyai, sentinelx, agentmesh) are static Next.js exports in `site/projects/<slug>/app/` with recorded responses and a "Sample data" note.

## The 8 projects and the data each needs

| Project | Today | Schema | Data it needs |
| --- | --- | --- | --- |
| ForgeLoop | static demo, recorded runs | `forgeloop` | runs, steps (modify, test, repair), diffs, test logs |
| RecallX | static demo, recorded answers | `recallx` | documents, chunks with embeddings (pgvector), roles, questions with citations |
| ComplyAI | static demo, recorded audit | `complyai` | audits, agent findings, approval gates and decisions, fictional company records |
| SentinelX | static demo, simulated fleet | `sentinelx` | services, incidents, investigation steps, proposed fixes and approvals |
| AgentMesh | static demo, recorded DAGs | `agentmesh` | agents, DAG runs, tasks, approvals, traces |
| Harish Agents Map | separate GitHub Pages app | `agents_map` | agent status snapshots (one row per agent per update) |
| Harish Ops Colony | static app sample | `ops_colony` | agents, routines, activity feed |
| AutoColor | browser only (Rust/WASM) | none | nothing; photos never leave the device. Optional: saved presets |

The AI model calls in the five demos need a model key and a server; that is a later phase per project and is not part of the free plan work.

## Phases

1. **Profile (this branch)**: `portfolio` schema with profile, experience, education, projects and links. Admin page at `/admin` to edit them. Daily keep alive cron. Project pages read their summary from the `projects` table and link to the existing demos.
2. **Projects, one at a time**: create the project schema, move its recorded data into tables, port its demo into `/projects/<slug>` and drop the "Sample data" note once real data is served.
3. **Cut over**: Harish approves, `harishkumartn.in` points at Vercel, GitHub Pages deploy is retired. `site/life/` keeps working (copied as static files, never regenerated).
