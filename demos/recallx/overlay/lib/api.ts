// Demo build of lib/api.ts. Same exports as the original file, but every
// request is answered in the browser by a fake backend built on the repo's
// own sample_data (see demo-engine.ts). No network calls are made.
// Writes (uploads, chats, eval runs) live in sessionStorage for this tab.
import fixtures from "./demo-fixtures.json";
import { chunkText, createEngine, type FixtureChunk, type FixtureDoc, type QAItem } from "./demo-engine";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const TOKEN_KEY = "ekai_token";
const STATE_KEY = "recallx_demo_state_v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

// Seeded users from backend/app/db/bootstrap.py (fictional demo accounts).
const USERS = {
  admin: { id: "4b0f6a0e-1c1e-4d43-9a57-0d1f3e2a9a01", email: "admin@acmefs.com", full_name: "Avery Admin", role: "admin", department: "IT" },
  employee: { id: "8d2c7b5e-2f3a-4e61-8b19-6c4a1e7d5b02", email: "employee@acmefs.com", full_name: "Erin Employee", role: "employee", department: "Finance" },
} as const;

type DemoUser = { id: string; email: string; full_name: string; role: string; department: string };

function userFromToken(token: string | null): DemoUser | null {
  if (!token || !token.startsWith("demo.")) return null;
  const [role, email] = token.slice(5).split("|");
  const base = role === "admin" ? USERS.admin : USERS.employee;
  return { ...base, email: email || base.email };
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  messages: { id: string; role: "user" | "assistant"; content: string; citations: unknown[] | null }[];
}

interface QueryLog {
  id: string;
  query: string;
  mode: string;
  llm_provider: string;
  llm_model: string;
  prompt_tokens: number;
  completion_tokens: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  avg_retrieval_score: number;
  created_at: string;
}

interface EvalRun {
  id: string;
  dataset_size: number;
  metrics: Record<string, unknown>;
  results_path: string;
  created_at: string;
}

interface State {
  uploads: { doc: FixtureDoc; chunks: FixtureChunk[] }[];
  conversations: Conversation[];
  queryLogs: QueryLog[];
  evalRuns: EvalRun[];
}

const QA = (fixtures as { qa: QAItem[] }).qa;

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx".replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

let engine: ReturnType<typeof createEngine> | null = null;
let state: State | null = null;

function avgScore(chunks: { rerank_score: number | null; fused_score: number | null; vector_score: number | null; keyword_score: number | null }[]) {
  const s = chunks.map((c) => c.rerank_score || c.fused_score || c.vector_score || c.keyword_score || 0);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : 0;
}

function seedQueryLogs(e: ReturnType<typeof createEngine>): QueryLog[] {
  // A recorded history: a handful of eval questions asked over the past days.
  const picks = ["q004", "q007", "q012", "q021", "q030", "q013", "q038", "q005", "q044", "q010", "q026", "q050"];
  const modes = ["hybrid", "hybrid", "hybrid", "keyword", "hybrid", "semantic"];
  const base = Date.parse("2026-11-18T16:40:00Z");
  return picks
    .map((id) => QA.find((q) => q.id === id))
    .filter((q): q is QAItem => !!q)
    .map((q, i) => {
      const mode = modes[i % modes.length];
      const a = e.answer(q.question, q.role, mode);
      // Recorded runs used the Gemini provider; latencies reflect that.
      const gen = a.llm_provider === "none" ? 0 : 640 + ((i * 137) % 520);
      const provider = a.llm_provider === "none" ? "none" : "gemini";
      return {
        id: uid(),
        query: q.question,
        mode,
        llm_provider: provider,
        llm_model: provider === "gemini" ? "gemini-1.5-flash" : "none",
        prompt_tokens: provider === "gemini" ? 1450 + ((i * 211) % 900) : 0,
        completion_tokens: provider === "gemini" ? 60 + ((i * 37) % 90) : 0,
        retrieval_latency_ms: a.retrieval_latency_ms + 40,
        generation_latency_ms: gen,
        total_latency_ms: a.retrieval_latency_ms + 40 + gen + 6,
        avg_retrieval_score: avgScore(a.retrieved_chunks),
        created_at: new Date(base - i * 47 * 60 * 1000).toISOString(),
      };
    });
}

