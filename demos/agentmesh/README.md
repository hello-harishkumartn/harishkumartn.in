Static browser demo of the AgentPlane console from multi-agent-control (pinned commit in build.sh). Pages read responses recorded from the repo's deterministic backend (`overlay/fixtures/`). Run demo and approve or reject work in memory with a simulated DAG replay.
Rebuild with `bash demos/agentmesh/build.sh` (needs git, Node 20+ and network). It writes `site/projects/agentmesh/app/`.
To re-record fixtures run `tools/record.py` against a copy of `apps/api` with its Python dependencies installed (SQLite, deterministic provider).
