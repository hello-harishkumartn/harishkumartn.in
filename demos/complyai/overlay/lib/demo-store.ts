"use client";
// In-memory session state for the demo. Mirrors the backend rules in
// backend/app/main.py (decide_review, create_document, create_framework) and
// backend/app/workflow.py (resume from AWAITING_FINDING_REVIEW). Kept in
// sessionStorage so a hard refresh keeps the session.
import { useSyncExternalStore } from "react";
import fixtures from "./fixtures.json";

export type Review = { id: string; audit_id: string; target_type: string; target_id: string; ai_recommendation: string; status: string; decision: string | null; reason: string | null; reviewer: string | null; decided_at: string | null; created_at: string };
export type AuditEvent = { id: string; event_type: string; actor: string; summary: string; created_at: string };
export type EvidenceItem = { id: string; name: string; kind: string; trust_level: string; metadata_json: { synthetic?: boolean; uploaded?: boolean }; created_at: string };
export type FrameworkItem = { id: string; name: string; version: string; source_type: string; description: string; created_at: string };
type Decision = { status: string; decision: string; reason: string; reviewer: string; decided_at: string; modified_value?: Record<string, string> };
type AuditOverride = { status: string; progress: number; updated_at: string };
export type DemoState = {
  decisions: Record<string, Decision>;
  events: Record<string, AuditEvent[]>;
  audits: Record<string, AuditOverride>;
  evidence: EvidenceItem[];
  frameworks: FrameworkItem[];
};

const reviews = fixtures.reviews as unknown as Review[];
const audits = fixtures.audits as unknown as Array<{ id: string; name: string; status: string; progress: number }>;
const KEY = "complyai-demo-session-v1";
const INITIAL: DemoState = { decisions: {}, events: {}, audits: {}, evidence: [], frameworks: [] };

let state: DemoState = INITIAL;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (raw) state = { ...INITIAL, ...JSON.parse(raw) };
  } catch { /* storage unavailable: memory only */ }
}

function commit(next: DemoState) {
  state = next;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch { /* memory only */ }
  listeners.forEach(l => l());
}

function subscribe(listener: () => void) {
  load();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDemo(): DemoState {
  return useSyncExternalStore(subscribe, () => { load(); return state; }, () => INITIAL);
}

let counter = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export function effectiveReview(review: Review, s: DemoState): Review {
  const d = s.decisions[review.id];
  return d ? { ...review, status: d.status, decision: d.decision, reason: d.reason, reviewer: d.reviewer, decided_at: d.decided_at } : review;
}

export function findingOverride(findingId: string, s: DemoState) {
  const review = reviews.find(r => r.target_type === "finding" && r.target_id === findingId);
  const d = review ? s.decisions[review.id] : undefined;
  return { review: review ? effectiveReview(review, s) : null, human_status: d?.decision, rationale: d?.modified_value?.rationale };
}

export function auditStatus(id: string, s: DemoState, fallback: { status: string; progress: number }) {
  return s.audits[id] ?? fallback;
}

export function pendingCount(s: DemoState, auditId?: string, targetType?: string) {
  return reviews.filter(r => (!auditId || r.audit_id === auditId) && (!targetType || r.target_type === targetType))
    .map(r => effectiveReview(r, s)).filter(r => r.status === "PENDING").length;
}

export function openFindingReviews(s: DemoState, auditId: string) {
  return reviews.filter(r => r.audit_id === auditId && r.target_type === "finding")
    .map(r => effectiveReview(r, s)).filter(r => r.status !== "DECIDED").length;
}

function addEvents(s: DemoState, auditId: string, items: Omit<AuditEvent, "id" | "created_at">[]) {
  const at = new Date().toISOString();
  return { ...s.events, [auditId]: [...(s.events[auditId] ?? []), ...items.map(e => ({ ...e, id: newId("evt"), created_at: at }))] };
}

export function decideReview(id: string, decision: string, reason: string, reviewer: string, modified?: Record<string, string>): string | null {
  const review = reviews.find(r => r.id === id);
  if (!review) return "Review not found";
  if (effectiveReview(review, state).status === "DECIDED") return "Review is already decided";
  if (reason.trim().length < 3) return "Reason must be at least 3 characters";
  if (decision === "MODIFY" && !modified) return "A revised value is required when modifying";
  const status = decision === "REQUEST_MORE_EVIDENCE" ? "EVIDENCE_REQUESTED" : "DECIDED";
  const next: DemoState = {
    ...state,
    decisions: { ...state.decisions, [id]: { status, decision, reason: reason.trim(), reviewer, decided_at: new Date().toISOString(), modified_value: modified } },
  };
  next.events = addEvents(state, review.audit_id, [{ event_type: "HUMAN_DECISION", actor: reviewer, summary: `${decision} on ${review.target_type}` }]);
  commit(next);
  return null;
}

export function resumeAudit(auditId: string): string | null {
  const audit = audits.find(a => a.id === auditId);
  if (!audit) return "Audit not found";
  const current = auditStatus(auditId, state, audit);
  if (current.status !== "AWAITING_FINDING_REVIEW") return `Audit cannot resume from ${current.status}`;
  const open = openFindingReviews(state, auditId);
  if (open) return `${open} finding reviews are still pending`;
  const next: DemoState = { ...state, audits: { ...state.audits, [auditId]: { status: "REPORT_READY", progress: 100, updated_at: new Date().toISOString() } } };
  next.events = addEvents(state, auditId, [
    { event_type: "REPORT_GENERATED", actor: "report_generation", summary: `${audit.name} — Audit Report` },
    { event_type: "STATE_TRANSITION", actor: "human-gate", summary: "AWAITING_FINDING_REVIEW → REPORT_READY" },
  ]);
  commit(next);
  return null;
}

export function uploadEvidence(name: string, content: string): string | null {
  if (content.length < 3) return "File is too short";
  commit({ ...state, evidence: [...state.evidence, { id: newId("doc"), name, kind: "evidence", trust_level: "untrusted", metadata_json: { uploaded: true }, created_at: new Date().toISOString() }] });
  return null;
}

export function uploadFramework(name: string, content: string): string | null {
  if (content.length < 20) return "File is too short";
  commit({ ...state, frameworks: [...state.frameworks, { id: newId("fw"), name, version: "uploaded", source_type: "user_supplied", description: "Uploaded framework", created_at: new Date().toISOString() }] });
  return null;
}

export function resetDemo() { commit(INITIAL); }

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const two = (n: number) => String(n).padStart(2, "0");
export function fmtDay(iso: string) { const d = new Date(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; }
export function fmtTime(iso: string) { const d = new Date(iso); return `${fmtDay(iso)} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`; }
