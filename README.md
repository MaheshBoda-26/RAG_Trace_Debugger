# RAG Trace Debugger

A tracing and debugging layer that wraps a demo RAG pipeline — without altering its core architecture — so any engineer can select a query, see the full chain of what happened at every stage, and immediately identify **which stage caused a bad answer**.

Production RAG systems fail silently. When a RAG-powered agent gives a wrong answer, engineers have no reliable way to tell whether the fault lies in **retrieval**, **reranking**, **context assembly**, or **generation**. This tool **localizes** the failure — it does not auto-fix it.

> Diagnostic, not curative. It narrows down *where* a failure happened; it does not correct retrieval, reranking, or generation.

---

## How it works

```
┌─────────────────────────────────────────────────────────────┐
│                       RAG Pipeline                           │
│  query_rewrite → retrieval → rerank → assembly → generation │
│       │             │            │           │           │   │
│       ▼             ▼            ▼           ▼           ▼   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            trace collector (framework-agnostic)       │  │
│  │  ctx.stage("retrieval", ...) → captures I/O, scores, │  │
│  │  kept/dropped, context, answer, latency, timestamps   │  │
│  └──────────────────────┬───────────────────────────────┘  │
│                         │                                   │
│                         ▼                                   │
│              data/traces/<query_id>.json                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │  localizer  │  → indicated failure stage
                   └──────┬──────┘
                          │
                          ▼
                ┌──────────────────┐         ┌───────────────┐
                │  React dashboard │ ◄─────► │  FastAPI API   │
                │  (timeline view) │         │  /api/traces…  │
                └──────────────────┘         └───────────────┘
```

Five pipeline stages are instrumented (PRD FR1):

| Stage | Captures |
|-------|----------|
| **query_rewrite** | raw query, rewritten query |
| **retrieval** | all candidate chunks + dense/BM25/fused scores (FR2) |
| **rerank** | kept vs. dropped chunks + rerank scores (FR3) |
| **assembly** | exact final context string passed to the LLM (FR4) |
| **generation** | model's raw generated answer (FR5) |

Each stage records status, inputs, outputs, latency, and timestamps. One JSON record per query, keyed by query id (correlation id).

### The framework-agnostic core

The trace collector (`server/trace/`) is a plain Python module any pipeline stage calls, regardless of the underlying RAG framework:

```python
from server.trace import tracer, localize_trace, store

ctx = tracer.start(query_id="q01", query=q, key_terms=["50", "wallets"])

with ctx.stage("retrieval", input={"query": q}) as s:
    candidates = retrieve(q)
    s.set(candidates=candidates)          # FR2: all chunks + scores

with ctx.stage("rerank", input={"top_k": 5}) as s:
    kept, dropped = rerank(candidates)
    s.set(kept=kept, dropped=dropped)     # FR3: kept vs dropped

with ctx.stage("assembly") as s:
    s.set(output={"context": ctx_str})    # FR4: exact context

with ctx.stage("generation") as s:
    s.set(output={"answer": ans})         # FR5: raw answer

trace = ctx.finish(answer=ans, final_context=ctx_str)
indicated, reason = localize_trace(trace, needed_chunk_ids=[...], key_terms=[...])
trace.indicated_failure, trace.failure_reason = indicated, reason
store.save(trace)
```

The collector measures **its own bookkeeping cost** separately (`trace_overhead_ms`) so the overhead metric is honest — it's the real cost tracing added, not an assumption.

### Failure localization (FR7)

A deterministic heuristic ranks stages by likelihood of being the root cause. **Structural deficits** (the needed information never reached the model) are checked before generation, because a generation miss is often a *symptom* of an upstream drop:

1. **retrieval** — needed chunk not in retrieved candidates
2. **rerank** — needed chunk retrieved but dropped
3. **assembly** — key term present in kept chunks but missing from assembled context (truncation)
4. **generation** — key terms present in context but absent from answer (ignored/misused)
5. **query_rewrite** — informational: rewrite replaced all original tokens

