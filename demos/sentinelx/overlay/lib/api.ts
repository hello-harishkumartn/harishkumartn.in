// Demo build of lib/api.ts. Same exported `api` surface as the real client, but every call is
// answered in the browser from recorded fixtures (see lib/demo/fixtures.js). No network calls.
//
// Each recorded scenario is a tree of tracks keyed by the approval decisions taken so far
// ("" first run, "a" approved, "r" rejected, "ra" rejected then approved ...). An in-memory
// incident holds its scenario, its decision path and when the current track started. The frame
// shown is derived from elapsed time, so polling sees the investigation advance step by step.
import type {
  ActionItem,
  GraphResponse,
  HypothesisItem,
  IncidentDetail,
  IncidentEvent,
  IncidentSummary,
  ScenarioInfo,
  ServiceStateItem,
  ToolCallItem,
  VerificationItem,
} from "./types";
import fixtures from "./demo/fixtures.js";
import type { PackedFrame } from "./demo/fixtures.js";
import { SEED_INCIDENTS } from "./demo/seeds";

const STEP_MS = 1600;
const STORAGE_KEY = "sentinelx-demo-incidents-v1";

interface DemoIncident {
  id: string;
  scenario: string;
  createdAt: number;
  path: string | null; // null: investigation not started yet
  trackStartedAt: number;
  approveAll: boolean;
}

interface Frame {
  incident: IncidentDetail;
  events: IncidentEvent[];
  hypotheses: HypothesisItem[];
  toolCalls: ToolCallItem[];
  actions: ActionItem[];
  verifications: VerificationItem[];
  services: ServiceStateItem[];
  approvals: ActionItem[];
  graph: GraphResponse;
}

let store: DemoIncident[] | null = null;

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function trackLength(scenario: string, path: string): number {
  return fixtures.scenarios[scenario].tracks[path]?.length ?? 0;
}

function seedStore(): DemoIncident[] {
  const now = Date.now();
  return SEED_INCIDENTS.map((s) => ({
    id: s.id,
    scenario: s.scenario,
    createdAt: now - s.minutesAgo * 60_000,
    path: s.path,
    trackStartedAt: 0, // long ago, so the recorded track is already at its last frame
    approveAll: false,
  }));
}

function load(): DemoIncident[] {
  if (store) return store;
  try {
    const raw = typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    if (raw) store = (JSON.parse(raw) as DemoIncident[]).filter((i) => i && fixtures.scenarios[i.scenario]);
  } catch {
    store = null;
  }
  if (!store) store = seedStore();
  return store;
}

function save(): void {
  try {
    if (typeof window !== "undefined" && store) window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage is optional: the demo still works in memory
  }
}

function find(id: string): DemoIncident {
  const inc = load().find((i) => i.id === id);
  if (!inc) throw new Error(`GET /incidents/${id} failed (404): {"detail":"Incident ${id} not found"}`);
  return inc;
}

// With "auto-approve" on, a run that pauses for approval continues straight into the approve branch.
function settleAutoApprove(inc: DemoIncident, now: number): void {
  while (inc.approveAll && inc.path !== null) {
    const len = trackLength(inc.scenario, inc.path);
    const endsAt = inc.trackStartedAt + len * STEP_MS;
    const next = inc.path + "a";
    if (now < endsAt || trackLength(inc.scenario, next) === 0) return;
    const last = fixtures.scenarios[inc.scenario].tracks[inc.path][len - 1];
    if (last.approvals.length === 0) return;
    inc.path = next;
    inc.trackStartedAt = endsAt;
    save();
  }
}

function currentPacked(inc: DemoIncident): { frame: PackedFrame; running: boolean } {
  const sc = fixtures.scenarios[inc.scenario];
  if (inc.path === null) return { frame: sc.initial, running: false };
  const now = Date.now();
  settleAutoApprove(inc, now);
  const track = sc.tracks[inc.path];
  // The first run starts with one step of "thinking" on the initial frame. Decision tracks start at once.
  const offset = inc.path === "" ? 1 : 0;
  const idx = Math.floor((now - inc.trackStartedAt) / STEP_MS) - offset;
  if (idx < 0) return { frame: sc.initial, running: true };
  const clamped = Math.min(idx, track.length - 1);
  const atEnd = clamped === track.length - 1;
  const autoNext = inc.approveAll && track[track.length - 1].approvals.length > 0 && trackLength(inc.scenario, inc.path + "a") > 0;
  return { frame: track[clamped], running: !atEnd || autoNext };
}

const ISO_RE = /"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d+)?(?:Z|[+-]\d{2}:\d{2})?"/g;

function parseUtc(ts: string, frac?: string): number {
  return Date.parse(`${ts}${(frac ?? ".000").slice(0, 4).padEnd(4, "0")}Z`);
}
const cache = new Map<string, Frame>();

