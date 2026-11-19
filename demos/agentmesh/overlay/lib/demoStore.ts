"use client";
// In-browser stand-in for the orchestrator. Runs started in this tab replay a
// recorded trace of the saas-churn-response DAG node by node. Approval decisions
// are kept in sessionStorage so they survive navigation inside the demo.
import { useEffect, useState } from "react";
import template from "@/fixtures/live-template.json";
import type { Approval, Run, Step } from "@/lib/api";

type Decision = { decision: "approved" | "rejected"; at: number; comment: string };
type SessionRun = { id: string; created: number };
type State = { runs: SessionRun[]; decisions: Record<string, Decision> };

const KEY = "agentmesh-demo-v1";
const ACTOR = "demo-visitor";
const tpl = template as unknown as Run & { workflow_id: string; budget: Record<string, unknown>; artifacts: { id: string; name: string; content: unknown; media_type: string; created_at: string }[] };

// Offsets in ms from run creation. research and analyze fan out in parallel.
const SCHEDULE: Record<string, [number, number]> = {
  plan: [400, 1600], research: [1600, 3800], analyze: [1600, 4400],
  execute: [4400, 5800], review: [5800, 7100], verify: [7100, 8200],
};
const GATE_AT = 8200;
const ARTIFACT_NODE: Record<string, string> = {
  "task-plan": "plan", "research-findings": "research", "data-analysis": "analyze",
  "action-plan": "execute", review: "review", verification: "verify",
};

let memory: State = { runs: [], decisions: {} };
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) memory = JSON.parse(raw) as State;
  } catch { /* storage unavailable: keep in-memory state */ }
  return memory;
}

function save(next: State) {
  memory = next;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  listeners.forEach(fn => fn());
}

const iso = (t: number) => new Date(t).toISOString();
export const approvalIdFor = (runId: string) => `${runId}-approval`;
export const isSessionRun = (id: string) => load().runs.some(r => r.id === id);

export function createRun(): string {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `run-${Date.now().toString(16)}`;
  const state = load();
  save({ ...state, runs: [{ id, created: Date.now() }, ...state.runs] });
  return id;
}

export function decide(approvalId: string, decision: "approved" | "rejected") {
  const state = load();
  if (state.decisions[approvalId]) return;
  const comment = decision === "approved" ? "Approved in the demo console" : "Rejected in the demo console";
  save({ ...state, decisions: { ...state.decisions, [approvalId]: { decision, at: Date.now(), comment } } });
}

export function decisionFor(approvalId: string): Decision | undefined {
  return load().decisions[approvalId];
}

/** Applies a human decision to a run that is waiting at its approval node. */
export function applyDecision<R extends Run>(run: R, d: Decision | undefined): R {
  if (!d || run.status !== "waiting_approval") return run;
  const output = { decision: d.decision, actor: ACTOR, comment: d.comment };
  const steps = (run.steps || []).map(s => s.node_id === "approve" ? { ...s, status: "completed", output, finished_at: iso(d.at) } : s);
  const artifacts = [...(run.artifacts || []), { name: "human-approval", content: output }];
  return { ...run, steps, artifacts, status: d.decision === "approved" ? "completed" : "rejected", finished_at: iso(d.at + 150) };
}

function materialize(sr: SessionRun, now: number): Run {
  const elapsed = now - sr.created;
  const done = (node: string) => SCHEDULE[node] ? elapsed >= SCHEDULE[node][1] : elapsed >= GATE_AT;
  const steps: Step[] = (tpl.steps || []).map(s => {
    const slot = SCHEDULE[s.node_id];
    const id = `${sr.id.slice(0, 8)}-${s.node_id}`;
    if (!slot) {
      // approval control node
      return { ...s, id, status: elapsed >= GATE_AT ? "waiting_approval" : "pending", output: {}, started_at: undefined, finished_at: undefined };
    }
    const [a, b] = slot;
    if (elapsed < a) return { ...s, id, status: "pending", attempt: 0, output: {}, tool_calls: [], tokens: 0, evaluation: {}, started_at: undefined, finished_at: undefined };
    if (elapsed < b) return { ...s, id, status: "running", output: {}, tool_calls: [], tokens: 0, evaluation: {}, started_at: iso(sr.created + a), finished_at: undefined };
    return { ...s, id, status: "completed", started_at: iso(sr.created + a), finished_at: iso(sr.created + b) };
  });
  const order = ["plan", "research", "analyze", "execute", "review", "verify", "approve"];
  steps.sort((x, y) => order.indexOf(x.node_id) - order.indexOf(y.node_id));
  const completed = steps.filter(s => s.status === "completed");
  const outputs = Object.fromEntries(completed.map(s => [s.node_id, s.output]));
  const artifacts = tpl.artifacts.filter(a => done(ARTIFACT_NODE[a.name] || "approve")).map(a => ({ name: a.name, content: a.content }));
  const status = elapsed < SCHEDULE.plan[0] ? "queued" : elapsed >= GATE_AT ? "waiting_approval" : "running";
  const run: Run = {
    id: sr.id, goal: tpl.goal, status, created_at: iso(sr.created),
    started_at: elapsed >= SCHEDULE.plan[0] ? iso(sr.created + SCHEDULE.plan[0]) : undefined,
    tokens_used: completed.reduce((n, s) => n + s.tokens, 0),
    estimated_cost_usd: completed.reduce((n, s) => n + s.estimated_cost_usd, 0),
    state: { completed_nodes: completed.map(s => s.node_id), outputs }, steps, artifacts,
  };
  return applyDecision(run, load().decisions[approvalIdFor(sr.id)]);
}

export function sessionRuns(now = Date.now()): Run[] {
  return load().runs.map(r => materialize(r, now));
}

export function sessionRun(id: string, now = Date.now()): Run | null {
  const sr = load().runs.find(r => r.id === id);
  return sr ? materialize(sr, now) : null;
}

export function sessionApprovals(now = Date.now()): Approval[] {
  return load().runs.filter(r => now - r.created >= GATE_AT).map(r => {
    const id = approvalIdFor(r.id);
    const d = load().decisions[id];
    return {
      id, run_id: r.id, node_id: "approve", reason: "Approve the evidence-backed churn action plan before release.",
      status: d ? d.decision : "pending", decided_by: d ? ACTOR : null, comment: d?.comment ?? null,
      requested_at: iso(r.created + GATE_AT), decided_at: d ? iso(d.at) : null,
    };
  });
}

/** Overlays decisions taken in this session onto recorded approvals. */
export function withDecisions(rows: Approval[]): Approval[] {
  const decisions = load().decisions;
  return rows.map(a => {
    const d = decisions[a.id];
    return d && a.status === "pending" ? { ...a, status: d.decision, decided_by: ACTOR, comment: d.comment, decided_at: iso(d.at) } : a;
  });
}

/**
 * Returns the current time once mounted (null during server render and
 * hydration) and re-renders on store changes and while runs are in flight.
 */
export function useDemoClock(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    load();
    const tick = () => setNow(Date.now());
    tick();
    listeners.add(tick);
    const timer = window.setInterval(() => {
      const live = load().runs.some(r => Date.now() - r.created < GATE_AT + 500);
      if (live) tick();
    }, 400);
    return () => { listeners.delete(tick); window.clearInterval(timer); };
  }, []);
  return now;
}
