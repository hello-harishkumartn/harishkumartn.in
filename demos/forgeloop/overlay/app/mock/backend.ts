// Browser-side fake of the FastAPI routes in src/autonomousdev/api.py.
// GET /api/runs, GET /api/runs/{id} and POST /api/runs are served from memory.
// Runs are replayed step by step with the same event types, states and record
// fields that src/autonomousdev/orchestrator.py writes. Nothing leaves the browser.

import { liveScenarios, scenarios, type Attempt, type Scenario } from "./fixtures";

type Json = Record<string, any>;
type Step = { apply: (record: Json) => void; type: string; message: string; data: (record: Json) => Json; ms: number };

const BUDGET = { max_attempts: 6, max_tool_calls: 80, max_tokens: 60000, max_wall_seconds: 1800, max_stagnant_loops: 2, max_repeated_failures: 2 };

function hex(seed: string, length = 64): string {
  let out = "";
  let h1 = 0x811c9dc5;
  let round = 0;
  while (out.length < length) {
    for (let i = 0; i < seed.length; i++) h1 = Math.imul(h1 ^ seed.charCodeAt(i), 16777619) >>> 0;
    h1 = Math.imul(h1 ^ round++, 2246822519) >>> 0;
    out += h1.toString(16).padStart(8, "0");
  }
  return out.slice(0, length);
}

const tokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

function indexOf(s: Scenario) {
  const files = s.files.map((f) => ({ path: f.path, size: f.content.length, sha256: hex(f.content), language: f.language, role: f.role, symbols: f.symbols, imports: f.imports }));
  const languages: Record<string, number> = {};
  s.files.forEach((f) => (languages[f.language] = (languages[f.language] ?? 0) + 1));
  return {
    root: s.repository,
    files,
    languages,
    manifests: s.files.filter((f) => f.path === "pyproject.toml").map((f) => f.path),
    dependencies: { "pyproject.toml": s.files.find((f) => f.path === "pyproject.toml")?.content.includes("fastapi") ? ["fastapi", "passlib"] : ["pytest"] },
    tests: s.files.filter((f) => f.role === "test").map((f) => f.path),
    configuration: s.files.filter((f) => f.role === "config").map((f) => f.path),
    recent_history: s.recent_history,
    truncated: false,
    file_count: files.length,
  };
}

function contextOf(s: Scenario, changed: string[] = [], previousErrors: string[] = []) {
  const terms = new Set((s.task.toLowerCase().match(/[a-z][a-z0-9]{1,}/g) ?? []).filter((t) => !["the", "and", "for", "with", "from", "that", "this", "into", "add"].includes(t)));
  const ranked = s.files
    .map((f) => {
      const words = new Set((`${f.path} ${f.symbols.join(" ")} ${f.content}`.toLowerCase().match(/[a-z][a-z0-9]{1,}/g) ?? []));
      const overlap = [...terms].filter((t) => words.has(t)).sort();
      let score = overlap.length * 5;
      const reason = overlap.slice(0, 8).map((t) => `term:${t}`);
      if (changed.includes(f.path)) { score += 20; reason.push("changed-file"); }
      if (f.role === "test") { score += 6; reason.push("test-role"); }
      if (f.role === "config") { score += 5; reason.push("config-role"); }
      score += 1 / (1 + Math.log2(Math.max(f.content.length, 1)));
      return { f, score: Math.round(score * 1000) / 1000, reason: reason.length ? reason : ["repository-overview"] };
    })
    .sort((a, b) => b.score - a.score);
  const items = ranked.filter((r) => r.f.content).slice(0, 4).map(({ f, score, reason }) => ({
    path: f.path, score, reason, content: f.content, content_sha256: hex(f.content), start_line: 1, end_line: f.content.split("\n").length, estimated_tokens: tokens(f.content),
  }));
  const est = items.reduce((n, i) => n + i.estimated_tokens, 0) + tokens(s.task) + previousErrors.reduce((n, e) => n + tokens(e), 0);
  return { task: s.task, token_budget: 12000, estimated_tokens: est, items, omitted_candidates: Math.max(0, s.files.length - items.length) };
}

function evidence(kind: string, passed: boolean, summary: string, extra: Json = {}) {
  return { kind, passed, summary, command: [], exit_code: null, duration_ms: 0, output: "", metadata: {}, ...extra };
}

function sandboxEvidence(test: NonNullable<Attempt["test"]>, verification = false) {
  return evidence("test", test.passed, `test exited with ${test.passed ? 0 : 1}`, {
    command: ["python", "-m", "pytest", "-q"],
    exit_code: test.passed ? 0 : 1,
    duration_ms: test.duration_ms + (verification ? 137 : 0),
    output: test.output,
    metadata: { sandbox: "docker", image: "autonomousdev-python-sandbox:0.1", network: "none", filesystem: "read-only-input-copy-on-tmpfs", output_truncated: false, ...(verification ? { verification_run: true } : {}) },
  });
}

