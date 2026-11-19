"""Record frame-by-frame replays of every scenario with the repo's own simulator and offline provider.

Usage: python record_fixtures.py <path-to-backend-dir> <output fixtures.js>
Needs fastapi, pydantic, pydantic-settings, SQLAlchemy and sse-starlette (see backend/requirements.txt).
Ids come from a seeded generator and the clock is simulated, so the output is reproducible.
Every approve / reject branch is recorded until the run resolves or the iteration budget runs out.
"""
import json, os, random, sys, tempfile, uuid

BACKEND, OUT_JS = sys.argv[1], sys.argv[2]
_DB = os.path.join(tempfile.mkdtemp(), "rec.db")
os.environ["AIRE_DATABASE_URL"] = "sqlite:///" + _DB
os.environ["AIRE_LLM_PROVIDER"] = "offline"
sys.path.insert(0, BACKEND)

_rng = random.Random(0)
uuid.uuid4 = lambda: uuid.UUID(int=_rng.getrandbits(128), version=4)

from sqlalchemy import select  # noqa: E402
from app import models_db as m  # noqa: E402
from app.db import SessionLocal, init_db, session_scope  # noqa: E402
from app.api import serializers as ser, graph  # noqa: E402
from app.agent.factory import create_incident, load_agent_loop  # noqa: E402
from app.simulator.scenarios import SCENARIOS  # noqa: E402
from app.safety import approval  # noqa: E402
import app.agent.loop as loopmod  # noqa: E402

init_db()

import datetime as _real_dt, types  # noqa: E402
CLOCK = {"t": None}
T0 = _real_dt.datetime(2026, 11, 19, 9, 0, 0, tzinfo=_real_dt.timezone.utc)


def _clock():
    CLOCK["t"] += _real_dt.timedelta(milliseconds=7)
    return CLOCK["t"]


class _FakeDT(_real_dt.datetime):
    @classmethod
    def now(cls, tz=None):
        return _clock()


_shim = types.ModuleType("dtshim")
_shim.__dict__.update({k: getattr(_real_dt, k) for k in dir(_real_dt) if not k.startswith("__")})
_shim.datetime = _FakeDT
import importlib  # noqa: E402
for modname in ["app.models_db", "app.agent.loop", "app.simulator.engine", "app.simulator.generators",
                "app.agent.stopping", "app.safety.approval", "app.tools.serialize"]:
    mod = importlib.import_module(modname)
    if getattr(mod, "dt", None) is _real_dt:
        mod.dt = _shim


def snapshot(iid):
    with session_scope() as s:
        inc = s.get(m.Incident, iid)
        q = lambda model, order: [r for r in s.execute(select(model).where(model.incident_id == iid).order_by(order)).scalars()]
        visited = {row[0] for row in s.execute(select(m.IncidentEvent.phase).where(m.IncidentEvent.incident_id == iid).distinct())}
        return {
            "incident": ser.incident_detail(inc),
            "events": [ser.event_dict(r) for r in q(m.IncidentEvent, m.IncidentEvent.created_at)],
            "hypotheses": [ser.hypothesis_dict(r) for r in q(m.Hypothesis, m.Hypothesis.created_iteration)],
            "toolCalls": [ser.tool_call_dict(r) for r in q(m.ToolCallLog, m.ToolCallLog.started_at)],
            "actions": [ser.action_dict(r) for r in q(m.ActionLog, m.ActionLog.created_at)],
            "verifications": [ser.verification_dict(r) for r in q(m.VerificationResult, m.VerificationResult.created_at)],
            "services": [ser.service_state_dict(r) for r in s.execute(select(m.ServiceState).where(m.ServiceState.incident_id == iid)).scalars()],
            "approvals": [ser.action_dict(a) for a in approval.list_pending(s, iid)],
            "graph": graph.build_graph(visited, inc.phase),
        }


frames = []
current = {"id": None}


class FakeTime:
    @staticmethod
    def sleep(_):
        CLOCK["t"] += _real_dt.timedelta(milliseconds=1400)
        frames.append(snapshot(current["id"]))

    def __getattr__(self, name):
        import time
        return getattr(time, name)


