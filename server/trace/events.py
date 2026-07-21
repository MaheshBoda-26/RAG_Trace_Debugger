"""Trace event schema — the canonical source of truth for a RAG trace.

This file defines the data shapes captured by the trace collector and read by
the dashboard. It is intentionally framework-agnostic: any pipeline stage can
emit these events by calling the collector (see collector.py), regardless of
the underlying RAG framework.

The TypeScript dashboard mirrors these types by hand in
web/src/types/trace.ts — see the header comment there.
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class StageName(str, Enum):
    """The five instrumented RAG pipeline stages (PRD §4)."""
    QUERY_REWRITE = "query_rewrite"
    RETRIEVAL = "retrieval"
    RERANK = "rerank"
    ASSEMBLY = "assembly"
    GENERATION = "generation"


class FailureStage(str, Enum):
    """Where the localizer thinks a bad answer came from (FR7).

    'none' means no failure was detected. This is a diagnostic aid, not a
    guaranteed verdict (see PRD §7 / §9).
    """
    NONE = "none"
    QUERY_REWRITE = "query_rewrite"
    RETRIEVAL = "retrieval"
    RERANK = "rerank"
    ASSEMBLY = "assembly"
    GENERATION = "generation"


class StageStatus(str, Enum):
    OK = "ok"
    ERROR = "error"


class Candidate(BaseModel):
    """One retrieved chunk, with its similarity / relevance scores.

    `kept` is True when the chunk survived reranking into the final context.
    """
    doc_id: str
    chunk_id: str
    text: str
    dense_score: Optional[float] = None
    bm25_score: Optional[float] = None
    fused_score: Optional[float] = None
    rerank_score: Optional[float] = None
    rank: Optional[int] = None
    kept: bool = True
    dropped_at: Optional[str] = None  # stage name where it was dropped, if any


class StageEvent(BaseModel):
    """A single stage's captured event within a trace.

    Every stage records: status, inputs, outputs, latency (ms), and timestamps.
    Per-stage fields:
      - retrieval.candidates: ALL candidate chunks + scores (FR2)
      - rerank.candidates:    same list, annotated with kept/dropped + rerank
                              scores (FR3)
      - assembly.output.context: the exact final context string (FR4)
      - generation.output.answer: the model's raw generated answer (FR5)
    """
    stage: StageName
    status: StageStatus = StageStatus.OK
    error: Optional[str] = None

    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_ms: float = 0.0

    input: dict[str, Any] = Field(default_factory=dict)
    output: dict[str, Any] = Field(default_factory=dict)

    candidates: list[Candidate] = Field(default_factory=list)
    # Free-form metadata for anything stage-specific that doesn't fit above.
    meta: dict[str, Any] = Field(default_factory=dict)


class Trace(BaseModel):
    """One record per query, keyed by query id (FR / trace store).

    Persists to data/traces/<query_id>.json as a single JSON object.
    """
    query_id: str
    query: str
    created_at: datetime

    # The final answer the user saw.
    answer: str = ""

    # The exact context string passed to the LLM (FR4), denormalized here so
    # the dashboard list view can show a short preview without loading stages.
    final_context: str = ""

    # Localizer output (FR7).
    indicated_failure: FailureStage = FailureStage.NONE
    failure_reason: str = ""

    # Key terms the localizer / eval use to judge whether the answer is right.
    key_terms: list[str] = Field(default_factory=list)

    # Eval bookkeeping (filled in by the eval runner, not the pipeline).
    ground_truth_failure: Optional[FailureStage] = None
    expected_answer: Optional[str] = None
    localization_correct: Optional[bool] = None

    stages: list[StageEvent] = Field(default_factory=list)

    # Overhead the tracing layer itself added to this query (NFR: low overhead).
    trace_overhead_ms: float = 0.0
    total_duration_ms: float = 0.0


class TraceSummary(BaseModel):
    """Compact projection of a Trace for list views."""
    query_id: str
    query: str
    created_at: datetime
    indicated_failure: FailureStage
    answer_preview: str
    stage_count: int
    total_duration_ms: float


def summarize(trace: Trace) -> TraceSummary:
    return TraceSummary(
        query_id=trace.query_id,
        query=trace.query,
        created_at=trace.created_at,
        indicated_failure=trace.indicated_failure,
        answer_preview=(trace.answer[:160] + "…") if len(trace.answer) > 160 else trace.answer,
        stage_count=len(trace.stages),
        total_duration_ms=trace.total_duration_ms,
    )
