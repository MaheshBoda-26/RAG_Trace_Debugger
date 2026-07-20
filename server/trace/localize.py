"""Failure localization heuristic (FR7).

Given a finished trace, this estimates WHICH stage most likely caused a bad
answer. It is a deterministic heuristic, reported as a diagnostic aid — not a
guaranteed verdict (PRD §7 / §9).

Ranking (first match wins). The localizer needs two extra inputs the trace
itself doesn't always carry:
  - needed_chunk_ids: the chunk id(s) that contain the answer, if known.
    For the eval set these come from the labeled query; for ad-hoc queries
    we pass [] and rely on the generation/assembly signals.
  - key_terms: terms that should appear in a correct answer (from the query).

Signals
-------
1. generation  — key terms present in the assembled context but ABSENT from the
                 answer. (Right context, ignored/misused.)
2. rerank      — a needed chunk WAS retrieved but got dropped at rerank.
3. retrieval   — a needed chunk was NOT retrieved at all.
4. query_rewrite — (informational) the rewrite changed tokens materially.
5. assembly    — kept chunks contain a key term but the assembled context does
                 not (e.g. truncation dropped the relevant sentence).
6. none        — no detectable failure.
"""
from __future__ import annotations

from typing import Optional

from .events import Candidate, FailureStage, StageEvent, StageName, Trace


def _stage(trace: Trace, name: StageName) -> Optional[StageEvent]:
    for s in trace.stages:
        if s.stage == name:
            return s
    return None


def _norm_tokens(text: str) -> set[str]:
    return {t.lower().strip(".,;:!?\"'()[]") for t in text.split() if t.strip()}


def localize_trace(
    trace: Trace,
    *,
    needed_chunk_ids: Optional[list[str]] = None,
    key_terms: Optional[list[str]] = None,
) -> tuple[FailureStage, str]:
    """Return (indicated_failure, human-readable reason) for a trace.

    Mutates nothing; the caller assigns the result onto the trace.
    """
    needed = list(needed_chunk_ids or [])
    keys = [k.lower() for k in (key_terms or trace.key_terms or []) if k]

    retrieval = _stage(trace, StageName.RETRIEVAL)
    rerank = _stage(trace, StageName.RERANK)
    assembly = _stage(trace, StageName.ASSEMBLY)
    generation = _stage(trace, StageName.GENERATION)

    # Gather candidate sets.
    retrieved_chunks: list[Candidate] = (retrieval.candidates if retrieval else []) or []
    rerank_chunks: list[Candidate] = (rerank.candidates if rerank else []) or retrieved_chunks
    context = (assembly.output.get("context") if assembly else trace.final_context) or ""
    answer = (generation.output.get("answer") if generation else trace.answer) or ""

    # 1. GENERATION: key terms present in context but missing from the answer.
    if keys:
        ctx_tokens = _norm_tokens(context)
        ans_tokens = _norm_tokens(answer)
        missing_in_answer = [k for k in keys if k in ctx_tokens and k not in ans_tokens]
        if missing_in_answer:
            return (
                FailureStage.GENERATION,
                f"Key term(s) present in assembled context but absent from answer: "
                f"{', '.join(missing_in_answer[:5])}. The model likely ignored or "
                f"misused the context.",
            )

    # 2. RERANK: a needed chunk was retrieved but dropped at rerank.
    if needed:
        retrieved_ids = {c.chunk_id for c in retrieved_chunks}
        dropped_needed = [
            cid for cid in needed
            if cid in retrieved_ids and any(
                c.chunk_id == cid and not c.kept for c in rerank_chunks
            )
        ]
        if dropped_needed:
            return (
                FailureStage.RERANK,
                f"Needed chunk(s) were retrieved but dropped at rerank: "
                f"{', '.join(dropped_needed[:5])}. Consider rerank top-k or scoring.",
            )

    # 3. RETRIEVAL: a needed chunk was not retrieved at all.
    if needed:
        retrieved_ids = {c.chunk_id for c in retrieved_chunks}
        missing = [cid for cid in needed if cid not in retrieved_ids]
        if missing:
            return (
                FailureStage.RETRIEVAL,
                f"Needed chunk(s) not present in retrieved candidates: "
                f"{', '.join(missing[:5])}. Retrieval missed the relevant passage.",
            )

    # 4. ASSEMBLY: a key term appears in a kept chunk but not in the context.
    if keys:
        kept_text = " ".join(c.text for c in rerank_chunks if c.kept)
        kept_tokens = _norm_tokens(kept_text)
        ctx_tokens = _norm_tokens(context)
        lost = [k for k in keys if k in kept_tokens and k not in ctx_tokens]
        if lost:
            return (
                FailureStage.ASSEMBLY,
                f"Key term(s) present in kept chunks but missing from assembled "
                f"context: {', '.join(lost[:5])}. Likely truncated/over-summarized.",
            )

    # 5. QUERY_REWRITE: informational — rewrite dropped tokens from the raw query.
    rewrite = _stage(trace, StageName.QUERY_REWRITE)
    if rewrite:
        raw = (rewrite.input.get("raw") or rewrite.input.get("query") or trace.query) or ""
        out = rewrite.output.get("rewritten") or ""
        raw_tokens = _norm_tokens(raw)
        out_tokens = _norm_tokens(out)
        if raw_tokens and out_tokens and not (raw_tokens & out_tokens):
            return (
                FailureStage.QUERY_REWRITE,
                "Query rewrite replaced all original tokens; may have lost intent.",
            )

    # 6. No detectable failure. (May still be wrong — this is localization, not
    #    correctness verification.)
    return FailureStage.NONE, "No stage-level failure detected by the localizer."
