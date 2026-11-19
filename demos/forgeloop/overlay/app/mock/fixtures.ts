// Recorded sample scenarios for the static demo.
// Task text, fixture sources and public tests come from the source repo's
// benchmark/tasks.json and benchmark/cases.py. The login rate limit task is the
// example from README.md. Shapes follow src/autonomousdev/types.py and the
// events emitted by src/autonomousdev/orchestrator.py.

export type ToolCall = { name: string; arguments: Record<string, unknown>; rationale: string; result: unknown };
export type Attempt = {
  summary: string;
  tools: ToolCall[];
  changed_files: string[];
  test?: { passed: boolean; output: string; duration_ms: number };
  findings?: { severity: string; category: string; message: string; path?: string | null; line?: number | null }[];
  policyError?: string;
};
export type RepoFile = { path: string; role: string; language: string; symbols: string[]; imports: string[]; content: string };
export type Scenario = {
  id: string;
  task: string;
  repository: string;
  recent_history: string[];
  files: RepoFile[];
  plan: { summary: string; steps: string[]; acceptance_checks: string[]; likely_files: string[] };
  attempts: Attempt[];
};

const pyproject = "[tool.pytest.ini_options]\ntestpaths=['tests']\naddopts='-q'\n";

function benchmarkRepo(source: string, publicTest: string, symbols: string[]): RepoFile[] {
  return [
    { path: "pyproject.toml", role: "config", language: "toml", symbols: [], imports: [], content: pyproject },
    { path: "solution.py", role: "source", language: "python", symbols, imports: [], content: source },
    { path: "tests/test_public.py", role: "test", language: "python", symbols: publicTest.match(/def (\w+)/g)?.map((s) => s.slice(4)) ?? [], imports: ["solution"], content: publicTest },
  ];
}

function pytestPass(count: number, seconds: string) {
  return `${".".repeat(count)}${" ".repeat(Math.max(1, 60 - count))}[100%]\n${count} passed in ${seconds}s\n`;
}

const readSolution = (content: string): ToolCall => ({
  name: "read_file",
  arguments: { path: "solution.py" },
  rationale: "Read the implementation named in the task before editing",
  result: content,
});

