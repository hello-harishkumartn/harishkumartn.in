"""Records fixtures for the agentmesh demo from the repo's own backend.

Usage: copy multi-agent-control/apps/api somewhere, install its dependencies
(fastapi sqlalchemy pydantic-settings httpx pgvector), cd into it and run
    python record.py <path to demos/agentmesh/overlay/fixtures>
It uses SQLite and the deterministic provider. No model or key is involved.
"""
import json, os, re, sys, time

os.environ["DATABASE_URL"] = "sqlite:///./record.db"
os.environ["ENVIRONMENT"] = "development"
sys.path.insert(0, os.getcwd())

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

OUT = sys.argv[1]
H = {"x-user": "ops-reviewer", "x-role": "admin"}
GOAL = "Analyze a fictional SaaS company's customer churn problem and produce an action plan."

with TestClient(app) as c:
    ids = []
    for _ in range(3):
        ids.append(c.post("/api/v1/runs", json={"workflow_slug": "saas-churn-response", "goal": GOAL}, headers=H).json()["id"])
        time.sleep(1.2)
    by_run = {a["run_id"]: a for a in c.get("/api/v1/approvals", headers=H).json()}
    c.post(f"/api/v1/approvals/{by_run[ids[0]]['id']}/decision", json={"decision": "approved", "comment": "Evidence and owners check out."}, headers=H)
    c.post(f"/api/v1/approvals/{by_run[ids[1]]['id']}/decision", json={"decision": "rejected", "comment": "Need a larger cohort before release."}, headers=H)
    time.sleep(1)
    c.post("/api/v1/evaluations/benchmark", json={"samples": 6}, headers=H)
    data = {p: c.get("/api/v1/" + p, headers=H).json() for p in ["dashboard", "agents", "tools", "workflows", "runs", "approvals", "memory", "evaluations", "analytics"]}
    data["run_detail"] = {i: c.get(f"/api/v1/runs/{i}", headers=H).json() for i in ids}

def dump(obj, name):
    # SQLite drops the timezone. Every stored timestamp is UTC.
    text = json.dumps(obj, separators=(",", ":"), default=str)
    text = re.sub(r'"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)"', r'"\1Z"', text)
    open(os.path.join(OUT, name), "w").write(text)

dump(data, "recorded.json")
dump(data["run_detail"][ids[2]], "live-template.json")
