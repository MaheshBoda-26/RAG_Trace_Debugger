"""Framework-agnostic trace core for the RAG Trace Debugger.

Public API:
    tracer.start(query, ...) -> TraceContext
    with ctx.stage("retrieval", input=...) as s: s.set(candidates=..., kept=..., dropped=...)
    ctx.finish(answer=..., final_context=...) -> Trace
    localize_trace(trace, needed_chunk_ids=..., key_terms=...) -> (FailureStage, reason)
    store.save / store.load / store.list_summaries / store.all_traces / store.clear
"""
from .collector import TraceContext, Tracer, tracer
from .events import (
    Candidate,
    FailureStage,
    StageEvent,
    StageName,
    StageStatus,
    Trace,
    TraceSummary,
    summarize,
)
from .localize import localize_trace
from . import store

__all__ = [
    "tracer",
    "Tracer",
    "TraceContext",
    "Trace",
    "TraceSummary",
    "StageEvent",
    "StageName",
    "StageStatus",
    "FailureStage",
    "Candidate",
    "summarize",
    "localize_trace",
    "store",
]
