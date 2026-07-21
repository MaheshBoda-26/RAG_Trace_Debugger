"""Trace API routes.

GET  /api/traces            list summaries (optional ?failure=<stage>)
GET  /api/traces/{query_id} full trace
POST /api/query             run one ad-hoc query -> trace (and persist)
DELETE /api/traces          clear all stored traces
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..rag.pipeline import run_query
from ..trace import FailureStage, store
from ..trace.events import Trace

router = APIRouter(prefix="/api", tags=["traces"])


class QueryRequest(BaseModel):
    """Body for POST /api/query."""
    query: str
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
    trace = run_query(
        req.query,
        key_terms=req.key_terms,
        needed_chunk_ids=req.needed_chunk_ids,
        retrieval_k=req.retrieval_k or 20,
        rerank_k=req.rerank_k or 5,
        context_max_chars=req.context_max_chars or 1200,
        mock_drift=req.mock_drift,
    )
    return trace.model_dump(mode="json")


@router.delete("/traces")
def clear_traces():
    count = store.clear()
    return {"deleted": count}
