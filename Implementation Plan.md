# Implementation Plan: RAG Trace Debugger

This turns `phases.md` into concrete, day-by-day build steps for the 9-day window (July 15 night – July 24), plus polish/demo prep on July 25. Each task is scoped to be independently checkable, so progress is visible daily rather than discovered at the end.

## Day 0 (July 15, night) — Setup

- [ ] Initialize repo with the folder structure from `architecture.md`
- [ ] Set up Python virtualenv + `requirements.txt`, and a React + Vite + Tailwind scaffold
- [ ] Confirm LLM provider API key works with a trivial test call
- [ ] Commit a working "hello world" for both backend (`/health` endpoint) and frontend (blank dashboard shell)

## Days 1–2 — Phase 1: Demo RAG Pipeline (baseline)

- [ ] Build the 10–20 document test corpus, deliberately including: a missing-info case, a contradiction case, an ambiguous-phrasing case, and a table-based fact
- [ ] Implement query rewrite step (can start simple — pass-through or basic expansion)
- [ ] Implement hybrid retrieval: embedding search (sentence-transformers) + BM25 (rank-bm25)
- [ ] Implement reranking with a cross-encoder
- [ ] Implement context assembly (concatenate top-k reranked chunks into a prompt)
- [ ] Implement the generation call to the chosen LLM provider
- [ ] **Checkpoint**: a query run via a simple script returns a generated answer end-to-end, no tracing yet
- [ ] Freeze the corpus once this checkpoint passes — no further edits (per rules.md)

## Days 2–3 — Phase 2: Trace Collector and Data Layer

- [ ] Create the two SQLite tables (`traces`, `trace_events`) per the schema in `TRD.md`
- [ ] Implement `log_stage(query_id, stage, input, output, latency_ms, timestamp)`
- [ ] Call `log_stage()` from each of the five pipeline stages built in Days 1–2
- [ ] **Checkpoint**: running one query produces a complete, correctly-ordered set of rows in `trace_events`, confirmed via direct SQLite query

## Day 3–4 — Phase 3: Backend API

- [ ] Build `POST /query` — accepts a query, runs the instrumented pipeline, returns the final answer + query_id
- [ ] Build `GET /traces` — lists past queries (id, text, timestamp)
- [ ] Build `GET /traces/:id` — returns the full ordered trace for one query
- [ ] Write integration test: submit a query via the API, then fetch its trace, assert all five stages are present and in order
- [ ] **Checkpoint**: all three endpoints verified via a REST client (e.g., a `curl` script or `httpie`)

## Day 4–6 — Phase 4: Debugger Dashboard

- [ ] Build query list/search view (calls `GET /traces`)
- [ ] Build new-query submission form (calls `POST /query`)
- [ ] Build the core timeline view: for a selected query, show each stage as a card — retrieved chunks + scores, what survived reranking, final assembled context, generated answer
- [ ] Visually highlight where a chunk was dropped (e.g., struck-through or greyed-out chunks that didn't survive reranking)
- [ ] **Checkpoint**: a full walkthrough — submit a query, see it appear in the list, click it, see its complete trace — works with no manual JSON inspection needed

## Day 6–7 — Phase 5: Evaluation

- [ ] Label each test query in `eval/test_queries.json` with its true injected failure stage (ground truth)
- [ ] Write `eval/run_eval.py`: runs all labeled queries through the pipeline, compares the dashboard/trace's indicated failure stage against ground truth
- [ ] Compute and record: localization accuracy, tracing overhead (ms), and a rough manual-debugging-time comparison on a handful of queries
- [ ] **Checkpoint**: an evaluation results table exists, matching the PRD's Success Metrics section, with real (not assumed) numbers

## Day 7–9 — Phase 6: Polish and Live Demo Prep

- [ ] Pick 3–5 of the most illustrative broken queries from the eval set for the live walkthrough
- [ ] Fix UI rough edges surfaced during evaluation and dry runs
- [ ] Do a full dry run on the actual presentation hardware (not just the dev machine)
- [ ] Write a short demo script: problem statement → live walkthrough of a broken query → dashboard pinpointing the failure stage → evaluation results table
- [ ] **Checkpoint**: full system runs start-to-finish with a single command (or documented two-step start), rehearsed at least once end-to-end

## Risk Notes (things likely to slip)

- **Reranker/embedding model download size or latency** — test this on Day 1, not Day 6, in case a lighter model swap is needed.
- **LLM API rate limits or flakiness during the live demo** — have a fallback: a cached/recorded response for the exact demo queries in case of a live API hiccup.
- **Scope creep into "auto-fix" features** — per `rules.md`, resist the temptation to add automatic correction; the debugger's job is localization only, and that's what's being evaluated.
