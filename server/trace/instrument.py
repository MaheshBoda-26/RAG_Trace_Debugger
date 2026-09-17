"""Instrumentation SDK — auto-instrument any Python RAG pipeline (Phase 4).

Zero-framework-dependency core (wraps the trace collector, never rewrites it):

    from server.trace.instrument import InstrumentedPipeline, traced_stage

    with InstrumentedPipeline(query="test") as pipe:
        @pipe.stage("retrieval")
        def retrieve(q):
            return vector_store.search(q)

        @pipe.stage("generation")
        def generate(context):
            return llm.complete(context)

        docs = retrieve(query)
        answer = generate(docs)
    # on exit the trace is localized (when signals allow) and saved

`traced_stage` can also decorate standalone functions; when called inside an
active InstrumentedPipeline they attach to its trace, and with no active
pipeline they record the call to a fallback trace that is saved on process
exit (best-effort, daemon thread).

Framework adapters (LangChain / LlamaIndex) live in server/trace/adapters/.
"""
from __future__ import annotations

import functools
import threading
import time
import uuid
from typing import Any, Callable, Optional, TypeVar

from .collector import TraceContext, tracer
from .events import FailureStage, StageName, Trace
from .localize import localize_trace
from . import store

F = TypeVar("F", bound=Callable[..., Any])

# Stage names allowed by the canonical schema; custom names are also accepted
# by the collector, but the five canonical ones keep localizer coverage.
CANONICAL_STAGES = tuple(s.value for s in StageName)


def _summarize(value: Any, limit: int = 400) -> Any:
    """Best-effort JSON-safe summary of a stage input/output value."""
    try:
        if value is None or isinstance(value, (bool, int, float, str)):
            out: Any = value
        elif isinstance(value, dict):
            out = {k: _summarize(v, limit) for k, v in list(value.items())[:10]}
        elif isinstance(value, (list, tuple, set)):
            seq = list(value)[:10]
            out = [_summarize(v, limit) for v in seq]
        else:
            out = repr(value)[:limit]
        if isinstance(out, str) and len(out) > limit:
            out = out[:limit] + "…"
        return out
    except Exception:
        return repr(value)[:limit]


class _StageCapture:
    """Internal: active pipeline + current stage context for decorated calls."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._pipeline: Optional["InstrumentedPipeline"] = None

    @property
    def pipeline(self) -> Optional["InstrumentedPipeline"]:
        with self._lock:
            return self._pipeline

    def set(self, pipeline: Optional["InstrumentedPipeline"]) -> None:
        with self._lock:
            self._pipeline = pipeline

    def push(self, pipeline: "InstrumentedPipeline") -> Optional["InstrumentedPipeline"]:
        """Bind a pipeline if none is active; returns the previous one."""
        with self._lock:
            prev = self._pipeline
            self._pipeline = pipeline
            return prev

    def pop(self, prev: Optional["InstrumentedPipeline"]) -> None:
        with self._lock:
            self._pipeline = prev


# Module-level "current pipeline" registry (thread-safe; one active pipeline
# per thread of control — nested with-blocks reuse the outermost trace).
_active = _StageCapture()


class InstrumentedPipeline:
    """Context manager that owns one trace for a third-party pipeline.

    Emits StageEvents through the existing collector (`tracer.start` +
    `ctx.stage`), so SDK traces are byte-compatible with native ones and land
    in the same store/dashboard.
    """

    def __init__(
        self,
        query: str = "",
        *,
        query_id: Optional[str] = None,
        key_terms: Optional[list[str]] = None,
        framework: str = "custom",
        needed_chunk_ids: Optional[list[str]] = None,
        persist: bool = True,
        localize: bool = True,
    ) -> None:
        self.query = query
        self.framework = framework
        self.persist = persist
        self.localize = localize
        self._needed_chunk_ids = list(needed_chunk_ids or [])
        self._ctx: Optional[TraceContext] = None
        self._trace: Optional[Trace] = None
        self._query_id = query_id
        self._key_terms = key_terms
        self._answer = ""
        self._final_context = ""
        self._prev_pipeline: Optional[InstrumentedPipeline] = None

    # ---- context manager -----------------------------------------------------
    def __enter__(self) -> "InstrumentedPipeline":
        self._ctx = tracer.start(
            self.query or "(sdk pipeline)",
            query_id=self._query_id or f"sdk_{uuid.uuid4().hex[:12]}",
            key_terms=self._key_terms,
        )
        self._ctx.trace.final_context = ""  # explicit default
        self._prev_pipeline = _active.push(self)
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        _active.pop(self._prev_pipeline)
        assert self._ctx is not None
        self._trace = self._ctx.finish(answer=self._answer, final_context=self._final_context)
        trace = self._trace
        trace.framework = self.framework
        if self.localize:
            indicated, reason = localize_trace(
                trace, needed_chunk_ids=self._needed_chunk_ids or None
            )
            trace.indicated_failure = indicated
            trace.failure_reason = reason
        if self.persist:
            store.save(trace)
        # Do not suppress exceptions from the wrapped pipeline body.
        return False

    # ---- public API ----------------------------------------------------------
    @property
    def trace(self) -> Optional[Trace]:
        return self._trace

    @property
    def query_id(self) -> str:
        assert self._ctx is not None, "query_id available inside/after the with block"
        return self._ctx.query_id

    def set_answer(self, answer: str) -> None:
        """Record the pipeline's final answer (shown in the dashboard)."""
        self._answer = answer or ""

    def set_context(self, context: str) -> None:
        """Record the final assembled context passed to the LLM (FR4)."""
        self._final_context = context or ""

    def stage(self, name: str) -> Callable[[F], F]:
        """Decorator form: `@pipe.stage("retrieval")` inside the with block."""

        def decorator(fn: F) -> F:
            @functools.wraps(fn)
            def wrapper(*args: Any, **kwargs: Any) -> Any:
                return self.run_stage(name, fn, args, kwargs)

            return wrapper  # type: ignore[return-value]

        return decorator

    def run_stage(self, name: str, fn: Callable[..., Any], args: Any, kwargs: Any) -> Any:
        """Run fn as a traced stage (used by the decorator and the adapters)."""
        assert self._ctx is not None, "run_stage requires an active with-block"
        safe_input = {
            "args": [_summarize(a) for a in args[:3]],
            "kwargs": {k: _summarize(v) for k, v in list(kwargs.items())[:5]},
        }
        with self._ctx.stage(name, input=safe_input) as scope:
            result = fn(*args, **kwargs)
            scope.set(output={"result": _summarize(result)})
            # Convenience auto-capture: a stage named 'generation' whose result
            # is a string updates the trace's answer if none was set.
            if name == StageName.GENERATION.value and isinstance(result, str) and not self._answer:
                self.set_answer(result)
            if name == StageName.ASSEMBLY.value and isinstance(result, str) and not self._final_context:
                self.set_context(result)
            return result


