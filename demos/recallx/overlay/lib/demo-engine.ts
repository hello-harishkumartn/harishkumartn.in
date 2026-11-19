// Demo-only retrieval and answer engine. Runs fully in the browser.
// It mirrors the shape of the real backend pipeline (backend/app/retrieval,
// backend/app/rag, backend/app/llm/mock_provider.py) over the recorded
// sample_data chunks: BM25 keyword search, a bag-of-words plus trigram
// "vector" similarity, RRF fusion (k=60), a coverage-based rerank score,
// RBAC filtering by allowed_roles and the extractive mock provider answer.

export interface FixtureDoc {
  id: string;
  name: string;
  file_format: string;
  document_type: string;
  department: string;
  category: string;
  allowed_roles: string[];
  status: string;
  chunk_count: number;
  created_at: string;
}

export interface FixtureChunk {
  chunk_id: string;
  document_id: string;
  content: string;
  section: string | null;
  page_number: number | null;
}

export interface QAItem {
  id: string;
  role: string;
  category: string;
  question: string;
  expected_document_names: string[];
  forbidden_document_names?: string[];
}

export interface Chunk {
  chunk_id: string;
  document_id: string;
  document_name: string;
  content: string;
  section: string | null;
  page_number: number | null;
  document_type: string;
  department: string;
  category: string;
  vector_score: number | null;
  keyword_score: number | null;
  fused_score: number | null;
  rerank_score: number | null;
}

export interface CitationOut {
  number: number;
  document_id: string;
  document_name: string;
  section: string | null;
  page_number: number | null;
  passage: string;
}

export interface Answer {
  answer: string;
  citations: CitationOut[];
  retrieved_chunks: Chunk[];
  context_text: string;
  llm_provider: string;
  llm_model: string;
  prompt_tokens: number;
  completion_tokens: number;
  retrieval_latency_ms: number;
  generation_latency_ms: number;
  total_latency_ms: number;
  warnings: string[];
}

const RRF_K = 60;
const TOP_K = 20;
const FUSED_TOP_N = 15;
const FINAL_TOP_N = 6;
const MAX_CHUNKS_PER_DOC = 3;

// Same stopword list as mock_provider.py and evaluation/metrics.py.
const MOCK_STOPWORDS = new Set(
  "the a an is are of to and in for on what how do does can i my it this that be was were with as at by or if when who".split(" ")
);
// Retrieval side also ignores corpus-wide filler that every document shares.
const RETRIEVAL_STOPWORDS = new Set([
  ...Array.from(MOCK_STOPWORDS),
  ..."not any from per much many our we you your they their there which will would should acme fs financial services company want make need whose get like tell me about please know where why".split(" "),
]);

const INSUFFICIENT_EVIDENCE_TEXT =
  "I don't have enough information in the currently indexed documents to " +
  "answer this question confidently. Try rephrasing, broadening the search " +
  "filters, or asking a member of the relevant department.";
const MOCK_INSUFFICIENT =
  "I don't have enough information in the currently indexed documents to answer this question confidently.";

function rawWords(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) || [];
}

// The demo adds light stemming so "password" also matches "passwords".
const wordCache = new Map<string, Set<string>>();
function mockWords(text: string): Set<string> {
  let s = wordCache.get(text);
  if (!s) {
    s = new Set(rawWords(text).filter((w) => !MOCK_STOPWORDS.has(w)).map(stem));
    if (wordCache.size > 5000) wordCache.clear();
    wordCache.set(text, s);
  }
  return s;
}

const IRREGULAR: Record<string, string> = { paid: "pay", pays: "pay", got: "get", kept: "keep", spent: "spend", bought: "buy" };

function stem(w: string): string {
  if (IRREGULAR[w]) return IRREGULAR[w];
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -1);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

function terms(text: string): string[] {
  return rawWords(text)
    .filter((w) => !RETRIEVAL_STOPWORDS.has(w))
    .map(stem);
}

