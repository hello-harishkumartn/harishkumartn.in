# forgeloop demo

Static export of the AutonomousDev Harness dashboard (web/ in autonomous-agent-harness, pinned commit) with an in-browser mock of its FastAPI routes, served at /projects/forgeloop/app/.
overlay/ is copied over web/ before building: next.config.ts (static export), app/layout.tsx (sample data banner), app/page.tsx (fetch swapped for the mock) and app/mock/ (recorded runs from the repo's benchmark and README).
Rebuild with `bash demos/forgeloop/build.sh` from any directory. It writes site/projects/forgeloop/app/.