export const scenarios: Scenario[] = [
  {
    id: "6b7e0f83fd21",
    task: "Add rate limiting to the login API",
    repository: "/workspace/repos/demo-auth-service",
    recent_history: ["a41c9e2 Add login endpoint with password hashing", "7d03b11 Add pytest fixtures for auth client", "1f5e8aa Initial service skeleton"],
    files: [
      { path: "pyproject.toml", role: "config", language: "toml", symbols: [], imports: [], content: "[project]\nname = \"demo-auth-service\"\ndependencies = [\"fastapi\", \"passlib\"]\n\n[tool.pytest.ini_options]\ntestpaths = [\"tests\"]\n" },
      { path: "src/auth/__init__.py", role: "source", language: "python", symbols: [], imports: [], content: "" },
      { path: "src/auth/login.py", role: "source", language: "python", symbols: ["LoginRequest", "login", "verify_password"], imports: ["fastapi", "passlib.hash", "pydantic"], content: "from fastapi import APIRouter, HTTPException\nfrom passlib.hash import bcrypt\nfrom pydantic import BaseModel\n\nrouter = APIRouter()\n\nclass LoginRequest(BaseModel):\n    username: str\n    password: str\n\n@router.post(\"/login\")\ndef login(request: LoginRequest):\n    user = USERS.get(request.username)\n    if user is None or not verify_password(request.password, user.password_hash):\n        raise HTTPException(401, \"invalid credentials\")\n    return {\"token\": issue_token(user)}\n" },
      { path: "src/auth/tokens.py", role: "source", language: "python", symbols: ["issue_token"], imports: ["secrets"], content: "import secrets\n\ndef issue_token(user):\n    return secrets.token_urlsafe(32)\n" },
      { path: "tests/conftest.py", role: "test", language: "python", symbols: ["client"], imports: ["fastapi.testclient"], content: "import pytest\nfrom fastapi.testclient import TestClient\n" },
      { path: "tests/test_login.py", role: "test", language: "python", symbols: ["test_login_success", "test_login_rejects_bad_password"], imports: ["pytest"], content: "def test_login_success(client):\n    assert client.post('/login', json={'username': 'demo', 'password': 'demo-pass'}).status_code == 200\n\ndef test_login_rejects_bad_password(client):\n    assert client.post('/login', json={'username': 'demo', 'password': 'nope'}).status_code == 401\n" },
      { path: "README.md", role: "docs", language: "markdown", symbols: [], imports: [], content: "# demo-auth-service\n\nSmall FastAPI login service used as a disposable harness target.\n" },
    ],
    plan: {
      summary: "Add a per-username sliding window limiter to POST /login and cover it with tests",
      steps: [
        "Add an in-process sliding window limiter keyed by username in src/auth/login.py",
        "Return HTTP 429 with a Retry-After header once five failed attempts occur within 60 seconds",
        "Reset the window after a successful login",
        "Add tests for the limit, the reset and the Retry-After header in tests/test_login.py",
      ],
      acceptance_checks: ["pytest passes", "sixth failed attempt within 60s returns 429", "successful login resets the counter"],
      likely_files: ["src/auth/login.py", "tests/test_login.py"],
    },
    attempts: [
      {
        summary: "Add limiter and tests",
        changed_files: ["src/auth/login.py", "tests/test_login.py"],
        tools: [
          { name: "read_file", arguments: { path: "src/auth/login.py" }, rationale: "Inspect the login handler before adding a limiter", result: "from fastapi import APIRouter, HTTPException\n..." },
          { name: "search_code", arguments: { query: "status_code == 401", glob: "tests/**" }, rationale: "Find existing login assertions to follow their style", result: [{ path: "tests/test_login.py", line: 5, text: "    assert client.post('/login', json={'username': 'demo', 'password': 'nope'}).status_code == 401" }] },
          { name: "apply_patch", arguments: { path: "src/auth/login.py", search: "@router.post(\"/login\")", replace: "_FAILURES: dict[str, deque[float]] = defaultdict(deque)\n..." }, rationale: "Add sliding window limiter ahead of credential checks", result: { path: "src/auth/login.py", bytes: 1488, replaced_characters: 21 } },
          { name: "write_file", arguments: { path: "tests/test_login.py", content: "def test_login_success(client):\n..." }, rationale: "Cover limit, reset and Retry-After behavior", result: { path: "tests/test_login.py", bytes: 1312 } },
        ],
        test: {
          passed: false,
          duration_ms: 2841,
          output: "..F.                                                                     [100%]\n=================================== FAILURES ===================================\n__________________________ test_rate_limit_resets_after_success __________________________\n\n    def test_rate_limit_resets_after_success(client):\n        for _ in range(4):\n            client.post('/login', json={'username': 'demo', 'password': 'nope'})\n        client.post('/login', json={'username': 'demo', 'password': 'demo-pass'})\n>       assert client.post('/login', json={'username': 'demo', 'password': 'nope'}).status_code == 401\nE       assert 429 == 401\n\ntests/test_login.py:24: AssertionError\n=========================== short test summary info ============================\nFAILED tests/test_login.py::test_rate_limit_resets_after_success - assert 429 == 401\n1 failed, 3 passed in 0.62s\n",
        },
      },
      {
        summary: "Clear failure window on successful login",
        changed_files: ["src/auth/login.py", "tests/test_login.py"],
        tools: [
          { name: "get_test_failure", arguments: {}, rationale: "Read the normalized failure before choosing a repair", result: { test: "tests/test_login.py::test_rate_limit_resets_after_success", error: "assert 429 == 401" } },
          { name: "apply_patch", arguments: { path: "src/auth/login.py", search: "    return {\"token\": issue_token(user)}", replace: "    _FAILURES.pop(request.username, None)\n    return {\"token\": issue_token(user)}" }, rationale: "Successful login was not clearing the failure window", result: { path: "src/auth/login.py", bytes: 1531, replaced_characters: 37 } },
        ],
        test: { passed: true, duration_ms: 2615, output: pytestPass(5, "0.58") },
        findings: [
          { severity: "warning", category: "reliability", message: "Limiter state is per process. Multiple workers will each keep their own window.", path: "src/auth/login.py", line: 9 },
          { severity: "info", category: "maintainability", message: "Consider making the 5 attempt and 60 second limits configurable.", path: "src/auth/login.py", line: 10 },
        ],
      },
    ],
  },
  {
    id: "c3a91f07b2de",
    task: "Fix clamp(value, minimum, maximum): values above maximum currently return minimum. Preserve the public API.",
    repository: "/workspace/benchmark/bug-001",
    recent_history: ["5e0aa13 Materialize benchmark task bug-001"],
    files: benchmarkRepo(
      "def clamp(value, minimum, maximum):\n    if value > maximum:\n        return minimum\n    return max(minimum, value)\n",
      "from solution import clamp\n\ndef test_inside(): assert clamp(5, 0, 10) == 5\n",
      ["clamp"],
    ),
    plan: {
      summary: "Return maximum for values above the upper bound in clamp",
      steps: ["Change the upper bound branch in solution.py to return maximum", "Keep the clamp signature unchanged", "Run the public tests in the sandbox"],
      acceptance_checks: ["pytest passes", "clamp handles below, inside and above ranges"],
      likely_files: ["solution.py"],
    },
    attempts: [
      {
        summary: "Fix upper bound branch",
        changed_files: ["solution.py"],
        tools: [
          readSolution("def clamp(value, minimum, maximum):\n    if value > maximum:\n        return minimum\n    return max(minimum, value)\n"),
          { name: "apply_patch", arguments: { path: "solution.py", search: "        return minimum\n", replace: "        return maximum\n" }, rationale: "Upper bound branch returned the wrong limit", result: { path: "solution.py", bytes: 95, replaced_characters: 23 } },
          { name: "get_git_diff", arguments: {}, rationale: "Confirm the patch touches only the faulty branch", result: "diff --git a/solution.py b/solution.py\n@@ -1,4 +1,4 @@\n def clamp(value, minimum, maximum):\n     if value > maximum:\n-        return minimum\n+        return maximum\n     return max(minimum, value)\n" },
        ],
        test: { passed: true, duration_ms: 1932, output: pytestPass(1, "0.03") },
        findings: [],
      },
    ],
  },
  {
    id: "9e47d20c5a18",
    task: "Fix mean so it accepts one-shot iterables without consuming them twice and raises ValueError for empty input.",
    repository: "/workspace/benchmark/bug-003",
    recent_history: ["0b7d2c4 Materialize benchmark task bug-003"],
    files: benchmarkRepo(
      "def mean(values):\n    if not list(values): raise ValueError('empty')\n    return sum(values) / len(list(values))\n",
      "from solution import mean\n\ndef test_list(): assert mean([2,4]) == 3\n",
      ["mean"],
    ),
    plan: {
      summary: "Materialize the iterable once in mean and validate emptiness on the materialized list",
      steps: ["Convert values to a list exactly once", "Raise ValueError when the list is empty", "Add a generator test to tests/test_public.py", "Run tests in the sandbox"],
      acceptance_checks: ["pytest passes", "generator mean works", "empty input rejected"],
      likely_files: ["solution.py", "tests/test_public.py"],
    },
    attempts: [
      {
        summary: "Materialize iterable",
        changed_files: ["solution.py", "tests/test_public.py"],
        tools: [
          readSolution("def mean(values):\n    if not list(values): raise ValueError('empty')\n    return sum(values) / len(list(values))\n"),
          { name: "write_file", arguments: { path: "solution.py", content: "def mean(values):\n    items = list(values)\n    if not items: raise ValueError('empty')\n    return sum(values) / len(items)\n" }, rationale: "Consume the iterable once", result: { path: "solution.py", bytes: 108 } },
          { name: "apply_patch", arguments: { path: "tests/test_public.py", search: "def test_list(): assert mean([2,4]) == 3\n", replace: "def test_list(): assert mean([2,4]) == 3\ndef test_generator(): assert mean(x for x in [1,2,6]) == 3\n" }, rationale: "Lock in generator support with a test", result: { path: "tests/test_public.py", bytes: 125, replaced_characters: 41 } },
        ],
        test: {
          passed: false,
          duration_ms: 2104,
          output: ".F                                                                       [100%]\n=================================== FAILURES ===================================\n________________________________ test_generator ________________________________\n\n    def test_generator(): assert mean(x for x in [1,2,6]) == 3\nE   assert 0.0 == 3\nE    +  where 0.0 = mean(<generator object test_generator.<locals>.<genexpr>>)\n\ntests/test_public.py:4: AssertionError\n1 failed, 1 passed in 0.04s\n",
        },
      },
      {
        summary: "Sum the materialized list",
        changed_files: ["solution.py", "tests/test_public.py"],
        tools: [
          { name: "get_test_failure", arguments: {}, rationale: "Inspect why the generator mean returned 0.0", result: { test: "tests/test_public.py::test_generator", error: "assert 0.0 == 3" } },
          { name: "apply_patch", arguments: { path: "solution.py", search: "sum(values)", replace: "sum(items)" }, rationale: "sum still read the exhausted generator", result: { path: "solution.py", bytes: 107, replaced_characters: 11 } },
        ],
        test: { passed: true, duration_ms: 1988, output: pytestPass(2, "0.03") },
        findings: [{ severity: "info", category: "tests", message: "An explicit empty input test would document the ValueError contract.", path: "tests/test_public.py", line: 4 }],
      },
    ],
  },
  {
    id: "41d8e6a0f93c",
    task: "Validate the configured logging level against the standard names and write the default level to .env for local runs.",
    repository: "/workspace/benchmark/config-002",
    recent_history: ["e93b5f0 Materialize benchmark task config-002"],
    files: benchmarkRepo(
      "import os\n\ndef log_level():\n    return os.getenv('LOG_LEVEL', 'INFO')\n",
      "from solution import log_level\n\ndef test_default(monkeypatch):\n    monkeypatch.delenv('LOG_LEVEL', raising=False)\n    assert log_level() == 'INFO'\n",
      ["log_level"],
    ),
    plan: {
      summary: "Normalize and validate LOG_LEVEL and persist the default in .env",
      steps: ["Upper-case LOG_LEVEL and reject names outside DEBUG, INFO, WARNING, ERROR and CRITICAL", "Write LOG_LEVEL=INFO to .env", "Run tests in the sandbox"],
      acceptance_checks: ["pytest passes", "invalid levels raise ValueError"],
      likely_files: ["solution.py", ".env"],
    },
    attempts: [
      {
        summary: "Validate level and write .env",
        changed_files: ["solution.py"],
        tools: [
          readSolution("import os\n\ndef log_level():\n    return os.getenv('LOG_LEVEL', 'INFO')\n"),
          { name: "write_file", arguments: { path: "solution.py", content: "import os\n\nLEVELS = {'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'}\n..." }, rationale: "Normalize and validate LOG_LEVEL", result: { path: "solution.py", bytes: 241 } },
        ],
        policyError: "ToolPolicyError: protected path rejected: .env",
      },
    ],
  },
];

