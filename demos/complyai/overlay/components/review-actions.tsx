"use client";
// Demo build: decisions are applied to the in-memory session instead of
// POST /api/reviews/{id}/decision. The page updates in place, no reload.
import { useState } from "react";
import { decideReview } from "@/lib/demo-store";

const LABELS: Record<string, string> = { APPROVE: "Approve", MODIFY: "Modify", REJECT: "Reject", REQUEST_MORE_EVIDENCE: "Request more evidence" };

export function ReviewActions({ id }: { id: string }) {
  const [mode, setMode] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [revised, setRevised] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (mode === "MODIFY" && revised.trim().length < 3) { setError("Enter the revised rationale."); return; }
    const err = decideReview(id, mode!, reason, "Portfolio Reviewer", mode === "MODIFY" ? { rationale: revised.trim() } : undefined);
    if (err) setError(err);
  };
  if (mode) return <div className="w-full max-w-sm space-y-2 rounded-xl border border-ink/10 bg-cream p-3 lg:w-80">
    <p className="text-xs font-bold">{LABELS[mode]}</p>
    <label className="block text-[11px] font-semibold text-ink/60">Reason (recorded with your decision)
      <textarea value={reason} onChange={e => { setReason(e.target.value); setError(""); }} rows={2} className="mt-1 w-full rounded-lg border border-ink/15 bg-white p-2 text-xs font-normal text-ink" placeholder="e.g. Evidence matches the vendor register" /></label>
    {mode === "MODIFY" && <label className="block text-[11px] font-semibold text-ink/60">Revised rationale
      <textarea value={revised} onChange={e => { setRevised(e.target.value); setError(""); }} rows={2} className="mt-1 w-full rounded-lg border border-ink/15 bg-white p-2 text-xs font-normal text-ink" /></label>}
    {error && <p className="text-[11px] text-rose-700">{error}</p>}
    <div className="flex gap-2"><button onClick={submit} disabled={reason.trim().length < 3} className="rounded-lg bg-moss px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Record decision</button><button onClick={() => { setMode(null); setError(""); }} className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-bold">Cancel</button></div>
  </div>;
  return <div className="flex flex-wrap gap-2"><button onClick={() => setMode("APPROVE")} className="rounded-lg bg-moss px-3 py-2 text-xs font-bold text-white">Approve</button><button onClick={() => setMode("MODIFY")} className="rounded-lg border border-moss/20 px-3 py-2 text-xs font-bold text-moss">Modify</button><button onClick={() => setMode("REJECT")} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">Reject</button><button onClick={() => setMode("REQUEST_MORE_EVIDENCE")} className="rounded-lg border border-ink/15 px-3 py-2 text-xs font-bold">More evidence</button></div>;
}
