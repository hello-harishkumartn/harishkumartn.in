"use client";
import { useEffect, useState } from "react";
import type { Run } from "@/lib/api";
import { Status } from "./Status";
import { TraceTimeline } from "./TraceTimeline";
import { ApprovalActions } from "./ApprovalActions";
import { applyDecision, approvalIdFor, decisionFor, sessionRun, useDemoClock } from "@/lib/demoStore";

function RunBody({run, approvalId}: {run: Run; approvalId?: string}) {
  return <><header className="pageHead"><div><p className="eyebrow">TRACE / {run.id.slice(0,8)}</p><h1>Run inspection</h1><p>{run.goal}</p></div><Status value={run.status}/></header>
    <section className="kpis compact"><article><span>Tokens</span><strong>{run.tokens_used}</strong></article><article><span>Estimated cost</span><strong>${run.estimated_cost_usd.toFixed(4)}</strong></article><article><span>Steps</span><strong>{run.steps?.length||0}</strong></article><article><span>Artifacts</span><strong>{run.artifacts?.length||0}</strong></article></section>
    {run.status==="waiting_approval"&&approvalId&&<section className="panel livePanel"><div className="panelTitle"><div><p className="eyebrow">HUMAN GATE</p><h2>Approval required</h2></div></div><p>Verification passed. The action plan is held until a person approves or rejects it.</p><ApprovalActions id={approvalId} status="pending"/></section>}
    {(run.status==="running"||run.status==="queued")&&<section className="panel livePanel"><div className="panelTitle"><div><p className="eyebrow">LIVE REPLAY</p><h2>Executing DAG</h2></div></div><p>Replaying a recorded trace of the saas-churn-response workflow. Research and analysis fan out in parallel. Then the executor, reviewer and verifier run before the approval gate.</p></section>}
    <section className="panel"><TraceTimeline steps={run.steps||[]}/></section>
    <section className="panel artifacts"><div className="panelTitle"><h2>Artifacts and evidence</h2></div>{run.artifacts?.map((a,i)=><details key={i}><summary>{a.name}</summary><pre>{JSON.stringify(a.content,null,2)}</pre></details>)}</section></>;
}

/** Recorded run with a prebuilt page. Session decisions are applied after hydration. */
export function RecordedRun({run, approvalId}: {run: Run; approvalId?: string}) {
  const now = useDemoClock();
  const current = now !== null && approvalId ? applyDecision(run, decisionFor(approvalId)) : run;
  return <RunBody run={current} approvalId={approvalId}/>;
}

/** Run started in this browser session. Its id comes from the query string. */
export function LiveRun() {
  const now = useDemoClock();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => { setId(new URLSearchParams(window.location.search).get("id")); }, []);
  if (now === null || id === null) return <section className="panel empty">Loading run…</section>;
  const run = sessionRun(id, now);
  if (!run) return <section className="panel empty">This run only existed in an earlier browser session. Start a new one with Run demo.</section>;
  return <RunBody run={run} approvalId={approvalIdFor(run.id)}/>;
}
