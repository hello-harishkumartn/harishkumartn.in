"use client";
import { useState } from "react";
import { decide, decisionFor, useDemoClock } from "@/lib/demoStore";

// Approve or reject in memory. The decision resumes the run in this session.
export function ApprovalActions({id, status}: {id:string; status:string}) {
  const now = useDemoClock();
  const [submitting, setSubmitting] = useState(false);
  const decided = now !== null ? decisionFor(id)?.decision : undefined;
  const value = submitting ? "submitting" : decided ?? status;
  function choose(decision:"approved"|"rejected"){
    setSubmitting(true);
    window.setTimeout(() => { decide(id, decision); setSubmitting(false); }, 500);
  }
  if(value!=="pending")return <span className="actionState">{value}</span>;
  return <div className="approvalActions"><button onClick={()=>choose("approved")}>Approve</button><button onClick={()=>choose("rejected")}>Reject</button></div>;
}