// Benchmark tasks used by "Start a sample run". Each replays in the browser.
export const liveScenarios: Scenario[] = [
  {
    id: "",
    task: "Implement retry_delays(attempts, base=1.0, cap=60.0) using capped exponential backoff and validate arguments.",
    repository: "/workspace/benchmark/feature-004",
    recent_history: ["3c1f9d2 Materialize benchmark task feature-004"],
    files: benchmarkRepo(
      "def retry_delays(attempts, base=1.0, cap=60.0):\n    raise NotImplementedError\n",
      "from solution import retry_delays\n\ndef test_basic(): assert retry_delays(3) == [1.0,2.0,4.0]\n",
      ["retry_delays"],
    ),
    plan: {
      summary: "Implement capped exponential backoff with argument validation",
      steps: ["Return [min(cap, base * 2**n) for n in range(attempts)]", "Raise ValueError for negative attempts and non-positive base or cap", "Run tests in the sandbox"],
      acceptance_checks: ["pytest passes", "schedule capped", "arguments validated"],
      likely_files: ["solution.py"],
    },
    attempts: [
      {
        summary: "Implement backoff",
        changed_files: ["solution.py"],
        tools: [
          readSolution("def retry_delays(attempts, base=1.0, cap=60.0):\n    raise NotImplementedError\n"),
          { name: "write_file", arguments: { path: "solution.py", content: "def retry_delays(attempts, base=1.0, cap=60.0):\n    if attempts < 0 or base <= 0 or cap <= 0: raise ValueError('invalid')\n    return [min(cap, base * 2 ** n) for n in range(1, attempts + 1)]\n" }, rationale: "Implement the schedule and validation", result: { path: "solution.py", bytes: 178 } },
        ],
        test: {
          passed: false,
          duration_ms: 1876,
          output: "F                                                                        [100%]\n=================================== FAILURES ===================================\n__________________________________ test_basic __________________________________\n\n    def test_basic(): assert retry_delays(3) == [1.0,2.0,4.0]\nE   assert [2.0, 4.0, 8.0] == [1.0, 2.0, 4.0]\n\ntests/test_public.py:3: AssertionError\n1 failed in 0.03s\n",
        },
      },
      {
        summary: "Start exponent at zero",
        changed_files: ["solution.py"],
        tools: [
          { name: "get_test_failure", arguments: {}, rationale: "Schedule is shifted by one step", result: { test: "tests/test_public.py::test_basic", error: "assert [2.0, 4.0, 8.0] == [1.0, 2.0, 4.0]" } },
          { name: "apply_patch", arguments: { path: "solution.py", search: "range(1, attempts + 1)", replace: "range(attempts)" }, rationale: "First delay must equal base", result: { path: "solution.py", bytes: 171, replaced_characters: 22 } },
        ],
        test: { passed: true, duration_ms: 1790, output: pytestPass(1, "0.02") },
        findings: [],
      },
    ],
  },
  {
    id: "",
    task: "Fix normalize_email so surrounding whitespace is removed before case normalization.",
    repository: "/workspace/benchmark/bug-002",
    recent_history: ["8a2e6f1 Materialize benchmark task bug-002"],
    files: benchmarkRepo("def normalize_email(value):\n    return value.lower()\n", "from solution import normalize_email\n\ndef test_case(): assert normalize_email('A@B.COM') == 'a@b.com'\n", ["normalize_email"]),
    plan: {
      summary: "Strip whitespace before lower-casing in normalize_email",
      steps: ["Call strip() before lower() in solution.py", "Run tests in the sandbox"],
      acceptance_checks: ["pytest passes", "mixed-case padded addresses normalize"],
      likely_files: ["solution.py"],
    },
    attempts: [
      {
        summary: "Strip then lower",
        changed_files: ["solution.py"],
        tools: [
          readSolution("def normalize_email(value):\n    return value.lower()\n"),
          { name: "apply_patch", arguments: { path: "solution.py", search: "value.lower()", replace: "value.strip().lower()" }, rationale: "Remove padding before case normalization", result: { path: "solution.py", bytes: 58, replaced_characters: 13 } },
        ],
        test: { passed: true, duration_ms: 1702, output: pytestPass(1, "0.02") },
        findings: [],
      },
    ],
  },
  {
    id: "",
    task: "Implement chunked(items, size) returning consecutive lists. Reject non-positive sizes.",
    repository: "/workspace/benchmark/feature-001",
    recent_history: ["d41f0c8 Materialize benchmark task feature-001"],
    files: benchmarkRepo("def chunked(items, size):\n    raise NotImplementedError\n", "from solution import chunked\n\ndef test_even(): assert chunked([1,2,3,4],2) == [[1,2],[3,4]]\n", ["chunked"]),
    plan: {
      summary: "Implement chunked with an iterator so any iterable works",
      steps: ["Validate size is a positive integer", "Collect consecutive slices with itertools.islice", "Run tests in the sandbox"],
      acceptance_checks: ["pytest passes", "remainder preserved", "invalid size rejected"],
      likely_files: ["solution.py"],
    },
    attempts: [
      {
        summary: "Implement chunked",
        changed_files: ["solution.py"],
        tools: [
          readSolution("def chunked(items, size):\n    raise NotImplementedError\n"),
          { name: "write_file", arguments: { path: "solution.py", content: "from itertools import islice\n\ndef chunked(items, size):\n    if size <= 0: raise ValueError('size must be positive')\n    iterator = iter(items)\n    return list(iter(lambda: list(islice(iterator, size)), []))\n" }, rationale: "Iterator based chunking keeps the remainder", result: { path: "solution.py", bytes: 199 } },
        ],
        test: { passed: true, duration_ms: 1755, output: pytestPass(1, "0.02") },
        findings: [{ severity: "info", category: "maintainability", message: "The two-argument iter sentinel form is compact but may deserve a short comment.", path: "solution.py", line: 6 }],
      },
    ],
  },
  {
    id: "",
    task: "Refactor collect_errors to remove shared mutable default state while preserving its return type.",
    repository: "/workspace/benchmark/refactor-002",
    recent_history: ["6f90b3e Materialize benchmark task refactor-002"],
    files: benchmarkRepo("def collect_errors(error, errors=[]):\n    errors.append(error)\n    return errors\n", "from solution import collect_errors\n\ndef test_collect(): assert collect_errors('a',[]) == ['a']\n", ["collect_errors"]),
    plan: {
      summary: "Replace the mutable default with None and create a fresh list per call",
      steps: ["Default errors to None", "Create a new list when errors is None", "Run tests in the sandbox"],
      acceptance_checks: ["pytest passes", "calls are isolated"],
      likely_files: ["solution.py"],
    },
    attempts: [
      {
        summary: "Use None default",
        changed_files: ["solution.py"],
        tools: [
          readSolution("def collect_errors(error, errors=[]):\n    errors.append(error)\n    return errors\n"),
          { name: "write_file", arguments: { path: "solution.py", content: "def collect_errors(error, errors=None):\n    errors = [] if errors is None else errors\n    errors.append(error)\n    return errors\n" }, rationale: "Each call gets its own list unless one is passed in", result: { path: "solution.py", bytes: 122 } },
        ],
        test: { passed: true, duration_ms: 1688, output: pytestPass(1, "0.02") },
        findings: [],
      },
    ],
  },
];
