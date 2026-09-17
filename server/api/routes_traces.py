"""Trace API routes.

GET  /api/traces            list summaries (optional ?failure=<stage>)
GET  /api/traces/{query_id} full trace
POST /api/query             run one ad-hoc query -> trace (and persist)
POST /api/query/heal        re-run a stored trace with auto-adjusted params
DELETE /api/traces          clear all stored traces
"""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..metrics import metrics
from ..rag.auto_adjust import AdjustmentSuggestion, suggest_adjustment
from ..rag.pipeline import DEFAULT_CONTEXT_MAX_CHARS, DEFAULT_RETRIEVAL_K, DEFAULT_RERANK_K, run_query
from ..trace import FailureStage, store
from ..trace.events import Trace

router = APIRouter(prefix="/api", tags=["traces"])


class QueryRequest(BaseModel):
    """Body for POST /api/query (and /api/query/heal, which uses query_id)."""
    query: str = ""
    # Self-healing: the stored trace to heal (required for /api/query/heal).
    query_id: Optional[str] = None
    key_terms: Optional[list[str]] = None
    # For ad-hoc queries the localizer has no ground truth; callers may still
    # supply needed_chunk_ids to enable the retrieval/rerank signals.
    needed_chunk_ids: Optional[list[str]] = None
    retrieval_k: Optional[int] = None
    rerank_k: Optional[int] = None
    context_max_chars: Optional[int] = None
    mock_drift: bool = False


@router.get("/traces")
def list_traces(
    failure: Optional[FailureStage] = Query(None, description="Filter by indicated failure stage"),
    limit: Optional[int] = Query(None, ge=1, le=500),
):
    summaries = store.list_summaries(failure=failure, limit=limit)
    return [s.model_dump(mode="json") for s in summaries]


@router.get("/traces/{query_id}")
def get_trace(query_id: str):
    trace = store.load(query_id)
    if trace is None:
        raise HTTPException(status_code=404, detail={"error": "trace_not_found", "query_id": query_id})
    return trace.model_dump(mode="json")


@router.post("/query")
def post_query(req: QueryRequest):
    if not req.query.strip():
        raise HTTPException(status_code=422, detail={"error": "empty_query"})
    try:
        trace = run_query(
            req.query,
            key_terms=req.key_terms,
            needed_chunk_ids=req.needed_chunk_ids,
            retrieval_k=req.retrieval_k or DEFAULT_RETRIEVAL_K,
            rerank_k=req.rerank_k or DEFAULT_RERANK_K,
            context_max_chars=req.context_max_chars or DEFAULT_CONTEXT_MAX_CHARS,
            mock_drift=req.mock_drift,
        )
    except Exception:
        metrics.record_error()
        raise
    metrics.record_query(trace.trace_overhead_ms)
    return trace.model_dump(mode="json")


class HealResponse(BaseModel):
    original: dict[str, Any]
    healed: dict[str, Any]
    adjustment: dict[str, Any]


@router.post("/query/heal")
def post_query_heal(req: QueryRequest):
    """Self-healing loop: re-run a stored trace with auto-adjusted params.

    Accepts the same body shape as /api/query plus `query_id` of an existing
    trace. Computes an AdjustmentSuggestion from the original trace's localized
    failure stage, re-runs the query with the adjusted params, localizes the
    healed trace, persists it under a new id, and returns all three pieces.
    """
    try:
        original = store.load(req.query_id) if req.query_id else None
    except ValueError:
        original = None
    if original is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "trace_not_found", "query_id": req.query_id},
        )

    # The parameter baseline: what the original run actually used (stage input
    # echoes the effective values), falling back to the request body, then
    # pipeline defaults.
    def _stage_input_int(stage_name: str, key: str) -> Optional[int]:
        for s in original.stages:
            if s.stage.value == stage_name:
                v = s.input.get(key)
                return int(v) if isinstance(v, (int, float)) else None
        return None

    current_params = {
        "retrieval_k": _stage_input_int("retrieval", "k") or req.retrieval_k or DEFAULT_RETRIEVAL_K,
        "rerank_k": _stage_input_int("rerank", "top_k") or req.rerank_k or DEFAULT_RERANK_K,
        "context_max_chars": (
            _stage_input_int("assembly", "max_chars")
            or req.context_max_chars
            or DEFAULT_CONTEXT_MAX_CHARS
        ),
    }

    adjustment = suggest_adjustment(original.indicated_failure, current_params)
    adjusted = dict(adjustment.adjusted_params)

    healed = run_query(
        original.query,
        key_terms=original.key_terms or None,
        needed_chunk_ids=_needed_ids(original),
        retrieval_k=adjusted.get("retrieval_k", current_params["retrieval_k"]),
        rerank_k=adjusted.get("rerank_k", current_params["rerank_k"]),
        context_max_chars=adjusted.get("context_max_chars", current_params["context_max_chars"]),
        strict_grounding=bool(adjusted.get("strict_grounding", False)),
        skip_rewrite=bool(adjusted.get("skip_rewrite", False)),
        persist=True,
    )

    adjustment.applied = bool(adjusted)
    adjustment.healed_query_id = healed.query_id

    # Label the healed trace so the dashboard can show provenance.
    healed.failure_reason = (
        f"[healed from {original.query_id}: {adjustment.rationale}] "
        + (healed.failure_reason or "")
    )

    improvement = {
        "original_failure": original.indicated_failure.value,
        "healed_failure": healed.indicated_failure.value,
        "improved": healed.indicated_failure == FailureStage.NONE
        and original.indicated_failure != FailureStage.NONE,
    }

    metrics.record_query(healed.trace_overhead_ms)
    return HealResponse(
        original=original.model_dump(mode="json"),
        healed=healed.model_dump(mode="json"),
        adjustment={**adjustment.to_dict(), **improvement},
    )


def _needed_ids(trace: Trace) -> list[str]:
    """Extract needed_chunk_ids recorded on the original run's ground truth.

    Stored traces don't keep needed_chunk_ids explicitly; recover them from the
    failure_reason + ground-truth labels when available, else empty.
    """
    # ground_truth_failure-driven eval runs persist traces whose retrieval/
    # rerank stages already show what was needed; for self-healing we pass
    # through whatever eval metadata exists on the stored trace.
    needed = getattr(trace, "needed_chunk_ids", None)
    if needed:
        return list(needed)
    return []


@router.delete("/traces")
def clear_traces():
    count = store.clear()
    return {"deleted": count}
