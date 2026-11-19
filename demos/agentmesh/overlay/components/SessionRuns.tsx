"use client";
import { decisionFor, sessionApprovals, sessionRuns, useDemoClock } from "@/lib/demoStore";
import { Status } from "./Status";
import { RunLink } from "./RunLink";

// Table rows for runs started in this browser session. Rendered after mount only.
export function SessionRuns({variant}: {variant: "dashboard" | "runs"}) {
  const now = useDemoClock();
  if (now === null) return null;
  return <>{sessionRuns(now).map(r => <tr key={r.id}>
    <td><RunLink id={r.id} session className="runLink">{r.goal}</RunLink><small>{variant === "runs" ? r.id : r.id.slice(0,8)} <span className="sessionTag">this session</span></small></td>
    <td><Status value={r.status}/></td>
    <td>{variant === "runs" ? r.tokens_used : r.tokens_used.toLocaleString()}</td>
    <td>${r.estimated_cost_usd.toFixed(4)}</td>
    <td>{variant === "runs" ? new Date(r.created_at).toLocaleString() : new Date(r.created_at).toLocaleTimeString()}</td>
  </tr>)}</>;
}

/** KPI number that includes runs and approvals from this session. */
export function SessionCount({kind, base, pendingIds = []}: {kind: "runs" | "pending"; base: number; pendingIds?: string[]}) {
  const now = useDemoClock();
  if (now === null) return <>{base}</>;
  return <SessionCountInner kind={kind} base={base} pendingIds={pendingIds} now={now}/>;
}


function SessionCountInner({kind, base, pendingIds, now}: {kind: "runs" | "pending"; base: number; pendingIds: string[]; now: number}) {
  if (kind === "runs") return <>{base + sessionRuns(now).length}</>;
  const recordedPending = pendingIds.filter(id => !decisionFor(id)).length;
  return <>{recordedPending + sessionApprovals(now).filter(a => a.status === "pending").length}</>;
}
