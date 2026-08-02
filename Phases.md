# Project Phases: RAG Trace Debugger

Timeline reference: Round 2 build window is July 15 (night) – July 24, with final polish and live presentation on July 25.

## Phase 1: Demo RAG Pipeline (baseline, uninstrumented)

- **Goal**: get a working, basic hybrid-search RAG pipeline running end-to-end, before adding any tracing.
- **Tasks**: build the query rewrite step, hybrid retrieval (embedding + BM25), a cross-encoder reranker, context assembly, and the LLM generation call. Build the small test corpus (10–20 documents) with intentionally embedded failure conditions (missing info, contradictions, tables).
- **Dependencies**: none — this is the starting point.
- **Definition of done**: a query can be submitted via a script or simple CLI and returns a generated answer, with the corpus finalized and not to be edited afterward.

## Phase 2: Trace Collector and Data Layer

- **Goal**: instrument every pipeline stage so a complete, structured trace is captured per query.
- **Tasks**: build `log_stage()`, the two SQLite tables (`traces`, `trace_events`), and wire a call to `log_stage()` into each of the five pipeline stages from Phase 1.
- **Dependencies**: Phase 1's pipeline must exist and run reliably first.
- **Definition of done**: running a query produces a complete, correctly-ordered set of trace events in the database, verified by directly querying SQLite.

## Phase 3: Backend API

- **Goal**: expose the pipeline and trace store over a REST API.
- **Tasks**: build `POST /query` (runs a query through the instrumented pipeline), `GET /traces` (list past queries), `GET /traces/:id` (full trace detail for one query).
- **Dependencies**: Phase 2 must be complete, since the API wraps the instrumented pipeline and reads from the trace store.
- **Definition of done**: all three endpoints work and return correct JSON, verified via a REST client or automated integration test.

## Phase 4: Debugger Dashboard (Frontend)

- **Goal**: build the UI that makes traces actually usable for debugging.
- **Tasks**: query search/list view, new-query submission form, and the core stage-by-stage timeline view showing what was retrieved, what survived reranking, the final context, and the generated answer.
- **Dependencies**: Phase 3's API must be functional, since the dashboard is a pure client of it.
- **Definition of done**: a user can submit or select a query in the browser and visually see its full trace, with no need to inspect raw JSON or the database directly.

## Phase 5: Evaluation

- **Goal**: validate that the debugger actually does what it claims — correctly localize failures.
- **Tasks**: label each test query in `eval/test_queries.json` with its true injected failure stage, run all of them through the pipeline, compare the dashboard's indicated failure stage against the ground truth, and measure localization accuracy plus rough before/after debugging time.
- **Dependencies**: Phases 1–4 must all be working, since this phase exercises the full system.
- **Definition of done**: an evaluation results table exists (accuracy, overhead, time comparison) matching the PRD's Success Metrics section, reported honestly even if imperfect.

## Phase 6: Polish and Live Demo Prep

- **Goal**: make sure the system runs reliably and tells a clear story live, in front of judges.
- **Tasks**: pick 3–5 of the most illustrative broken queries from the eval set to walk through live; fix any UI rough edges; do a full dry run of the demo on the actual hardware that will be used at OJONE; write the demo script/talking points tying back to the PRD's problem statement.
- **Dependencies**: Phase 5 must be complete, since the demo walkthrough is built from the evaluation results.
- **Definition of done**: the full system runs start-to-finish on the presentation machine without manual intervention, and the live demo has been rehearsed at least once end-to-end.