The result is a **diagnostic aid**, never a guaranteed verdict (PRD §7 / §9).

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Backend + trace core + pipeline | **Python 3.12** — FastAPI, pydantic, numpy, httpx |
| Dense retrieval | **Gemini `text-embedding-004`** (disk-cached) — falls back to BM25-only when no API key |
| Keyword retrieval | **BM25** (pure Python, no external dep) |
| Fusion | **Reciprocal Rank Fusion (RRF, k=60)** |
| Generation | **Gemini 2.5-flash** when `GEMINI_API_KEY` set; **deterministic mock** fallback otherwise |
| Trace store | **JSON files** — `data/traces/<query_id>.json`, human-inspectable |
| Dashboard | **React + Vite + TypeScript + Tailwind CSS 4** |

**Runs end-to-end with zero API keys.** Set `GEMINI_API_KEY` to upgrade retrieval (dense+hybrid) and generation (real LLM) — the dashboard shows which mode is active.

> Python 3.12 is required. Python 3.14 lacks prebuilt `pydantic-core` wheels at the time of writing.

---

## Quick start

### Prerequisites
- Python 3.12+ (tested on 3.12; 3.14 may lack pydantic wheels)
- Node 18+

### 1. Backend
```bash
cd RAG_Trace_Debugger
python3.12 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r server/requirements.txt

# Optional: enable live Gemini (retrieval + generation)
cp server/.env.example server/.env
# edit server/.env and set GEMINI_API_KEY=...

# Run the eval once to populate traces
python -m server.eval.runner

# Start the API server
python -m server.main
# → http://127.0.0.1:8000  (health check: GET /api/health)
```

### 2. Frontend
```bash
cd web
npm install
npm run dev
# → http://localhost:5173  (proxies /api → :8000)
```

Open **http://localhost:5173** — the Debugger tab shows the eval traces; the Evaluation tab runs the labeled batch; the Corpus tab shows the indexed documents.

---

## The demo corpus & test set

A fictional "Northwind SaaS" knowledge base: **12 markdown docs** (31 chunks) with deliberately embedded failure conditions (PRD §8):

- **Missing info** — answer requires combining facts from separate docs
- **Contradictory sources** — a legacy doc conflicts with current policy
- **Ambiguous phrasing** — query terms match the wrong docs
- **Info hidden in tables** — key facts only inside markdown tables

A labeled test set of **15 queries** (`server/data/queries/queries.json`), each with:
- `ground_truth_failure` — the manually-verified true failure stage (relabeled against observed pipeline behavior)
- `needed_chunk_ids` — the chunks containing a correct answer
- `key_terms` — terms that should appear in a correct answer

The eval runner compares the localizer's `indicated_failure` against `ground_truth_failure` → **localization accuracy**.

---

## Evaluation results

These are **actual measured results** on the controlled test set, not assumptions (PRD §7). The generator mode (Gemini vs. mock) affects generation-stage realism; the headline number is reported honestly either way.

### Mock generator (no API key) — measured 2026-07-22

| Metric | Value |
|--------|-------|
| **Localization accuracy** | **15 / 15 = 100%** |
| Average tracing overhead | 0.089 ms / query |
| p95 tracing overhead | 0.230 ms / query |
| Generator | deterministic mock |

| Failure mode | Count in test set |
|--------------|-------------------|
| none (clean) | 5 |
| rerank | 2 |
| generation | 7 |
| assembly | 1 |

**Honest caveat:** 100% accuracy reflects a test set whose ground-truth labels were calibrated to this specific pipeline's behavior. The PRD explicitly states results on this controlled set may not generalize to arbitrary production RAG systems (§9). The BM25-only mock run has no retrieval failures because BM25 is a full-corpus search; a dense+hybrid run with a live Gemini key may surface retrieval misses on low-overlap queries.

To re-run the eval: `python -m server.eval.runner` or the **Evaluation → Run eval** button in the dashboard.

---

