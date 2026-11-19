// Demo build: every read is served from recorded fixtures. Nothing calls a network.
// The fixtures were recorded from the real FastAPI backend (see demos/complyai/tools).
import fixtures from "./fixtures.json";

export const API = "";
export const BASE_PATH = "/projects/complyai/app";
export const REPO_URL = "https://github.com/hello-harishkumartn/agentic-compliance-auditor";

type Row = Record<string, unknown>;
const db = fixtures as unknown as {
  dashboard: Row; frameworks: Row[]; requirements: Row[]; controls: Row[]; evidence: Row[];
  audits: Row[]; findings: Row[]; finding_details: Record<string, Row>; reviews: Row[];
  agent_runs: Row[]; agents: Row[]; events: Record<string, Row[]>; reports: Row[];
};

export const fixtureIds = {
  audits: () => db.audits.map(a => String(a.id)),
  findings: () => db.findings.map(f => String(f.id)),
};

function where(rows: Row[], key: string, value: string | null) {
  return value ? rows.filter(r => r[key] === value) : rows;
}

function resolve(path: string): unknown {
  const [pathname, search = ""] = path.split("?");
  const q = new URLSearchParams(search);
  const parts = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const [head, id, sub] = parts;
  switch (head) {
    case "health": return { status: "ok", service: "Agentic Compliance Auditor (recorded demo)" };
    case "dashboard": return db.dashboard;
    case "frameworks": return db.frameworks;
    case "requirements": return where(db.requirements, "framework_id", q.get("framework_id"));
    case "controls": return db.controls;
    case "evidence": return db.evidence;
    case "audits":
      if (id && sub === "events") return db.events[id] ?? [];
      if (id) return db.audits.find(a => a.id === id);
      return db.audits;
    case "findings":
      if (id) return db.finding_details[id];
      return where(db.findings, "audit_id", q.get("audit_id"));
    case "reviews": return where(db.reviews, "status", q.get("status_filter"));
    case "agent-runs": return where(db.agent_runs, "audit_id", q.get("audit_id"));
    case "agents": return db.agents;
    case "reports": return db.reports;
    default: return undefined;
  }
}

export async function getJSON<T>(path: string, fallback: T): Promise<T> {
  const value = resolve(path);
  if (value === undefined) return fallback;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function reportHref(auditId: string) {
  return `${BASE_PATH}/reports/audit-${auditId}.html`;
}

export function pretty(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

export function statusTone(value: string) {
  if (["COMPLIANT", "APPROVED", "SUCCEEDED", "REPORT_READY"].includes(value)) return "bg-emerald-100 text-emerald-800";
  if (["NON_COMPLIANT", "FAILED", "REJECTED"].includes(value)) return "bg-rose-100 text-rose-800";
  if (["PARTIALLY_COMPLIANT", "PENDING", "AWAITING_FINDING_REVIEW", "AWAITING_REQUIREMENT_REVIEW"].includes(value)) return "bg-amber-100 text-amber-900";
  return "bg-slate-100 text-slate-700";
}