loopmod.time = FakeTime()


def run_to_pause(stype, seed):
    global _rng
    CLOCK["t"] = T0
    import zlib; _rng.seed(zlib.crc32(f"{stype}:{seed}".encode()))
    with session_scope() as s:
        inc = create_incident(s, stype, seed)
        iid = inc.id
    current["id"] = iid
    frames.clear()
    initial = snapshot(iid)
    s = SessionLocal()
    loop = load_agent_loop(s, iid)
    result = loop.run_to_completion(step_delay=1)
    frames.append(snapshot(iid))
    run = list(frames)
    return iid, s, loop, result, initial, run


def purge(iid):
    from app.db import Base, engine
    with engine.begin() as c:
        for t in reversed(Base.metadata.sorted_tables):
            if "incident_id" in t.c:
                c.execute(t.delete().where(t.c.incident_id == iid))
        c.execute(m.Incident.__table__.delete().where(m.Incident.__table__.c.id == iid))


def dedupe(fs):
    out = []
    for f in fs:
        if not out or json.dumps(out[-1], sort_keys=True) != json.dumps(f, sort_keys=True):
            out.append(f)
    return out



def record_path(stype, seed, path):
    """Replay from scratch, apply decisions in `path` ('a'/'r'), return (frames of last segment, terminal?)."""
    iid, sess, loop, result, initial, run = run_to_pause(stype, seed)
    seg = run
    for ch in path:
        pending = approval.list_pending(sess, iid)
        if not pending:
            break
        approval.decide(sess, pending[0].id, approved=(ch == "a"), decided_by="ui-operator",
                        reason=None if ch == "a" else "Rejected by operator in demo")
        sess.commit()
        frames.clear()
        frames.append(snapshot(iid))
        result = loop.resume_after_approval(step_delay=1)
        frames.append(snapshot(iid))
        seg = list(frames)
    paused = bool(approval.list_pending(sess, iid))
    sess.close()
    purge(iid)
    return iid, initial, dedupe(seg), paused


MAX_DEPTH = int(os.environ.get("MAX_DEPTH", "12"))
out = {}
seed = 42
for st in SCENARIOS:
    stype = st.value if hasattr(st, "value") else st
    tracks = {}
    todo = [""]
    initial = None
    iid0 = None
    while todo:
        path = todo.pop(0)
        iid, ini, seg, paused = record_path(stype, seed, path)
        iid0 = iid0 or iid
        assert iid == iid0
        initial = initial or ini
        tracks[path] = seg
        if paused and len(path) < MAX_DEPTH:
            todo += [path + "a", path + "r"]
    out[stype] = {"id": iid0, "initial": initial, "tracks": tracks}
    print(stype, {k: (len(v), v[-1]["incident"]["phase"], v[-1]["incident"]["stopping_reason"]) for k, v in tracks.items()})


# compress: pool of unique objects, frames reference pool indexes
pool, index = [], {}
def ref(o):
    k = json.dumps(o, sort_keys=True)
    if k not in index:
        index[k] = len(pool)
        pool.append(o)
    return index[k]

LISTS = ["events", "hypotheses", "toolCalls", "actions", "verifications", "services", "approvals"]
def pack(f):
    r = {k: [ref(x) for x in f[k]] for k in LISTS}
    r["incident"] = ref(f["incident"])
    r["graph"] = ref(f["graph"])
    return r

from app.api.incidents import list_scenarios  # noqa: E402
packed = {"pool": pool, "scenarioList": list_scenarios(), "scenarios": {}}
for stype, e in out.items():
    packed["scenarios"][stype] = {
        "id": e["id"], "initial": pack(e["initial"]),
        "tracks": {k: [pack(f) for f in v] for k, v in e["tracks"].items()},
    }
with open(OUT_JS, "w") as fh:
    fh.write("// Generated by demos/sentinelx/tools/record_fixtures.py from the source repo's simulator.\n")
    fh.write("const data = " + json.dumps(packed, separators=(",", ":")) + ";\nexport default data;\n")
print("wrote", OUT_JS, os.path.getsize(OUT_JS))
