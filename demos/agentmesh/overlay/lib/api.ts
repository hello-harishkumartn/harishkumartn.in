// Demo seam. The original file fetched the FastAPI backend. This version serves
// responses recorded from the repo's own deterministic provider and seed data, so
// every page can be rendered at build time with no network access.
import recorded from "@/fixtures/recorded.json";

type Fixtures = Record<string, unknown> & { run_detail: Record<string, unknown> };
const data = recorded as unknown as Fixtures;

export function fixture<T>(path: string, fallback: T): T {
  const clean = path.replace(/^\/+|\/+$/g, "").split("?")[0];
  const runMatch = clean.match(/^runs\/([^/]+)$/);
  if (runMatch) return (data.run_detail[runMatch[1]] as T) ?? fallback;
  return (data[clean] as T) ?? fallback;
}

export async function api<T>(path: string, fallback: T): Promise<T> {
  return fixture(path, fallback);
}

export function fixtureRunIds(): string[] {
  return Object.keys(data.run_detail);
}

export type Run = {
  id: string; goal: string; status: string; tokens_used: number; estimated_cost_usd: number;
  created_at: string; started_at?: string; finished_at?: string; state?: Record<string, unknown>; steps?: Step[]; artifacts?: {name: string; content: unknown}[];
};
export type Step = { id: string; node_id: string; status: string; attempt: number; model_info: Record<string, string>; context_manifest: {token_estimate?: number; items?: unknown[]}; tool_calls: unknown[]; tokens: number; estimated_cost_usd: number; started_at?: string; finished_at?: string; output: Record<string, unknown>; evaluation: Record<string, unknown>; error?: string };
export type Approval = {id: string; run_id: string; node_id?: string; reason: string; status: string; decided_by?: string | null; comment?: string | null; requested_at: string; decided_at?: string | null};