function trigrams(text: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of rawWords(text)) {
    if (RETRIEVAL_STOPWORDS.has(w)) continue;
    const s = ` ${w} `;
    for (let i = 0; i + 3 <= s.length; i++) {
      const g = s.slice(i, i + 3);
      m.set(g, (m.get(g) || 0) + 1);
    }
  }
  return m;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  a.forEach((v, k) => {
    na += v * v;
    const bv = b.get(k);
    if (bv) dot += v * bv;
  });
  b.forEach((v) => (nb += v * v));
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function round(n: number, d = 4): number {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

// Small deterministic hash so recorded latencies look stable per query.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

interface Indexed {
  chunk: FixtureChunk;
  doc: FixtureDoc;
  tf: Map<string, number>;
  len: number;
  tri: Map<string, number>;
  termSet: Set<string>;
}

export function createEngine(initialDocs: FixtureDoc[], initialChunks: FixtureChunk[]) {
  let docs: FixtureDoc[] = [...initialDocs];
  let index: Indexed[] = [];
  let df = new Map<string, number>();
  let avgLen = 1;

  function rebuild(chunks: FixtureChunk[]) {
    const byId = new Map(docs.map((d) => [d.id, d]));
    index = [];
    df = new Map();
    let total = 0;
    for (const c of chunks) {
      const doc = byId.get(c.document_id);
      if (!doc) continue;
      const toks = terms(`${c.section || ""} ${c.content}`);
      const tf = new Map<string, number>();
      for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
      tf.forEach((_v, t) => df.set(t, (df.get(t) || 0) + 1));
      total += toks.length;
      index.push({ chunk: c, doc, tf, len: toks.length, tri: trigrams(`${doc.name} ${c.section || ""} ${c.content}`), termSet: new Set(tf.keys()) });
    }
    avgLen = index.length ? total / index.length : 1;
  }

  let allChunks: FixtureChunk[] = [...initialChunks];
  rebuild(allChunks);

  function addDocument(doc: FixtureDoc, chunks: FixtureChunk[]) {
    docs = [...docs, doc];
    allChunks = [...allChunks, ...chunks];
    rebuild(allChunks);
  }

  function idf(t: string): number {
    const n = index.length;
    const d = df.get(t) || 0;
    return Math.log(1 + (n - d + 0.5) / (d + 0.5));
  }

  function bm25(qTerms: string[], it: Indexed): number {
    const k1 = 1.5;
    const b = 0.75;
    let s = 0;
    for (const t of Array.from(new Set(qTerms))) {
      const f = it.tf.get(t);
      if (!f) continue;
      s += (idf(t) * f * (k1 + 1)) / (f + k1 * (1 - b + (b * it.len) / avgLen));
    }
    return s;
  }

  function vectorScore(qTerms: string[], qTri: Map<string, number>, it: Indexed): number {
    const qv = new Map<string, number>();
    for (const t of qTerms) qv.set(t, (qv.get(t) || 0) + idf(t));
    const cv = new Map<string, number>();
    it.tf.forEach((f, t) => cv.set(t, f * idf(t)));
    const raw = 0.6 * cosine(qv, cv) + 0.4 * cosine(qTri, it.tri);
    // Map into the range a MiniLM cosine similarity usually sits in.
    return 0.08 + 0.85 * raw;
  }

  function rerankScore(qTerms: string[], it: Indexed): number {
    const uniq = Array.from(new Set(qTerms));
    if (!uniq.length) return 0;
    let w = 0;
    let hit = 0;
    for (const t of uniq) {
      const weight = idf(t);
      w += weight;
      if (it.termSet.has(t)) hit += weight;
    }
    const coverage = w ? hit / w : 0;
    // Cross-encoder style logit, roughly -8 (unrelated) to +8 (direct answer),
    // squashed with a sigmoid like CrossEncoder.predict does for one label.
    const logit = coverage * 14 - 7 + Math.min(bm25(qTerms, it), 12) * 0.12;
    return 1 / (1 + Math.exp(-logit));
  }

  function toChunk(it: Indexed, extra: Partial<Chunk>): Chunk {
    return {
      chunk_id: it.chunk.chunk_id,
      document_id: it.doc.id,
      document_name: it.doc.name,
      content: it.chunk.content,
      section: it.chunk.section,
      page_number: it.chunk.page_number,
      document_type: it.doc.document_type,
      department: it.doc.department,
      category: it.doc.category,
      vector_score: null,
      keyword_score: null,
      fused_score: null,
      rerank_score: null,
      ...extra,
    };
  }

  function retrieve(query: string, role: string, mode = "hybrid", topN = FINAL_TOP_N): Chunk[] {
    const qTerms = terms(query);
    if (!qTerms.length) return [];
    const qTri = trigrams(query);
    // RBAC: a document is visible iff the role is listed in allowed_roles.
    const visible = index.filter((it) => (it.doc.allowed_roles || []).includes(role));

    const vec = () =>
      visible
        .map((it) => ({ it, s: vectorScore(qTerms, qTri, it) }))
        .sort((a, b) => b.s - a.s)
        .slice(0, TOP_K);
    const kw = () =>
      visible
        .map((it) => ({ it, s: bm25(qTerms, it) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, TOP_K);

    let candidates: { it: Indexed; c: Partial<Chunk> }[] = [];
    if (mode === "semantic") {
      candidates = vec().map((x) => ({ it: x.it, c: { vector_score: round(x.s) } }));
    } else if (mode === "keyword") {
      candidates = kw().map((x) => ({ it: x.it, c: { keyword_score: round(x.s) } }));
    } else {
      const fused = new Map<string, { it: Indexed; c: Partial<Chunk>; f: number }>();
      vec().forEach((x, rank) => {
        fused.set(x.it.chunk.chunk_id, { it: x.it, c: { vector_score: round(x.s) }, f: 1 / (RRF_K + rank + 1) });
      });
      kw().forEach((x, rank) => {
        const e = fused.get(x.it.chunk.chunk_id) || { it: x.it, c: {}, f: 0 };
        e.c.keyword_score = round(x.s);
        e.f += 1 / (RRF_K + rank + 1);
        fused.set(x.it.chunk.chunk_id, e);
      });
      candidates = Array.from(fused.values())
        .sort((a, b) => b.f - a.f)
        .slice(0, FUSED_TOP_N)
        .map((e) => ({ it: e.it, c: { ...e.c, fused_score: round(e.f, 5) } }));
    }
    return candidates
      .map(({ it, c }) => toChunk(it, { ...c, rerank_score: round(rerankScore(qTerms, it)) }))
      .sort((a, b) => (b.rerank_score || 0) - (a.rerank_score || 0))
      .slice(0, topN);
  }

  function search(query: string, role: string, mode = "hybrid", topN?: number) {
    const t0 = 18 + hash(query + mode) * 40;
    const results = retrieve(query, role, mode, topN || FINAL_TOP_N);
    return { query, mode, results, latency_ms: round(t0 + results.length * 2.5, 2) };
  }

  // Context builder: keeps at most 3 chunks per document and numbers them.
  // Chunks the reranker scores as unrelated are dropped, so off-topic
  // questions end in the insufficient-evidence answer instead of a guess.
  function buildContext(retrieved: Chunk[]) {
    const perDoc = new Map<string, number>();
    const blocks: Chunk[] = [];
    // A best rerank score under 0.075 (logit -2.5) means nothing relevant was found.
    if (!retrieved.length || (retrieved[0].rerank_score ?? 0) < 0.075) return { blocks, text: "" };
    for (const c of retrieved) {
      if ((c.rerank_score ?? 0) < 0.03) continue;
      const n = perDoc.get(c.document_id) || 0;
      if (n >= MAX_CHUNKS_PER_DOC) continue;
      perDoc.set(c.document_id, n + 1);
      blocks.push(c);
    }
    const text = blocks
      .map((c, i) => `[${i + 1}] ${c.document_name}${c.section ? ` - ${c.section}` : ""}\n${c.content}`)
      .join("\n\n---\n\n");
    return { blocks, text };
  }

  // Port of backend/app/llm/mock_provider.py (extractive, deterministic).
  // Demo tweak: blocks are ranked by their best matching sentence (ties keep
  // rerank order) so long chunks do not win on sheer length.
  function mockGenerate(question: string, blocks: Chunk[]): string {
    const qWords = mockWords(question);
    if (!blocks.length || !qWords.size) return MOCK_INSUFFICIENT;
    const scored = blocks.map((b, i) => {
      let best = b.content.trim();
      let bestScore = 0;
      for (const sentence of b.content.trim().split(/(?<=[.!?])\s+|\n+/)) {
        const sw = mockWords(sentence);
        let o = 0;
        qWords.forEach((w) => sw.has(w) && o++);
        if (o > bestScore) {
          bestScore = o;
          best = sentence;
        }
      }
      return { overlap: bestScore, number: i + 1, best: best.trim() };
    });
    scored.sort((a, b) => b.overlap - a.overlap || a.number - b.number);
    const top = scored.filter((s) => s.overlap > 0).slice(0, 2);
    if (!top.length) return MOCK_INSUFFICIENT;
    const out = top.map(({ number, best }) => `${/[.!?]$/.test(best) ? best : best + "."} [${number}]`);
    return "Based on the available documents: " + out.join(" ");
  }

  function answer(question: string, role: string, mode = "hybrid"): Answer {
    const retrieved = retrieve(question, role, mode);
    const retrievalMs = round(35 + hash(question + mode) * 70, 2);
    // Several query words that occur nowhere in the corpus means the
    // question is about something the knowledge base does not cover.
    const qUniq = Array.from(new Set(terms(question))).filter((t) => !/^\d+$/.test(t));
    const unknown = qUniq.filter((t) => !df.has(t)).length;
    const offTopic = unknown >= 2 && unknown / qUniq.length >= 0.4;
    const ctx = offTopic ? { blocks: [] as Chunk[], text: "" } : buildContext(retrieved);
    if (!ctx.blocks.length) {
      return {
        answer: INSUFFICIENT_EVIDENCE_TEXT,
        citations: [],
        retrieved_chunks: retrieved,
        context_text: "",
        llm_provider: "none",
        llm_model: "none",
        prompt_tokens: 0,
        completion_tokens: 0,
        retrieval_latency_ms: retrievalMs,
        generation_latency_ms: 0,
        total_latency_ms: round(retrievalMs + 1.5, 2),
        warnings: ["no_relevant_context_found"],
      };
    }
    const text = mockGenerate(question, ctx.blocks);
    const cited = Array.from(new Set((text.match(/\[(\d+)\]/g) || []).map((m) => parseInt(m.slice(1), 10)))).sort((a, b) => a - b);
    const citations: CitationOut[] = [];
    for (const n of cited) {
      const c = ctx.blocks[n - 1];
      if (!c) continue;
      citations.push({
        number: n,
        document_id: c.document_id,
        document_name: c.document_name,
        section: c.section,
        page_number: c.page_number,
        passage: c.content,
      });
    }
    const genMs = round(4 + hash(text) * 9, 2);
    return {
      answer: text,
      citations,
      retrieved_chunks: retrieved,
      context_text: ctx.text,
      llm_provider: "mock",
      llm_model: "extractive-mock-v1",
      prompt_tokens: 0,
      completion_tokens: text.split(/\s+/).length,
      retrieval_latency_ms: retrievalMs,
      generation_latency_ms: genMs,
      total_latency_ms: round(retrievalMs + genMs + 3.2, 2),
      warnings: [],
    };
  }

  // Port of backend/app/evaluation/runner.py + metrics.py heuristics.
  function evaluate(qa: QAItem[], generationMode = "hybrid") {
    const nameToId = new Map(docs.map((d) => [d.name, d.id]));
    const ids = (names: string[] = []) => names.map((n) => nameToId.get(n)).filter((x): x is string => !!x);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const modes = ["semantic", "keyword", "hybrid"];
    const rows = qa.map((item) => {
      const expected = ids(item.expected_document_names);
      const forbidden = ids(item.forbidden_document_names);
      const retrieval: Record<string, { recall_at_k: number; precision_at_k: number; mrr: number }> = {};
      for (const m of modes) {
        const seen: string[] = [];
        for (const c of retrieve(item.question, item.role, m, FINAL_TOP_N)) if (!seen.includes(c.document_id)) seen.push(c.document_id);
        const top = seen.slice(0, FINAL_TOP_N);
        const hit = top.filter((d) => expected.includes(d)).length;
        const firstRank = seen.findIndex((d) => expected.includes(d));
        retrieval[m] = {
          recall_at_k: expected.length ? new Set(top.filter((d) => expected.includes(d))).size / new Set(expected).size : 1,
          precision_at_k: top.length ? hit / top.length : 0,
          mrr: firstRank >= 0 ? 1 / (firstRank + 1) : 0,
        };
      }
      const a = answer(item.question, item.role, generationMode);
      const cited = a.citations.map((c) => c.document_id);
      const retrievedIds = new Set(a.retrieved_chunks.map((c) => c.document_id));
      const citation = expected.length
        ? cited.length
          ? cited.filter((d) => expected.includes(d)).length / cited.length
          : 0
        : cited.length
          ? 0
          : 1;
      const ctxWords = mockWords(a.context_text);
      const sentences = a.answer.split(/(?<=[.!?])\s+/).filter((s) => mockWords(s).size);
      const grounded =
        sentences.length && ctxWords.size
          ? avg(
              sentences.map((s) => {
                const sw = Array.from(mockWords(s));
                return sw.filter((w) => ctxWords.has(w)).length / sw.length;
              })
            )
          : 0;
      const qw = Array.from(mockWords(item.question));
      const aw = mockWords(a.answer);
      const relevance = qw.length ? qw.filter((w) => aw.has(w)).length / qw.length : 0;
      const rbacPass = !forbidden.some((f) => retrievedIds.has(f) || cited.includes(f));
      return { item, retrieval, a, citation, grounded, relevance, rbacPass };
    });
    const rbac = rows.filter((r) => r.item.category === "rbac_negative");
    const insuf = rows.filter((r) => r.item.category === "insufficient_evidence");
    return {
      dataset_size: rows.length,
      generation_mode: generationMode,
      retrieval: Object.fromEntries(
        modes.map((m) => [
          m,
          {
            recall_at_k: avg(rows.map((r) => r.retrieval[m].recall_at_k)),
            precision_at_k: avg(rows.map((r) => r.retrieval[m].precision_at_k)),
            mrr: avg(rows.map((r) => r.retrieval[m].mrr)),
          },
        ])
      ),
      generation: {
        avg_groundedness: avg(rows.map((r) => r.grounded)),
        avg_relevance: avg(rows.map((r) => r.relevance)),
        avg_citation_correctness: avg(rows.map((r) => r.citation)),
        llm_judge_used_for_fraction: 0,
      },
      system: {
        avg_retrieval_latency_ms: avg(rows.map((r) => r.a.retrieval_latency_ms)),
        avg_generation_latency_ms: avg(rows.map((r) => r.a.generation_latency_ms)),
        avg_total_latency_ms: avg(rows.map((r) => r.a.total_latency_ms)),
        avg_prompt_tokens: avg(rows.map((r) => r.a.prompt_tokens)),
        avg_completion_tokens: avg(rows.map((r) => r.a.completion_tokens)),
      },
      rbac: { test_count: rbac.length, pass_rate: avg(rbac.map((r) => (r.rbacPass ? 1 : 0))) },
      insufficient_evidence: {
        test_count: insuf.length,
        correct_refusal_rate: avg(insuf.map((r) => (r.a.citations.length === 0 ? 1 : 0))),
      },
    };
  }

  return {
    get documents() {
      return docs;
    },
    get chunkCount() {
      return allChunks.length;
    },
    addDocument,
    search,
    answer,
    evaluate,
  };
}

// Paragraph packer used for documents uploaded during the session (md, txt).
export function chunkText(text: string, documentId: string, idPrefix: string): FixtureChunk[] {
  const out: FixtureChunk[] = [];
  let section: string | null = null;
  let cur: string[] = [];
  let curSection: string | null = null;
  let words = 0;
  const flush = () => {
    if (cur.length) out.push({ chunk_id: `${idPrefix}-${out.length}`, document_id: documentId, content: cur.join("\n\n"), section: curSection, page_number: null });
    cur = [];
    words = 0;
  };
  for (const para of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const p = para.trim();
    if (!p) continue;
    const heading = p.match(/^#{1,6}\s+(.*)$/);
    if (heading || (p.length < 80 && p === p.toUpperCase() && /[A-Z]/.test(p))) {
      flush();
      section = heading ? heading[1].trim() : p;
      continue;
    }
    const w = p.split(/\s+/).length;
    if (cur.length && (words + w > 230 || curSection !== section)) flush();
    if (!cur.length) curSection = section;
    cur.push(p.replace(/\s+/g, " "));
    words += w;
  }
  flush();
  return out;
}
