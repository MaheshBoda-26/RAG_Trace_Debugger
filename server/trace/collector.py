"""The trace collector — the framework-agnostic core (PRD NFR).

Any pipeline stage calls `ctx.stage(name)`; the collector captures inputs,
outputs, candidate scores, kept/dropped, latency, and timestamps automatically.
Stages never touch the underlying store or schema directly.

Design notes
------------
- Per-query context: `tracer.start(query_id, query, key_terms=...)`.
- Stage capture: `with ctx.stage("retrieval", input={...}) as s: s.set(...)`.
- Honest overhead: the collector times *its own* bookkeeping (serialization,
  list appends, datetime calls) into `trace_overhead_ms`, separate from the
  `duration_ms` of each stage. The reported overhead is therefore the real cost
  tracing added — not an assumption (PRD §7).
- Latency uses perf_counter (monotonic); timestamps use UTC datetimes.
"""
from __future__ import annotations

import time
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator, Optional

from .events import (
    Candidate,
    FailureStage,
    StageEvent,
    StageName,
    StageStatus,
    Trace,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_query_id() -> str:
    return f"q_{uuid.uuid4().hex[:12]}"


class StageScope:
    """The object yielded by `ctx.stage(...)`. Stages call `.set(...)` on it."""

    def __init__(self, event: StageEvent, context: Optional["TraceContext"] = None) -> None:
        self._event = event
        self._context = context
        self._stage_start = time.perf_counter()
        self._ended = False

    def end(
        self,
        *,
        status: StageStatus = StageStatus.OK,
        error: Optional[str] = None,
    ) -> None:
        """Close the stage explicitly (SDK/adapter API).

        Equivalent to exiting the `ctx.stage(...)` context manager. Idempotent.
        """
        if self._ended:
            return
        self._ended = True
        bk_start = time.perf_counter()
        self._event.ended_at = _utcnow()
        self._event.duration_ms = (time.perf_counter() - self._stage_start) * 1000.0
        self._event.status = status
        self._event.error = error
        if self._context is not None:
            self._context._trace.stages.append(self._event)
            self._context._stage_overhead_ms += (time.perf_counter() - bk_start) * 1000.0

    # ---- mutators a stage calls inside the `with` block --------------------
    def set(self, **kwargs: Any) -> "StageScope":
        """Set per-stage fields.

        Recognized keys:
          input/output  -> dicts merged into the event
          candidates    -> list[dict|Candidate]; replaces event.candidates
          kept          -> list of chunk_ids kept by rerank
          dropped       -> list of chunk_ids dropped by rerank
          meta          -> dict merged into event.meta
          Any other key -> stored into event.output (so custom outputs work).
        """
        for key, value in kwargs.items():
            if key == "input":
                self._event.input.update(value or {})
            elif key == "output":
                self._event.output.update(value or {})
            elif key == "candidates":
                self._event.candidates = [_to_candidate(c) for c in (value or [])]
            elif key == "kept":
                _apply_kept_dropped(self._event, kept=value)
            elif key == "dropped":
                _apply_kept_dropped(self._event, dropped=value)
            elif key == "meta":
                self._event.meta.update(value or {})
            else:
                self._event.output[key] = value
        return self

    @property
    def event(self) -> StageEvent:
        return self._event


def _to_candidate(c: Any) -> Candidate:
    if isinstance(c, Candidate):
        return c
    if isinstance(c, dict):
        return Candidate(**c)
    raise TypeError(f"candidate must be a Candidate or dict, got {type(c)!r}")


def _apply_kept_dropped(
    event: StageEvent,
    *,
    kept: Optional[list[str]] = None,
    dropped: Optional[list[str]] = None,
) -> None:
    """Annotate candidates with kept/dropped + the stage that dropped them.

    Used by the rerank stage to record FR3 (kept vs dropped + scores).
    """
    stage_name = event.stage.value
    kept_set = set(kept or [])
    dropped_set = set(dropped or [])
    for cand in event.candidates:
        if cand.chunk_id in dropped_set:
            cand.kept = False
            cand.dropped_at = stage_name
        elif cand.chunk_id in kept_set:
            cand.kept = True
            cand.dropped_at = None


class Tracer:
    """Factory for per-query trace contexts (start a trace, get a TraceContext)."""

    def start(
        self,
        query: str,
        *,
        query_id: Optional[str] = None,
        key_terms: Optional[list[str]] = None,
    ) -> "TraceContext":
        return TraceContext(query=query, query_id=query_id, key_terms=key_terms)


class TraceContext:
    """A live, in-progress trace for one query."""

    def __init__(
        self,
        query: str,
        *,
        query_id: Optional[str] = None,
        key_terms: Optional[list[str]] = None,
    ) -> None:
        self._trace = Trace(
            query_id=query_id or _new_query_id(),
            query=query,
            created_at=_utcnow(),
            key_terms=list(key_terms or []),
        )
        self._stage_overhead_ms: float = 0.0
        self._start_perf = time.perf_counter()

    @property
    def trace(self) -> Trace:
        return self._trace

    @property
    def query_id(self) -> str:
        return self._trace.query_id

    @property
    def key_terms(self) -> list[str]:
        return self._trace.key_terms

    def begin_stage(
        self,
        name: StageName | str,
        *,
        input: Optional[dict[str, Any]] = None,
    ) -> StageScope:
        """Open a stage without a `with` block (SDK/adapter API).

        Pair with `scope.end(...)` (or `scope.end(status=..., error=...)`) when
        the start and end live in different callbacks, e.g. framework adapters.
        """
        stage_name = StageName(name)
        bk_start = time.perf_counter()
        event = StageEvent(
            stage=stage_name,
            started_at=_utcnow(),
            input=dict(input or {}),
        )
        self._stage_overhead_ms += (time.perf_counter() - bk_start) * 1000.0
        return StageScope(event, context=self)

    @contextmanager
    def stage(
        self,
        name: StageName | str,
        *,
        input: Optional[dict[str, Any]] = None,
    ) -> Iterator[StageScope]:
        """Context manager wrapping one pipeline stage.

        Captures start/end timestamps, latency (ms), and any fields the stage
        sets via the yielded StageScope. Exceptions are recorded with status
        'error' and re-raised.
        """
        scope = self.begin_stage(name, input=input)
        status = StageStatus.OK
        error: Optional[str] = None
        try:
            yield scope
        except Exception as exc:  # record then re-raise
            status = StageStatus.ERROR
            error = f"{type(exc).__name__}: {exc}"
            raise
        finally:
            scope.end(status=status, error=error)

    def finish(self, answer: str = "", final_context: str = "") -> Trace:
        """Finalize the trace: denormalize answer/context, compute totals.

        Note: localization is NOT run here — it needs the corpus/ground-truth
        context the caller has. The pipeline calls localize_trace() on the
        result. This keeps the collector pure (no domain knowledge).
        """
        bk_start = time.perf_counter()
        self._trace.answer = answer
        self._trace.final_context = final_context
        self._trace.total_duration_ms = (time.perf_counter() - self._start_perf) * 1000.0
        # Overhead = the bookkeeping time we accumulated across stages. We do
        # NOT subtract anything; this is the literal cost tracing added.
        self._trace.trace_overhead_ms = round(self._stage_overhead_ms, 3)
        self._trace.total_duration_ms = round(self._trace.total_duration_ms, 3)
        overhead = (time.perf_counter() - bk_start) * 1000.0
        self._trace.trace_overhead_ms = round(self._trace.trace_overhead_ms + overhead, 3)
        return self._trace


# A module-level singleton tracer — pipelines use this.
tracer = Tracer()


__all__ = ["Tracer", "TraceContext", "StageScope", "tracer"]