// Rebase the recorded frame onto this incident: its id and timestamps relative to its creation time.
function materialize(inc: DemoIncident, packed: PackedFrame): Frame {
  const key = `${inc.id}|${inc.createdAt}|${JSON.stringify(packed)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const pool = fixtures.pool;
  const raw = {
    incident: pool[packed.incident],
    graph: pool[packed.graph],
    events: packed.events.map((i) => pool[i]),
    hypotheses: packed.hypotheses.map((i) => pool[i]),
    toolCalls: packed.toolCalls.map((i) => pool[i]),
    actions: packed.actions.map((i) => pool[i]),
    verifications: packed.verifications.map((i) => pool[i]),
    services: packed.services.map((i) => pool[i]),
    approvals: packed.approvals.map((i) => pool[i]),
  };
  const sc = fixtures.scenarios[inc.scenario];
  const created = (pool[sc.initial.incident] as IncidentDetail).created_at;
  const recordedCreated = parseUtc(created.slice(0, 19), created.slice(19, 23) || undefined);
  const delta = inc.createdAt - recordedCreated;
  const text = JSON.stringify(raw)
    .split(sc.id)
    .join(inc.id)
    .replace(ISO_RE, (_m, ts: string, frac?: string) => `"${new Date(parseUtc(ts, frac) + delta).toISOString()}"`);
  const frame = JSON.parse(text) as Frame;
  if (cache.size > 200) cache.clear();
  cache.set(key, frame);
  return frame;
}

function frameOf(id: string): Frame {
  const inc = find(id);
  return materialize(inc, currentPacked(inc).frame);
}

function summary(d: IncidentDetail): IncidentSummary {
  const { id, scenario_type, seed, phase, stopping_reason, alert_summary, iteration, tool_call_count, tokens_used, created_at, resolved_at } = d;
  return { id, scenario_type, seed, phase, stopping_reason, alert_summary, iteration, tool_call_count, tokens_used, created_at, resolved_at };
}

function reply<T>(fn: () => T): Promise<T> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (err) {
        reject(err);
      }
    }, 60);
  });
}

export const api = {
  listScenarios: () => reply<ScenarioInfo[]>(() => fixtures.scenarioList),
  listIncidents: () =>
    reply<IncidentSummary[]>(() =>
      [...load()].sort((a, b) => b.createdAt - a.createdAt).map((inc) => summary(frameOf(inc.id).incident)),
    ),
  createIncident: (scenario_type: string, _seed?: number) =>
    reply<IncidentDetail>(() => {
      if (!fixtures.scenarios[scenario_type]) throw new Error(`POST /incidents failed (422): unknown scenario ${scenario_type}`);
      const inc: DemoIncident = { id: newId(), scenario: scenario_type, createdAt: Date.now(), path: null, trackStartedAt: 0, approveAll: false };
      load().push(inc);
      save();
      return frameOf(inc.id).incident;
    }),
  getIncident: (id: string) => reply<IncidentDetail>(() => frameOf(id).incident),
  getEvents: (id: string) => reply<IncidentEvent[]>(() => frameOf(id).events),
  getHypotheses: (id: string) => reply<HypothesisItem[]>(() => frameOf(id).hypotheses),
  getToolCalls: (id: string) => reply<ToolCallItem[]>(() => frameOf(id).toolCalls),
  getActions: (id: string) => reply<ActionItem[]>(() => frameOf(id).actions),
  getVerifications: (id: string) => reply<VerificationItem[]>(() => frameOf(id).verifications),
  getServices: (id: string) => reply<ServiceStateItem[]>(() => frameOf(id).services),
  getGraph: (id: string) => reply<GraphResponse>(() => frameOf(id).graph),
  getApprovals: (id: string) => reply<ActionItem[]>(() => frameOf(id).approvals),
  startInvestigation: (id: string, approveAll: boolean, _stepDelay = 0.6) =>
    reply<{ status: string }>(() => {
      const inc = find(id);
      if (inc.path !== null) throw new Error(`POST /incidents/${id}/investigate failed (409): Investigation already started`);
      inc.path = "";
      inc.trackStartedAt = Date.now();
      inc.approveAll = approveAll;
      save();
      return { status: "started" };
    }),
  investigationStatus: (id: string) =>
    reply<{ running: boolean }>(() => {
      const inc = find(id);
      return { running: currentPacked(inc).running };
    }),
  decideApproval: (id: string, actionId: string, approved: boolean, _reason?: string) =>
    reply<{ status: string }>(() => {
      const inc = find(id);
      const { frame, running } = currentPacked(inc);
      const pending = materialize(inc, frame).approvals;
      if (running || !pending.some((a) => a.id === actionId) || inc.path === null) {
        throw new Error(`POST /incidents/${id}/approvals/${actionId} failed (400): Action is not pending approval`);
      }
      const next = inc.path + (approved ? "a" : "r");
      if (trackLength(inc.scenario, next) === 0) {
        throw new Error(`POST /incidents/${id}/approvals/${actionId} failed (400): No recorded branch for this decision`);
      }
      inc.path = next;
      inc.trackStartedAt = Date.now();
      save();
      return { status: "resuming" };
    }),
};
