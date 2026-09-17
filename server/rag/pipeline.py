"""RAG pipeline orchestrator.

Runs the five stages (query_rewrite, retrieval, rerank, assembly, generation)
through the trace collector, then localizes the failure stage and persists the
trace. This is the only place that ties RAG logic to the trace core.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from ..config import ensure_dirs
from ..trace import FailureStage, Trace, localize_trace, store, tracer
from ..trace.events import Candidate
from .bm25 import BM25Index
from .corpus import Corpus, load_corpus
from .embeddings import Embeddings
from .intent import classify_intent, risk_profile
from .retrieval import retrieve
from .stages import assemble_context, generate_answer, rerank, rewrite_query

# Defaults — kept here so the API/eval layers can tune them.
DEFAULT_RETRIEVAL_K = 20
DEFAULT_RERANK_K = 5
DEFAULT_CONTEXT_MAX_CHARS = 1200


@dataclass
class PipelineComponents:
    """Prebuilt, reusable pipeline components (build once, run many queries)."""

    corpus: Corpus
    embeddings: Embeddings
    bm25: BM25Index


_components: Optional[PipelineComponents] = None


def get_components() -> PipelineComponents:
    """Build (and memoize) the corpus + indexes once per process."""
    global _components
    if _components is None:
        corpus = load_corpus()
        _components = PipelineComponents(
            corpus=corpus,
            embeddings=Embeddings(),
            bm25=BM25Index.from_chunks(corpus.chunks),
        )
    return _components


def reload_components() -> PipelineComponents:
    """Force a rebuild (e.g. after editing corpus docs during dev)."""
    global _components
    _components = None
    return get_components()


def run_query(
    query: str,
    *,
    query_id: Optional[str] = None,
    key_terms: Optional[list[str]] = None,
    needed_chunk_ids: Optional[list[str]] = None,
    ground_truth_failure: Optional[FailureStage] = None,
    expected_answer: Optional[str] = None,
    mock_drift: bool = False,
    retrieval_k: int = DEFAULT_RETRIEVAL_K,
    rerank_k: int = DEFAULT_RERANK_K,
    context_max_chars: int = DEFAULT_CONTEXT_MAX_CHARS,
    persist: bool = True,
    strict_grounding: bool = False,
    skip_rewrite: bool = False,
) -> Trace:
    """Run one query through the full traced pipeline.

    The optional eval-only fields (needed_chunk_ids, ground_truth_failure,
    expected_answer) are attached to the trace so the dashboard can show
    ground-truth vs. indicated side by side.

    strict_grounding / skip_rewrite are self-healing levers: the heal endpoint
    sets them based on the localized failure stage (see rag/auto_adjust.py).
    """
    ensure_dirs()
    comps = get_components()

    # Intent classification (Phase 3) — cached per query text, recorded on the
    # trace with its per-stage risk profile.
    intent, intent_confidence = classify_intent(query)

    ctx = tracer.start(query, query_id=query_id, key_terms=key_terms or [])

    # Stage 1: query rewrite
    with ctx.stage("query_rewrite", input={"raw": query}) as s:
        if skip_rewrite:
            rewritten = query
            s.set(output={"rewritten": rewritten}, meta={"skipped": True})
        else:
            rewritten = rewrite_query(query)
            s.set(output={"rewritten": rewritten})

    # Stage 2: retrieval (hybrid dense + BM25 → RRF)
    with ctx.stage("retrieval", input={"query": query, "rewritten": rewritten, "k": retrieval_k}) as s:
        results = retrieve(
            rewritten, comps.corpus, comps.embeddings, comps.bm25,
            top_k=retrieval_k,
        )
        candidates = [
            Candidate(
                doc_id=r.chunk.doc_id,
                chunk_id=r.chunk.chunk_id,
                text=r.chunk.text,
                dense_score=r.dense_score,
                bm25_score=r.bm25_score,
                fused_score=r.fused_score,
                rank=r.rank,
                kept=True,
            )
            for r in results
        ]
        s.set(candidates=candidates, meta={"count": len(candidates)})

    # Stage 3: rerank
    with ctx.stage("rerank", input={"top_k": rerank_k, "query": query}) as s:
        kept_results, dropped_results = [], []
        if results:
            ro = rerank(results, top_k=rerank_k, query=query)
            kept_results, dropped_results = ro.kept, ro.dropped
            # Annotate candidates with rerank scores + kept/dropped.
            kept_ids = {r.chunk.chunk_id for r in kept_results}
            dropped_ids = {r.chunk.chunk_id for r in dropped_results}
            for cand in candidates:
                cand.rerank_score = ro.scores.get(cand.chunk_id)
                cand.kept = cand.chunk_id in kept_ids
                cand.dropped_at = "rerank" if cand.chunk_id in dropped_ids else None
        s.set(
            candidates=candidates,
            kept=list(kept_ids),
            dropped=list(dropped_ids),
            meta={"top_k": rerank_k},
        )

    # Stage 4: assembly
    with ctx.stage("assembly", input={"max_chars": context_max_chars}) as s:
        context, kept_ids = assemble_context(kept_results, max_chars=context_max_chars)
        s.set(output={"context": context}, meta={"kept_chunk_ids": kept_ids, "max_chars": context_max_chars})

    # Stage 5: generation
    with ctx.stage("generation", input={"query": query}) as s:
        answer = generate_answer(
            query, context, mock_drift=mock_drift, strict_grounding=strict_grounding
        )
        s.set(output={"answer": answer})

    trace = ctx.finish(answer=answer, final_context=context)

    # Attach eval metadata (does not affect localization inputs except
    # needed_chunk_ids / key_terms which the localizer uses intentionally).
    trace.expected_answer = expected_answer
    trace.ground_truth_failure = ground_truth_failure
    trace.needed_chunk_ids = list(needed_chunk_ids or [])
    trace.intent = intent
    trace.intent_confidence = intent_confidence
    trace.intent_risk_profile = risk_profile(intent)
    # Localize using the eval-provided needed_chunk_ids + key_terms.
    indicated, reason = localize_trace(
        trace,
        needed_chunk_ids=needed_chunk_ids,
        key_terms=key_terms,
    )
    trace.indicated_failure = indicated
    trace.failure_reason = reason
    trace.localization_correct = (
        ground_truth_failure is not None and indicated == ground_truth_failure
    )

    if persist:
        store.save(trace)
    return trace


def run_labeled_query(spec: dict, **overrides) -> Trace:
    """Run a query from queries.json (a labeled spec dict)."""
    gt = spec.get("ground_truth_failure")
    gt_enum = FailureStage(gt) if gt else None
    return run_query(
        query=spec["query"],
        query_id=spec.get("id"),
        key_terms=spec.get("key_terms", []),
        needed_chunk_ids=spec.get("needed_chunk_ids", []),
        ground_truth_failure=gt_enum,
        expected_answer=spec.get("expected_answer"),
        **overrides,
    )
