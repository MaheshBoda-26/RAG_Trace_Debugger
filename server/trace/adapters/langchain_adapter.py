"""LangChain adapter — TracingCallbackHandler (Phase 4).

Maps LangChain callback events onto the canonical trace stages:

    on_retriever_start/end  -> retrieval
    on_llm_start/end        -> generation
    on_chain_start/end      -> assembly (outermost chain)
    on_tool_start/end       -> generation (tools often hide the LLM call)

Usage (langchain-core >= 0.1):

    from server.trace.adapters.langchain_adapter import TracingCallbackHandler

    handler = TracingCallbackHandler(query="my query")
    result = chain.invoke(inputs, config={"callbacks": [handler]})
    trace_id = handler.query_id          # shown in the dashboard
    handler.finalize()                   # optional; also runs at GC/exit

Requires `langchain-core` (optional dependency). The import happens when the
handler is instantiated, so this module stays importable without it.
"""
from __future__ import annotations

import uuid
from typing import Any, Optional

from ..collector import TraceContext, tracer
from ..events import StageStatus, Trace
from ..localize import localize_trace
from .. import store


def create_handler(
    query: str = "",
    *,
    query_id: Optional[str] = None,
    key_terms: Optional[list[str]] = None,
    needed_chunk_ids: Optional[list[str]] = None,
    persist: bool = True,
):
    """Build a real `BaseCallbackHandler` subclass bound to one trace.

    Kept as a separate factory so the class definition can reference
    BaseCallbackHandler directly (imported lazily).
    """
    from langchain_core.callbacks import BaseCallbackHandler

    class _Handler(BaseCallbackHandler):
        def __init__(self) -> None:
            self._ctx: TraceContext = tracer.start(
                query or "(langchain run)",
                query_id=query_id or f"lc_{uuid.uuid4().hex[:12]}",
                key_terms=key_terms,
            )
            self._persist = persist
            self._needed = list(needed_chunk_ids or [])
            self._finalized = False
            self._answer = ""
            self._context = ""
            self._chain_depth = 0
            self._rc: Any = None
            self._gen: Any = None
            self._asm: Any = None
            self._tool: Any = None

        # -- lifecycle -------------------------------------------------------
        @property
        def query_id(self) -> str:
            return self._ctx.query_id

        def finalize(self) -> Optional[Trace]:
            """Finish + localize + persist the trace (idempotent)."""
            if self._finalized:
                return self._ctx.trace
            self._finalized = True
            trace = self._ctx.finish(answer=self._answer, final_context=self._context)
            trace.framework = "langchain"
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

        # -- retrieval -------------------------------------------------------
        def on_retriever_start(self, serialized: Any, query: Any, **kwargs: Any) -> None:
            self._rc = self._ctx.begin_stage("retrieval", input={"query": str(query)[:400]})

        def on_retriever_end(self, documents: Any, **kwargs: Any) -> None:
            if self._rc is None:
                return
            docs = []
            for d in list(documents or [])[:20]:
                text = getattr(d, "page_content", "") or str(d)
                meta = getattr(d, "metadata", {}) or {}
                docs.append(
                    {
                        "doc_id": str(meta.get("doc_id", meta.get("source", "doc"))),
                        "text": text[:300],
                    }
                )
            self._rc.set(output={"documents": docs, "count": len(docs)})
            self._rc.end()
            self._rc = None
            if not self._context:
                self._context = "\n".join(d["text"] for d in docs)

        def on_retriever_error(self, error: BaseException, **kwargs: Any) -> None:
            if self._rc is not None:
                self._rc.end(status=StageStatus.ERROR, error=str(error))
                self._rc = None

        # -- generation ------------------------------------------------------
        def on_llm_start(self, serialized: Any, prompts: Any, **kwargs: Any) -> None:
            preview = str(prompts[0])[:400] if prompts else ""
            self._gen = self._ctx.begin_stage("generation", input={"prompt_preview": preview})

        def on_llm_end(self, response: Any, **kwargs: Any) -> None:
            text = ""
            try:
                text = response.generations[0][0].text
            except (AttributeError, IndexError, KeyError):
                text = str(response)
            self._answer = text
            if self._gen is not None:
                self._gen.set(output={"answer": text})
                self._gen.end()
                self._gen = None

        def on_llm_error(self, error: BaseException, **kwargs: Any) -> None:
            if self._gen is not None:
                self._gen.end(status=StageStatus.ERROR, error=str(error))
                self._gen = None

        def on_tool_start(self, serialized: Any, tool_name: str, **kwargs: Any) -> None:
            self._tool = self._ctx.begin_stage("generation", input={"tool": str(tool_name)})

        def on_tool_end(self, output: Any, **kwargs: Any) -> None:
            if self._tool is not None:
                self._tool.set(output={"result": str(output)[:400]})
                self._tool.end()
                self._tool = None

        def on_tool_error(self, error: BaseException, **kwargs: Any) -> None:
            if self._tool is not None:
                self._tool.end(status=StageStatus.ERROR, error=str(error))
                self._tool = None

        # -- assembly (outermost chain) ---------------------------------------
        def on_chain_start(self, serialized: Any, inputs: Any, **kwargs: Any) -> None:
            self._chain_depth += 1
            if self._chain_depth == 1:
                # Capture the assembled context if the chain exposes one.
                ctx_text = ""
                if isinstance(inputs, dict):
                    ctx_text = str(
                        inputs.get("context")
                        or inputs.get("input_documents")
                        or ""
                    )[:2000]
                if ctx_text:
                    self._context = ctx_text
                self._asm = self._ctx.begin_stage("assembly", input={"inputs": str(inputs)[:400]})

        def on_chain_end(self, outputs: Any, **kwargs: Any) -> None:
            self._chain_depth -= 1
            if self._chain_depth == 0:
                if self._asm is not None:
                    self._asm.set(output={"outputs": str(outputs)[:400]})
                    self._asm.end()
                    self._asm = None
                # Chains without an LLM callable still produce a final answer.
                if not self._answer:
                    if isinstance(outputs, str):
                        self._answer = outputs
                    elif isinstance(outputs, dict):
                        for key in ("output_text", "text", "answer", "output"):
                            if isinstance(outputs.get(key), str):
                                self._answer = outputs[key]
                                break

        def on_chain_error(self, error: BaseException, **kwargs: Any) -> None:
            self._chain_depth = max(0, self._chain_depth - 1)
            if self._asm is not None:
                self._asm.end(status=StageStatus.ERROR, error=str(error))
                self._asm = None

        # -- noise we intentionally ignore ------------------------------------
        def on_llm_new_token(self, token: str, **kwargs: Any) -> None:
            pass

        def on_agent_action(self, *args: Any, **kwargs: Any) -> None:
            pass

        def on_agent_finish(self, *args: Any, **kwargs: Any) -> None:
            pass

    return _Handler()


# Convenience alias matching the roadmap naming; instantiating it requires
# langchain-core (factory call).
def TracingCallbackHandler(*args: Any, **kwargs: Any):
    """TracingCallbackHandler(...) -> a fresh LangChain callback handler."""
    return create_handler(*args, **kwargs)


__all__ = ["TracingCallbackHandler", "create_handler"]
