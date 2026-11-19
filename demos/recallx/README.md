# RecallX live demo

Static export of the enterprise-knowledge-ai Next.js frontend with a browser-side mock backend (`overlay/lib/api.ts` plus `overlay/lib/demo-engine.ts`) over the repo's own sample_data and eval set. It is served at /projects/recallx/app/.
Rebuild with `demos/recallx/build.sh` (any cwd, needs git, node and npm). It writes site/projects/recallx/app/.
To refresh the fixtures from a source checkout run `python3 -I demos/recallx/gen_fixtures.py <path-to-enterprise-knowledge-ai>`.