function buildSteps(s: Scenario, runId: string): Step[] {
  const steps: Step[] = [];
  const push = (type: string, message: string, data: (r: Json) => Json, apply: (r: Json) => void = () => {}, ms = 1200) => steps.push({ type, message, data, apply, ms });
  const transition = (to: string, message: string, extra: (r: Json) => void = () => {}) => {
    let from = "";
    push("state.transition", message, () => ({ from, to, what_changed: message, what_next: to }), (r) => { from = r.state; r.state = to; extra(r); });
  };
  const model = (stage: string, input: number, output: number) =>
    push("model.completed", `Model completed ${stage}`, () => ({ stage, input_tokens: input, output_tokens: output }), (r) => { r.usage.input_tokens += input; r.usage.output_tokens += output; }, 1800);
  const index = indexOf(s);

  push("run.created", "Run accepted", () => ({ task: s.task }), () => {}, 600);
  push("repository.indexed", "Repository index built", () => index);
  transition("PLAN", "Repository discovery complete");
  const planContext = contextOf(s);
  push("context.selected", "Exact planning context recorded", () => planContext);
  model("plan", 1400 + planContext.estimated_tokens, 260 + s.plan.steps.length * 40);
  push("plan.created", s.plan.summary, () => s.plan, (r) => { r.plan = s.plan; });

  let failure = "";
  let changed: string[] = [];
  s.attempts.forEach((attempt, i) => {
    const target = i === 0 ? "IMPLEMENT" : "REPAIR";
    const stage = i === 0 ? "implement" : "repair";
    transition(target, `Starting attempt ${i + 1}`, (r) => { r.usage.attempts += 1; });
    const ctx = contextOf(s, changed, failure ? [failure] : []);
    push("context.refreshed", `Exact ${stage} context recorded`, () => ctx);
    model(stage, 1900 + ctx.estimated_tokens, 220 + attempt.tools.length * 90);
    attempt.tools.forEach((tool) =>
      push("tool.completed", `${tool.name}: ${tool.rationale}`, () => ({ tool: tool.name, arguments: safeArgs(tool.arguments), result: tool.result }), (r) => { r.usage.tool_calls += 1; }, 900),
    );
    if (attempt.policyError) {
      const reason = attempt.policyError;
      push("run.escalated", reason, () => ({ reason }), (r) => { r.state = "ESCALATE"; r.outcome = "ESCALATED"; r.escalation_reason = reason; });
      return;
    }
    changed = attempt.changed_files;
    const patchHash = hex(`${runId}-patch-${i}`);
    push("implementation.changed", "Implementation tools completed", () => ({ changed_files: attempt.changed_files, patch_sha256: patchHash }), (r) => { r.changed_files = attempt.changed_files; r.patch_fingerprints.push(patchHash); });
    transition("TEST", "Running sandbox checks");
    const test = attempt.test!;
    const ev = sandboxEvidence(test);
    push("sandbox.result", ev.summary, () => ev, (r) => { r.evidence.push(ev); }, 2200);
    if (!test.passed) {
      const summary = `test: ${ev.summary}\n${test.output.slice(-4000)}`;
      const fingerprint = hex(summary);
      failure = summary;
      transition("ANALYZE_FAILURE", "Analyzing failed evidence");
      push("failure.analyzed", "Failure evidence normalized", () => ({ fingerprint, repeated: 1, summary }), (r) => { r.failure_fingerprints.push(fingerprint); r.usage.loops += 1; });
      return;
    }
    const findings = (attempt.findings ?? []).map((f) => ({ path: null, line: null, ...f }));
    transition("REVIEW", "Tests passed; reviewing diff");
    model("review", 2100 + tokens(JSON.stringify(attempt.tools)), 120 + findings.length * 80);
    push("review.completed", `Reviewer produced ${findings.length} findings`, () => ({ findings }), (r) => { r.findings = findings; });
    transition("VERIFY", "Running independent acceptance checks");
    const verification = [
      evidence("authorized_changes", true, "all changed paths are authorized", { metadata: { changed_files: attempt.changed_files, unauthorized: [] } }),
      evidence("required_files", true, "all required files exist", { metadata: { required: [], missing: [] } }),
      evidence("review", true, "no blocking reviewer findings"),
      sandboxEvidence(test, true),
    ];
    push("verification.completed", "All acceptance checks passed", () => ({ evidence: verification }), (r) => { r.evidence.push(...verification); }, 2000);
    transition("COMPLETE", "Machine-verifiable exit conditions satisfied", (r) => {
      r.outcome = "VERIFIED_COMPLETE";
      r.final_patch = attempt.tools.filter((t) => t.name === "get_git_diff").map((t) => String(t.result)).join("") || `diff --git a/${attempt.changed_files[0]} b/${attempt.changed_files[0]}\n`;
      r.pr_description = prDescription(r);
    });
    push("run.completed", "Run reached VERIFIED_COMPLETE", () => ({ changed_files: attempt.changed_files }));
  });
  return steps;
}