function save() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // storage full or disabled: keep the state in memory only
  }
}

function boot() {
  if (engine && state) return { engine, state };
  const e = createEngine((fixtures as { documents: FixtureDoc[] }).documents, (fixtures as { chunks: FixtureChunk[] }).chunks);
  let s: State | null = null;
  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(STATE_KEY);
      if (raw) s = JSON.parse(raw) as State;
    } catch {
      s = null;
    }
  }
  if (!s) {
    s = {
      uploads: [],
      conversations: [],
      queryLogs: seedQueryLogs(e),
      evalRuns: [
        {
          id: "3f7a9c21-5b8e-4d10-a6c2-91e0b7d4f5a3",
          dataset_size: QA.length,
          metrics: e.evaluate(QA, "hybrid"),
          results_path: "evals/results/latest.json",
          created_at: "2026-11-18T10:15:00Z",
        },
      ],
    };
  }
  for (const u of s.uploads) e.addDocument(u.doc, u.chunks);
  engine = e;
  state = s;
  save();
  return { engine: e, state: s };
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function requireUser(): DemoUser {
  const u = userFromToken(getToken());
  if (!u) throw new ApiError(401, "Not authenticated");
  return u;
}

function requireAdmin(): DemoUser {
  const u = requireUser();
  if (u.role !== "admin") throw new ApiError(403, "Admin role required");
  return u;
}

