"use client";
// Client views that layer the in-memory session (lib/demo-store) over the
// recorded fixtures that the server components render at build time.
import { useState } from "react";
import { Empty, Metric, Pill } from "@/components/ui";
import { Workflow } from "@/components/workflow";
import { ReviewActions } from "@/components/review-actions";
import {
  type AuditEvent, type EvidenceItem, type FrameworkItem, type Review,
  auditStatus, effectiveReview, findingOverride, fmtDay, fmtTime, openFindingReviews, pendingCount, resetDemo, resumeAudit, useDemo,
} from "@/lib/demo-store";

export function PendingReviewsMetric() {
  const s = useDemo();
  return <Metric label="Review queue" value={pendingCount(s)} note="Human decisions required" />;
}

export function AuditStatusPill({ id, status, progress }: { id: string; status: string; progress: number }) {
  const s = useDemo();
  return <Pill value={auditStatus(id, s, { status, progress }).status} />;
}

export function AuditProgress({ id, status, progress }: { id: string; status: string; progress: number }) {
  const s = useDemo();
  const p = auditStatus(id, s, { status, progress }).progress;
  return <><div className="mt-5 h-2 overflow-hidden rounded-full bg-ink/5"><div className="h-full rounded-full bg-moss" style={{ width: `${p}%` }} /></div><p className="mt-2 text-right text-xs font-semibold text-ink/50">{p}% complete</p></>;
}

export function AuditWorkflow({ id, status, progress }: { id: string; status: string; progress: number }) {
  const s = useDemo();
  const current = auditStatus(id, s, { status, progress }).status;
  return <Workflow active={current === "REPORT_READY" ? 8 : 7} />;
}

export function AuditGate({ id, status, progress }: { id: string; status: string; progress: number }) {
  const s = useDemo();
  const [error, setError] = useState("");
  const current = auditStatus(id, s, { status, progress }).status;
  const open = openFindingReviews(s, id);
  return <div className="flex flex-col items-start gap-2 md:items-end"><Pill value={current} />
    {current === "AWAITING_FINDING_REVIEW" && (open
      ? <p className="text-xs text-ink/55">{open} finding review{open === 1 ? "" : "s"} open. Decide them in the review queue to resume.</p>
      : <button onClick={() => setError(resumeAudit(id) ?? "")} className="rounded-lg bg-moss px-3 py-2 text-xs font-bold text-white">Resume workflow and generate report</button>)}
    {error && <p className="text-xs text-rose-700">{error}</p>}
  </div>;
}

export function AuditTrail({ id, initial }: { id: string; initial: AuditEvent[] }) {
  const s = useDemo();
  const events = [...initial.map(e => ({ ...e, recorded: true })), ...(s.events[id] ?? []).map(e => ({ ...e, recorded: false }))];
  return <div className="max-h-[520px] overflow-auto p-5">{events.map(e => <div className="relative border-l border-ink/15 pb-5 pl-5 last:pb-0" key={e.id}><i className={`absolute -left-1 top-1 h-2 w-2 rounded-full ${e.recorded ? "bg-moss" : "bg-amber"}`} /><p className="text-sm font-medium">{e.summary}</p><p className="mt-1 text-[11px] text-ink/45">{e.actor} · {fmtTime(e.created_at)}{e.recorded ? "" : " · this session"}</p></div>)}</div>;
}

export function HumanStatusPill({ findingId, initial }: { findingId: string; initial: string }) {
  const s = useDemo();
  return <Pill value={findingOverride(findingId, s).human_status ?? initial} />;
}

export function LiveRationale({ findingId, initial }: { findingId: string; initial: string }) {
  const s = useDemo();
  return <>{findingOverride(findingId, s).rationale ?? initial}</>;
}

export function HumanReviewCard({ findingId, initial }: { findingId: string; initial: null | { status: string; decision: string | null; reason: string | null; reviewer: string | null } }) {
  const s = useDemo();
  const live = findingOverride(findingId, s).review;
  const r = live ?? initial;
  return <section className="card p-6"><p className="eyebrow">Human review</p>{r ? <><div className="mt-3"><Pill value={r.decision || r.status} /></div><p className="mt-3 text-sm">{r.reason || "Decision pending."}</p><p className="mt-2 text-xs text-ink/45">{r.reviewer || "Unassigned reviewer"}</p>{r.status !== "DECIDED" && live && <div className="mt-4"><ReviewActions id={live.id} /></div>}</> : <p className="mt-3 text-sm text-ink/50">Not queued.</p>}</section>;
}

export function ReviewList({ initial }: { initial: Review[] }) {
  const s = useDemo();
  const items = initial.map(r => effectiveReview(r, s));
  const touched = Object.keys(s.decisions).length > 0;
  return <div className="space-y-4">
    {touched && <div className="flex justify-end"><button onClick={resetDemo} className="text-xs font-semibold text-ink/50 underline">Reset this session</button></div>}
    {items.map(x => <article className={`card p-6 ${x.status !== "DECIDED" ? "border-l-4 border-l-amber" : ""}`} key={x.id}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="flex items-center gap-2"><Pill value={x.target_type} /><Pill value={x.decision || x.status} /></div><p className="mt-4 text-sm leading-6">{x.ai_recommendation}</p>{x.reason && <p className="mt-3 text-xs text-ink/50"><strong>{x.reviewer}:</strong> {x.reason}{x.decided_at && ` · ${fmtTime(x.decided_at)}`}</p>}</div>{x.status !== "DECIDED" && <ReviewActions id={x.id} />}</div></article>)}
    {!items.length && <Empty />}
  </div>;
}

export function EvidenceTable({ initial }: { initial: EvidenceItem[] }) {
  const s = useDemo();
  const items = [...initial, ...s.evidence];
  return <><table className="w-full min-w-[700px]"><thead><tr className="bg-ink/[.03] text-left"><th className="table-cell eyebrow">Document</th><th className="table-cell eyebrow">Type</th><th className="table-cell eyebrow">Trust</th><th className="table-cell eyebrow">Origin</th><th className="table-cell eyebrow">Added</th></tr></thead><tbody>{items.map(x => <tr key={x.id}><td className="table-cell font-medium">{x.name}</td><td className="table-cell"><Pill value={x.kind} /></td><td className="table-cell"><Pill value={x.trust_level} /></td><td className="table-cell text-ink/55">{x.metadata_json?.synthetic ? "Synthetic company record" : "User upload (this session)"}</td><td className="table-cell text-ink/55">{fmtDay(x.created_at)}</td></tr>)}</tbody></table>{!items.length && <Empty />}</>;
}

export function FrameworkCards({ initial }: { initial: FrameworkItem[] }) {
  const s = useDemo();
  const items = [...initial, ...s.frameworks];
  return <div className="grid gap-4 lg:grid-cols-2">{items.map(x => <article className="card p-6" key={x.id}><div className="flex items-start justify-between"><div><p className="eyebrow">Version {x.version}</p><h2 className="mt-2 text-xl font-semibold">{x.name}</h2></div><Pill value={x.source_type} /></div><p className="mt-4 text-sm leading-6 text-ink/60">{x.description}</p><p className="mt-5 text-xs text-ink/40">Created {fmtDay(x.created_at)}</p></article>)}{!items.length && <Empty />}</div>;
}