def traced_stage(name: str) -> Callable[[F], F]:
    """Standalone decorator: trace a function into the active pipeline.

    Inside `with InstrumentedPipeline(...)` the call attaches to that trace.
    Outside any pipeline it appends to a module-level fallback trace that is
    persisted when the process exits (atexit, best-effort daemon thread).
    """

    def decorator(fn: F) -> F:
        @functools.wraps(fn)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            pipeline = _active.pipeline
            if pipeline is not None:
                return pipeline.run_stage(name, fn, args, kwargs)
            return _fallback_stage(name, fn, args, kwargs)

        return wrapper  # type: ignore[return-value]

    return decorator


# ---- fallback trace for decorated calls outside any pipeline -----------------
_fallback_lock = threading.Lock()
_fallback_ctx: Optional[TraceContext] = None
_fallback_registered = False


def _get_fallback_ctx() -> TraceContext:
    global _fallback_ctx, _fallback_registered
    with _fallback_lock:
        if _fallback_ctx is None:
            _fallback_ctx = tracer.start("(sdk fallback trace)")
        if not _fallback_registered:
            import atexit

            atexit.register(_save_fallback)
            _fallback_registered = True
        return _fallback_ctx


def _fallback_stage(name: str, fn: Callable[..., Any], args: Any, kwargs: Any) -> Any:
    ctx = _get_fallback_ctx()
    safe_input = {
        "args": [_summarize(a) for a in args[:3]],
        "kwargs": {k: _summarize(v) for k, v in list(kwargs.items())[:5]},
    }
    with ctx.stage(name, input=safe_input) as scope:
        result = fn(*args, **kwargs)
        scope.set(output={"result": _summarize(result)})
        return result


def _save_fallback() -> None:
    global _fallback_ctx
    if _fallback_ctx is None:
        return
    with _fallback_lock:
        ctx, _fallback_ctx = _fallback_ctx, None
    if ctx is None or not ctx.trace.stages:
        return
    trace = ctx.finish()
    trace.indicated_failure = FailureStage.NONE
    trace.failure_reason = "SDK fallback trace (decorated calls outside a pipeline)."
    try:
        store.save(trace)
    except Exception:
        pass  # atexit best-effort


__all__ = [
    "InstrumentedPipeline",
    "traced_stage",
    "CANONICAL_STAGES",
]