async function handle(method: string, fullPath: string, body: unknown): Promise<unknown> {
  const url = new URL(fullPath, "http://demo.invalid");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const q = url.searchParams;
  const { engine: e, state: s } = boot();

  if (method === "POST" && path === "/auth/login") {
    const { email, password } = (body || {}) as { email?: string; password?: string };
    if (!email || !password) throw new ApiError(401, "Invalid email or password");
    // Demo: any email signs in. Emails starting with "admin" get the admin role.
    const role = email.trim().toLowerCase().startsWith("admin") ? "admin" : "employee";
    const token = `demo.${role}|${email.trim()}`;
    await delay(350);
    return { access_token: token, token_type: "bearer", user: userFromToken(token) };
  }
  if (method === "GET" && path === "/auth/me") return requireUser();

  const user = requireUser();

  if (method === "GET" && path === "/documents") {
    const docs = e.documents.filter((d) => d.allowed_roles.includes(user.role));
    await delay(120);
    return { documents: docs, total: docs.length };
  }
  if (method === "GET" && path.startsWith("/documents/")) {
    const d = e.documents.find((x) => x.id === path.split("/")[2]);
    if (!d || !d.allowed_roles.includes(user.role)) throw new ApiError(404, "Document not found");
    return d;
  }
  if (method === "POST" && path === "/documents") {
    requireAdmin();
    const form = body as FormData;
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file provided");
    const fmt = (file.name.split(".").pop() || "").toLowerCase();
    if (!["pdf", "docx", "txt", "md"].includes(fmt)) throw new ApiError(400, `Unsupported format: ${fmt}`);
    let roles: string[];
    try {
      roles = JSON.parse(String(form.get("allowed_roles") || '["admin","employee"]'));
      if (!Array.isArray(roles)) throw new Error();
    } catch {
      throw new ApiError(400, "allowed_roles must be a JSON array of role names");
    }
    const id = uid();
    let chunks: FixtureChunk[] = [];
    if (fmt === "md" || fmt === "txt") {
      chunks = chunkText(await file.text(), id, id);
    } else {
      // Binary formats are not parsed in the browser demo. The file is
      // registered with a single descriptive chunk so it still shows up.
      chunks = [{ chunk_id: `${id}-0`, document_id: id, content: `${file.name} (${Math.round(file.size / 1024)} KB). Uploaded in this demo session. PDF and DOCX text extraction runs on the real backend only.`, section: null, page_number: null }];
    }
    await delay(900);
    const doc: FixtureDoc = {
      id,
      name: file.name,
      file_format: fmt,
      document_type: String(form.get("document_type") || "policy"),
      department: String(form.get("department") || "HR"),
      category: String(form.get("category") || "hr_policy"),
      allowed_roles: roles,
      status: "indexed",
      chunk_count: chunks.length,
      created_at: new Date().toISOString(),
    };
    e.addDocument(doc, chunks);
    s.uploads.push({ doc, chunks });
    save();
    return doc;
  }

  if (method === "POST" && path === "/search") {
    const { query, mode = "hybrid", top_n } = (body || {}) as { query?: string; mode?: string; top_n?: number };
    await delay(220);
    return e.search(String(query || ""), user.role, mode, top_n || 8);
  }

  if (method === "GET" && path === "/chat/conversations") {
    return s.conversations
      .filter((c) => c.user_id === user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => ({ id: c.id, title: c.title }));
  }
  const msgMatch = path.match(/^\/chat\/conversations\/([^/]+)\/messages$/);
  if (method === "GET" && msgMatch) {
    const c = s.conversations.find((x) => x.id === msgMatch[1]);
    if (!c || c.user_id !== user.id) throw new ApiError(404, "Conversation not found");
    return c.messages;
  }
  if (method === "POST" && path === "/chat") {
    const { message, mode = "hybrid", conversation_id } = (body || {}) as { message?: string; mode?: string; conversation_id?: string | null };
    const text = String(message || "").trim();
    let convo = conversation_id ? s.conversations.find((c) => c.id === conversation_id) : undefined;
    if (conversation_id && (!convo || convo.user_id !== user.id)) throw new ApiError(404, "Conversation not found");
    if (!convo) {
      convo = { id: uid(), user_id: user.id, title: text.slice(0, 60), created_at: new Date().toISOString(), messages: [] };
      s.conversations.push(convo);
    }
    const a = e.answer(text, user.role, mode);
    await delay(650 + Math.min(text.length * 6, 500));
    convo.messages.push({ id: uid(), role: "user", content: text, citations: null });
    convo.messages.push({ id: uid(), role: "assistant", content: a.answer, citations: a.citations });
    s.queryLogs.unshift({
      id: uid(),
      query: text,
      mode,
      llm_provider: a.llm_provider,
      llm_model: a.llm_model,
      prompt_tokens: a.prompt_tokens,
      completion_tokens: a.completion_tokens,
      retrieval_latency_ms: a.retrieval_latency_ms,
      generation_latency_ms: a.generation_latency_ms,
      total_latency_ms: a.total_latency_ms,
      avg_retrieval_score: avgScore(a.retrieved_chunks),
      created_at: new Date().toISOString(),
    });
    save();
    const rest: Partial<typeof a> = { ...a };
    delete rest.context_text;
    return { conversation_id: convo.id, ...rest };
  }

  if (method === "GET" && path === "/analytics") {
    const limit = parseInt(q.get("limit") || "25", 10);
    const logs = s.queryLogs;
    const avg = (xs: number[]) => (xs.length ? xs.reduce((x, y) => x + y, 0) / xs.length : 0);
    await delay(150);
    return {
      summary: {
        documents_indexed: e.documents.length,
        chunks_indexed: e.chunkCount,
        total_queries: logs.length,
        avg_response_time_ms: avg(logs.map((l) => l.total_latency_ms)),
        avg_retrieval_score: avg(logs.map((l) => l.avg_retrieval_score)),
      },
      recent_queries: logs.slice(0, limit),
    };
  }

  if (method === "GET" && path === "/evaluations") {
    return [...s.evalRuns].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  if (method === "POST" && path === "/evaluations/run") {
    requireAdmin();
    const mode = q.get("mode") || "hybrid";
    await delay(1400);
    const run: EvalRun = {
      id: uid(),
      dataset_size: QA.length,
      metrics: e.evaluate(QA, mode),
      results_path: "evals/results/latest.json",
      created_at: new Date().toISOString(),
    };
    s.evalRuns.push(run);
    save();
    return run;
  }

  throw new ApiError(404, "Not found in demo backend");
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  return (await handle(method, path, body)) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, "GET"),
  post: <T>(path: string, body?: unknown) => request<T>(path, "POST", body),
  postForm: <T>(path: string, formData: FormData) => request<T>(path, "POST", formData),
  delete: <T>(path: string) => request<T>(path, "DELETE"),
};
