"""Framework-agnostic trace core for the RAG Trace Debugger.

Public API:
    tracer.start(query, ...) -> TraceContext
    with ctx.stage("retrieval", input=...) as s: s.set(candidates=..., kept=..., dropped=...)
    ctx.begin_stage(...) / scope.end()      # callback-style frameworks (SDK)
    ctx.finish(answer=..., final_context=...) -> Trace
    localize_trace(trace, needed_chunk_ids=..., key_terms=...) -> (FailureStage, reason)
    store.save / store.load / store.list_summaries / store.all_traces / store.clear

Instrumentation SDK (Phase 4):
    from server.trace import InstrumentedPipeline, traced_stage
    from server.trace import adapters   # langchain_adapter, llamaindex_adapter
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
from .instrument import InstrumentedPipeline, traced_stage
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
    "InstrumentedPipeline",
    "traced_stage",
    "store",
]
