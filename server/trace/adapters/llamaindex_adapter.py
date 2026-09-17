"""LlamaIndex adapter — maps LlamaIndex instrumentation spans to trace stages.

Mapping (llama-index >= 0.10 core instrumentation):

    EventSpan: RETRIEVE / RetrievalStart-End   -> retrieval
    EventSpan: SYNTHESIZE / LLMPredict         -> generation
    QUERY (top-level query run)                -> assembly

Usage:

    from server.trace.adapters.llamaindex_adapter import LlamaIndexTraceHandler

    handler = LlamaIndexTraceHandler(query="my query")
    result = query_engine.query("my query")
    trace_id = handler.query_id
    handler.finalize()   # optional; also runs on GC

Requires `llama-index-core` (optional dependency; imported lazily at handler
construction so this module stays importable without it).
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from ..collector import TraceContext, tracer
from ..events import StageStatus, Trace
from ..localize import localize_trace
from .. import store

# Canonical stage mapping by LlamaIndex event type / span type.
_SPAN_TO_STAGE = {
    "retrieve": "retrieval",
    "RETRIEVE": "retrieval",
    "synthesize": "generation",
    "SYNTHESIZE": "generation",
    "llm": "generation",
    "LLM": "generation",
    "query": "assembly",
    "QUERY": "assembly",
    "embed": "retrieval",
    "EMBED": "retrieval",
}


def _stage_for(span: Any) -> Optional[str]:
    stype = getattr(span, "span_type", None)
    stype = getattr(stype, "value", stype)
    name = str(stype or getattr(span, "event_type", "") or "")
    name = getattr(name, "value", name)
    return _SPAN_TO_STAGE.get(str(name))


class LlamaIndexTraceHandler:
    """Registers a llama-index DispatcherSpanHandler bound to one trace.

    Construction imports llama_index.core (raising a helpful ImportError when
    the optional dependency is missing).
    """

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
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "LlamaIndexTraceHandler requires llama-index-core. "
                "Install with: pip install llama-index-core"
            ) from exc

        try:
            from llama_index.core.instrumentation.event_handlers import (
                BaseEventHandler,
            )
            from llama_index.core.instrumentation.span_handlers import (
                SimpleSpanHandler,
            )
        except ImportError as exc:  # pragma: no cover
            raise ImportError(
                "llama-index-core does not expose instrumentation handlers; "
                "upgrade to llama-index-core >= 0.10."
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
        self._spans: dict[str, Any] = {}
        self._root_span_id: Optional[str] = None

        # ---- span handler ---------------------------------------------------
        outer = self

        class _SpanHandler(SimpleSpanHandler):
            """SimpleSpanHandler drives on_span_start/on_span_end for us."""

            def __init__(self) -> None:
                super().__init__()
                self.open_spans: dict[Any, Any] = {}

            def on_span_start(self, span: Any) -> None:
                stage = _stage_for(span)
                if stage is None:
                    return
                try:
                    scope = outer._ctx.begin_stage(stage, input={})
                except Exception:
                    return
                self.open_spans[span.id_] = (scope, stage)
                if outer._root_span_id is None and stage == "assembly":
                    outer._root_span_id = span.id_

            def on_span_end(self, span: Any) -> None:
                entry = self.open_spans.pop(span.id_, None)
                if entry is None:
                    return
                scope, stage = entry
                try:
                    payload = getattr(span, "payload", {}) or {}
                    if stage == "generation":
                        out = payload.get("response") or payload.get("completion")
                        if isinstance(out, str) and out:
                            outer._answer = out
                    if stage == "retrieval":
                        nodes = payload.get("nodes") or []
                        docs = [
                            {
                                "doc_id": getattr(n, "id_", "node"),
                                "text": (getattr(n, "text", "") or "")[:300],
                                "score": getattr(n, "score", None),
                            }
                            for n in list(nodes)[:20]
                        ]
                        scope.set(output={"documents": docs, "count": len(docs)})
                    scope.end()
                except Exception:
                    scope.end()

            def on_span_error(self, error: Exception, span: Any) -> None:
                entry = self.open_spans.pop(getattr(span, "id_", None), None)
                if entry is None:
                    return
                scope, _stage = entry
                scope.end(status=StageStatus.ERROR, error=str(error))

        # ---- event handler (answers) ----------------------------------------
        class _EventHandler(BaseEventHandler):
            def handle(self, event: Any) -> None:
                cls = type(event).__name__
                if cls in ("LLMCompletionEndEvent", "LLMPredictEndEvent", "SynthesizeEndEvent"):
                    response = getattr(event, "response", None) or getattr(event, "completion", None)
                    if isinstance(response, str) and response:
                        outer._answer = response
                if cls == "RetrievalEndEvent" and not outer._context:
                    nodes = getattr(event, "nodes", []) or []
                    outer._context = " ".join(
                        (getattr(n, "text", "") or "")[:300] for n in list(nodes)[:10]
                    )

        self._span_handler = _SpanHandler()
        self._event_handler = _EventHandler()
        dispatcher = get_dispatcher()
        self._dispatcher = dispatcher
        dispatcher.add_span_handler(self._span_handler)
        dispatcher.add_event_handler(self._event_handler)

    # -- lifecycle -----------------------------------------------------------
    @property
    def query_id(self) -> str:
        return self._ctx.query_id

    def finalize(self) -> Optional[Trace]:
        """Finish + localize + persist the trace (idempotent)."""
        if self._finalized:
            return self._ctx.trace
        self._finalized = True
        try:  # detach so later runs don't append to this trace
            self._dispatcher.remove_span_handler(self._span_handler)
            self._dispatcher.remove_event_handler(self._event_handler)
        except Exception:
            pass
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