function safeArgs(args: Json): Json {
  const safe = { ...args };
  for (const field of ["content", "replace"]) {
    if (typeof safe[field] === "string") safe[field] = { bytes: new TextEncoder().encode(safe[field]).length, sha256: hex(safe[field]) };
  }
  return safe;
}

function prDescription(r: Json): string {
  return [
    `## ${r.plan?.summary ?? r.task}`, "", "### Task", r.task, "", "### Changed files",
    ...r.changed_files.map((p: string) => `- \`${p}\``), "", "### Verification evidence",
    ...r.evidence.slice(-10).map((e: Json) => `- ${e.passed ? "PASS" : "FAIL"}: ${e.kind} - ${e.summary}`), "", `Harness run: \`${r.id}\` (VERIFIED_COMPLETE)`,
  ].join("\n");
}

type Run = { id: string; scenario: Scenario; steps: Step[]; times: number[]; createdAt: number };
const runs: Run[] = [];

function addRun(scenario: Scenario, id: string, createdAt: number) {
  const steps = buildSteps(scenario, id);
  let t = createdAt;
  const times = steps.map((s) => (t += s.ms));
  runs.push({ id, scenario, steps, times, createdAt });
}

function snapshot(run: Run, now: number) {
  const iso = (ms: number) => new Date(ms).toISOString().replace("Z", "+00:00");
  const record: Json = {
    id: run.id, task: run.scenario.task, repository: run.scenario.repository, state: "DISCOVER", outcome: "RUNNING",
    created_at: iso(run.createdAt), updated_at: iso(run.createdAt), deadline_at: iso(run.createdAt + BUDGET.max_wall_seconds * 1000),
    budget: BUDGET, usage: { attempts: 0, loops: 0, tool_calls: 0, input_tokens: 0, output_tokens: 0 }, plan: null,
    evidence: [], findings: [], changed_files: [], failure_fingerprints: [], patch_fingerprints: [], escalation_reason: null, final_patch: "", pr_description: "",
  };
  const events: Json[] = [];
  run.steps.forEach((step, i) => {
    if (run.times[i] > now) return;
    step.apply(record);
    record.updated_at = iso(run.times[i]);
    events.push({ sequence: i + 1, timestamp: iso(run.times[i]), state: record.state, type: step.type, message: step.message, data: step.data(record) });
  });
  return { record: JSON.parse(JSON.stringify(record)), events: JSON.parse(JSON.stringify(events)) };
}

// Recorded runs keep fixed timestamps from the day the benchmark manifest was last evaluated.
const recordedStart = Date.parse("2026-09-27T14:05:12Z");
scenarios.forEach((s, i) => addRun(s, s.id, recordedStart + i * 23 * 60 * 1000));

let liveIndex = 0;
function startLiveRun(): Json {
  const scenario = liveScenarios[liveIndex % liveScenarios.length];
  liveIndex += 1;
  const id = hex(`live-${Date.now()}-${liveIndex}-${Math.random()}`, 12);
  addRun(scenario, id, Date.now());
  return snapshot(runs[runs.length - 1], Date.now()).record;
}

let started = false;
function ensureLiveRun() {
  if (started || typeof window === "undefined") return;
  started = true;
  startLiveRun();
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function mockFetch(path: string, init?: RequestInit): Promise<Response> {
  ensureLiveRun();
  await new Promise((resolve) => setTimeout(resolve, 60 + Math.random() * 120));
  const now = Date.now();
  const method = (init?.method ?? "GET").toUpperCase();
  const url = new URL(path, "http://mock.invalid");
  if (url.pathname === "/health") return json({ status: "ok" });
  if (url.pathname === "/api/runs" && method === "GET") {
    const list = runs.map((r) => snapshot(r, now).record);
    list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    return json(list);
  }
  if (url.pathname === "/api/runs" && method === "POST") return json(startLiveRun());
  const match = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
  if (match && method === "GET") {
    const run = runs.find((r) => r.id === match[1]);
    if (!run) return json({ detail: "run not found" }, 404);
    const { record, events } = snapshot(run, now);
    return json({ ...record, events });
  }
  return json({ detail: "Not Found" }, 404);
}
