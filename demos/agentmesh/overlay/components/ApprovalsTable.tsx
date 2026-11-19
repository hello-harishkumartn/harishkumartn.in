"use client";
import type { Approval } from "@/lib/api";
import { sessionApprovals, useDemoClock, withDecisions } from "@/lib/demoStore";
import { ApprovalActions } from "./ApprovalActions";
import { RunLink } from "./RunLink";
import { Status } from "./Status";

export function ApprovalsTable({rows}: {rows: Approval[]}) {
  const now = useDemoClock();
  const session = now === null ? [] : sessionApprovals(now);
  const sessionIds = new Set(session.map(a => a.run_id));
  const all = [...session, ...(now === null ? rows : withDecisions(rows))].sort((a, b) => b.requested_at.localeCompare(a.requested_at));
  return <section className="panel tablePanel"><table><thead><tr><th>Run</th><th>Reason</th><th>Status</th><th>Owner</th><th>Decision</th></tr></thead><tbody>
    {all.map(a=><tr key={a.id}><td><RunLink id={a.run_id} session={sessionIds.has(a.run_id)} className="runLink">{a.run_id.slice(0,8)}</RunLink></td><td>{a.reason}</td><td><Status value={a.status}/></td><td>{a.decided_by||"Unassigned"}</td><td><ApprovalActions id={a.id} status={a.status}/></td></tr>)}
    {!all.length&&<tr><td className="empty" colSpan={5}>No approval requests.</td></tr>}
  </tbody></table></section>;
}