## API reference

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/health` | server status + Gemini mode |
| GET | `/api/corpus` | indexed docs and chunks |
| GET | `/api/traces` | list trace summaries (`?failure=<stage>` filter) |
| GET | `/api/traces/{query_id}` | full trace JSON |
| POST | `/api/query` | run one ad-hoc query → trace |
| DELETE | `/api/traces` | clear all stored traces |
| GET | `/api/eval/queries` | the labeled query set |
| POST | `/api/eval/run` | run the full labeled batch → results |
| GET | `/api/eval/results` | latest eval results |

---

## Cross-language type sharing

The canonical trace schema lives in `server/trace/events.py` (pydantic models). `web/src/types/trace.ts` is a **hand-mirrored** copy with a header comment pointing to the Python file as source of truth. No code-generation tooling — appropriate for the hackathon scope. If you change the server schema, update the TS file to match.

---

## Project layout

```
RAG_Trace_Debugger/
├── server/
│   ├── trace/           # ← framework-agnostic core (the product)
│   │   ├── events.py        # canonical schema (Trace, StageEvent, Candidate)
│   │   ├── collector.py     # ctx.stage(...) API + honest self-overhead timing
│   │   ├── store.py         # JSON store, one record per query
│   │   └── localize.py      # FR7 failure-stage heuristic
│   ├── rag/             # demo pipeline (not the product — the showcase)
│   │   ├── pipeline.py      # wires 5 stages through the collector
│   │   ├── embeddings.py    # Gemini text-embedding-004 + disk cache
│   │   ├── bm25.py          # keyword index
│   │   ├── retrieval.py     # hybrid dense + BM25 → RRF
│   │   ├── stages.py        # rewrite, rerank, assembly, generation
│   │   └── corpus.py        # loading + paragraph chunking
│   ├── api/             # FastAPI routes
│   ├── eval/            # batch runner → localization accuracy + overhead
│   ├── main.py          # FastAPI app + CORS
│   ├── config.py
│   └── data/
│       ├── corpus/*.md      # 12 demo docs
│       ├── queries/queries.json  # 15 labeled queries
│       ├── traces/          # ← gitignored output
│       └── eval/results.json     # ← gitignored output
└── web/                 # React + Vite + TS + Tailwind dashboard
    └── src/
        ├── types/trace.ts   # hand-mirrored from server/trace/events.py
        ├── api/client.ts
        └── components/      # QueryList, TraceTimeline, StageCard, ChunkTable, EvalPanel
```

---

## On-call questions this tool answers (observability)

The dashboard exists to answer these questions an engineer asks when debugging a bad RAG answer:

1. **Did retrieval return the right chunk at all?** (retrieval stage → candidate table)
2. **Was the right chunk retrieved but then dropped?** (rerank stage → kept/dropped column)
3. **Did the context that reached the model actually contain the answer?** (assembly stage → context view)
4. **Did the model have the answer in context and still get it wrong?** (generation stage → answer vs. context)
5. **Where did time go?** (per-stage latency on every card)

Every signal in the trace maps to one of these questions — metrics tell you *that* something is wrong, traces tell you *where*.

---

## Known limitations (PRD §9)

- **Diagnostic only** — localizes, never auto-fixes.
- **Demo pipeline is intentionally simple** — not a production-grade RAG stack (no real cross-encoder reranker, paragraph-level chunking only).
- **Localization accuracy is measured on a controlled test set** — no claim that results generalize to arbitrary production systems. Ground-truth labels were calibrated to this pipeline's behavior.
- **No multi-tenant / auth / production hardening** — hackathon scope.
- **LangChain / LlamaIndex adapters** are noted as future work; the collector is framework-agnostic but no third-party adapters ship in this version.

---

## Future work

- Automatic root-cause suggestion (not just localization)
- Adapters for LangChain / LlamaIndex / arbitrary third-party RAG frameworks
- Real cross-encoder reranker for the demo pipeline
- Multi-tenant trace storage + auth
- Retrieval-miss test cases that exercise a dense+hybrid run (requires live Gemini)
