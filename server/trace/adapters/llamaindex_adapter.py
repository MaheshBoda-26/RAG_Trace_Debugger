"""LlamaIndex adapter — event-driven trace capture (Phase 4).

Maps llama-index-core instrumentation events onto canonical trace stages:

    QueryStartEvent / QueryEndEvent          -> assembly (top-level query run)
    RetrievalStartEvent / RetrievalEndEvent  -> retrieval (RETRIEVE)
    SynthesizeStartEvent / SynthesizeEndEvent-> generation (SYNTHESIZE)
    LLMPredictEndEvent                       -> answer capture

Usage (llama-index-core >= 0.10):

    from server.trace.adapters.llamaindex_adapter import LlamaIndexTraceHandler

    handler = LlamaIndexTraceHandler(query="my query")   # before .query()
    result = query_engine.query("my query")
    trace_id = handler.query_id
    trace = handler.finalize()   # optional; also runs at GC/exit

Requires `llama-index-core` (optional dependency; imported lazily at handler
construction so this module stays importable without it). The handler uses the
global dispatcher, so it captures every query run between construction and
finalize() — create one handler per query run.
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from ..collector import StageScope, TraceContext, tracer
from ..events import Trace
from ..localize import localize_trace
from .. import store


class LlamaIndexTraceHandler:
    """Event handler bound to one trace via the global LlamaIndex dispatcher."""

    def __init__(
        self,
        query: str = "",
        *,
        query_id: Optional[str] = None,
        key_terms: Optional[list[str]] = None,
        needed_chunk_ids: Optional[list[str]] = None,
        persist: bool = True,
    ) -> None:
        try:
            from llama_index.core.instrumentation import get_dispatcher
            from llama_index.core.instrumentation.event_handlers import (
                BaseEventHandler,
            )
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "LlamaIndexTraceHandler requires llama-index-core. "
                "Install with: pip install llama-index-core"
            ) from exc

        self._persist = persist
        self._needed = list(needed_chunk_ids or [])
        self._finalized = False
        self._answer = ""
        self._context = ""
        self._ctx: TraceContext = tracer.start(
            query or "(llamaindex run)",
            query_id=query_id or f"li_{uuid.uuid4().hex[:12]}",
            key_terms=key_terms,
        )
        # LIFO stacks of open stages per canonical stage name.
        self._open: dict[str, list[StageScope]] = {}

        outer = self

        class _EventHandler(BaseEventHandler):
            def handle(self, event: Any) -> None:
                try:
                    outer._on_event(event)
                except Exception:
                    pass  # never break the host pipeline on tracing errors

        self._handler = _EventHandler()
        self._dispatcher = get_dispatcher()
        self._dispatcher.add_event_handler(self._handler)

    # ---- event mapping -------------------------------------------------------
    def _on_event(self, event: Any) -> None:
        name = type(event).__name__

        if name == "QueryStartEvent":
            self._push("assembly", {"query": str(getattr(event, "query", ""))[:400]})
        elif name == "RetrievalStartEvent":
            self._push("retrieval", {"query": str(getattr(event, "str_or_query_bundle", ""))[:400]})
        elif name == "SynthesizeStartEvent":
            self._push("generation", {"query": str(getattr(event, "query", ""))[:400]})
        elif name == "RetrievalEndEvent":
            scope = self._pop("retrieval")
            if scope is None:
                return
            nodes = list(getattr(event, "nodes", None) or [])
            docs = [
                {
                    "doc_id": str(getattr(n, "id_", "node") or "node"),
                    "text": (getattr(n, "text", "") or "")[:300],
                    "score": getattr(n, "score", None),
                }
                for n in nodes[:20]
            ]
            scope.set(output={"documents": docs, "count": len(docs)})
            if not self._context:
                self._context = "\n".join(d["text"] for d in docs)
            scope.end()
        elif name == "LLMPredictEndEvent":
            out = getattr(event, "output", None)
            text = getattr(out, "text", None) or (str(out) if out else "")
            if text and not self._answer:
                self._answer = str(text)
        elif name == "SynthesizeEndEvent":
            scope = self._pop("generation")
            if scope is not None:
                response = getattr(event, "response", None)
                text = str(response) if response is not None else ""
                scope.set(output={"answer": text or self._answer})
                scope.end()
            if not self._answer:
                response = getattr(event, "response", None)
                if response is not None:
                    self._answer = str(response)
        elif name == "QueryEndEvent":
            scope = self._pop("assembly")
            if scope is not None:
                response = getattr(event, "response", None)
                scope.set(output={"response": str(response)[:400] if response else ""})
                scope.end()
            if response := getattr(event, "response", None):
                if not self._answer:
                    self._answer = str(response)
        # Embedding*/chunking/other events are intentionally ignored.

    def _push(self, stage: str, input_payload: dict) -> None:
        self._open.setdefault(stage, []).append(
            self._ctx.begin_stage(stage, input=input_payload)
        )

    def _pop(self, stage: str) -> Optional[StageScope]:
        stack = self._open.get(stage)
        return stack.pop() if stack else None

    # ---- lifecycle -----------------------------------------------------------
    @property
    def query_id(self) -> str:
        return self._ctx.query_id

    def finalize(self) -> Optional[Trace]:
        """Finish + localize + persist the trace (idempotent)."""
        if self._finalized:
            return self._ctx.trace
        self._finalized = True
        try:  # detach so later query runs don't append to this trace
            self._dispatcher.remove_event_handler(self._handler)
        except Exception:
            pass
        # Close any stages left open by an aborted run.
        for stack in self._open.values():
            for scope in stack:
                scope.end(status=scope.event.status, error=scope.event.error)
        self._open.clear()

        trace = self._ctx.finish(answer=self._answer, final_context=self._context)
        trace.framework = "llamaindex"
        trace.needed_chunk_ids = list(self._needed)
        indicated, reason = localize_trace(trace, needed_chunk_ids=self._needed or None)
        trace.indicated_failure = indicated
        trace.failure_reason = reason
        if self._persist:
            store.save(trace)
        return trace

    def __del__(self) -> None:
        try:
            self.finalize()
        except Exception:
            pass


__all__ = ["LlamaIndexTraceHandler"]
