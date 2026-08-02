# Product Requirements Document: RAG Trace Debugger

## 1. Problem Statement

Production RAG (Retrieval-Augmented Generation) systems fail silently. When a RAG-powered agent gives a wrong or nonsensical answer, engineers currently have no reliable way to determine *why* it failed — whether the fault lies in retrieval (wrong or missing chunks), reranking (right chunks retrieved but dropped or buried), context assembly (right chunks but poorly assembled), or generation (right context but ignored or misused by the model).

This lines up with what practitioners commonly report: retrieval, not generation, is frequently the actual point of failure, yet most debugging effort today goes into tweaking prompts or swapping models because there's no visibility into the retrieval layer itself. Multiple engineering write-ups also point to the same root cause: without trace-level logging across pipeline stages, debugging a bad answer comes down to guesswork, and teams tend to underestimate this need until they hit it in production. We treat this as a well-supported hypothesis to validate with our own test set, not an established fact we're relying on unverified.

This is directly relevant to OneInbox: any RAG-based agent pulling from policy documents, pricing sheets, or call transcripts will hit this exact failure mode, and today there is no tooling to localize it quickly.

## 2. Goal

Build a tracing and debugging layer that wraps an existing RAG pipeline — without altering its core architecture — so that any engineer can select a query, see the full chain of what happened at every stage, and immediately identify which stage caused a bad answer.

## 3. Target User

AI/ML engineers and support engineers maintaining a RAG-based system in production, who currently rely on manual re-running of queries and guesswork to diagnose bad answers.

## 4. Scope (Round 1 → Round 2)

**In scope:**
- Instrumentation hooks for five pipeline stages: query rewrite/expansion, retrieval, reranking, context assembly, generation
- A trace collector that captures structured events per stage (inputs, outputs, scores, latency, timestamp)
- A trace store (one record per query, keyed by query ID)
- A debugger dashboard displaying the full trace as a timeline per query
- A demo RAG pipeline (basic hybrid search + rerank) built specifically to showcase the debugger, using a small custom document corpus
- A test set of deliberately "broken" queries (missing context, contradictory sources, ambiguous phrasing) used to validate the tool

**Out of scope (for this hackathon):**
- Automatic root-cause suggestion or fixing (the tool localizes, it does not yet resolve)
- Multi-tenant / auth / production hardening
- Support for arbitrary third-party RAG frameworks (LangChain, LlamaIndex adapters can be a "future work" note)

## 5. Functional Requirements

| ID | Requirement |
|----|-------------|
| FR1 | System must log every stage of a query's lifecycle through the RAG pipeline as a structured event |
| FR2 | Each retrieval event must record all candidate chunks and their similarity scores |
| FR3 | Each rerank event must record which chunks were kept, which were dropped, and their rerank scores |
| FR4 | System must record the exact final context string passed to the LLM |
| FR5 | System must record the model's raw generated answer |
| FR6 | Dashboard must let a user select any traced query and view its full stage-by-stage timeline |
| FR7 | Dashboard must visually indicate which stage a chunk was dropped at, if applicable — as a diagnostic aid, not a guaranteed root-cause verdict |
| FR8 | System must support a batch of test queries with known expected answers, for validating trace accuracy |

## 6. Non-Functional Requirements

- **Low overhead**: tracing is designed to add minimal latency to the pipeline; we will measure the actual added latency and report it honestly rather than assuming a specific number in advance
- **Framework-agnostic core**: the trace collector should be a simple function/interface any pipeline stage can call, regardless of underlying RAG framework
- **Readable output**: dashboard must be understandable without reading source code — a non-implementer should be able to see "retrieval missed the needed chunk" at a glance

## 7. Success Metrics

- **Root-cause localization time**: time to identify the failing stage, comparing manual debugging (baseline) vs. using the dashboard. We expect an improvement but will report the actual measured difference rather than a pre-set target.
- **Localization accuracy**: on a labeled set of deliberately broken queries (each with a known injected failure point), percentage of cases where the dashboard correctly identifies the actual failing stage. This is the metric we consider most important, and we will report it honestly even if it's imperfect.
- **Overhead**: added latency per query from tracing, measured and reported as-is.

## 8. Evaluation Plan

1. Build a small demo corpus (10–20 documents) with intentionally embedded failure conditions: missing information, contradictory sections, ambiguous phrasing, and information hidden inside tables.
2. Run a batch of test queries designed to trigger each RAG failure mode (retrieval miss, rerank miss, generation ignoring context).
3. For each query, manually label the true failure stage.
4. Compare the dashboard's indicated failure stage against the ground truth label.
5. Report accuracy, plus before/after debugging time on a small sample with a human debugger.

## 9. Known Limitations

This is a diagnostic tool, not a fix-it tool — it narrows down where a failure happened, it does not automatically correct retrieval, reranking, or generation. Accuracy of localization will depend on how representative our test corpus and injected failures are of real-world cases; we make no claim that results on our test set will generalize perfectly to arbitrary production RAG systems. Given the build window, the demo pipeline itself will be intentionally simple (not a full production-grade RAG stack), so the debugger's value is demonstrated on a controlled but honest example rather than an at-scale deployment.

## 10. Deliverables for Round 2

- GitHub repository with the instrumented demo RAG pipeline and trace collector
- Working debugger dashboard (web UI)
- Live demo walking through 3–5 deliberately broken queries, showing the dashboard correctly localizing each failure
- Evaluation results table (localization accuracy, overhead, time-to-diagnose comparison)
