"""Focused regression tests for Phases 1-4.

Run:  .venv/bin/python -m pytest server/tests -q
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


# --------------------------------------------------------------------------- #
# Phase 1: auto-adjust suggestions
# --------------------------------------------------------------------------- #
def test_adjustment_mapping() -> None:
    from server.rag.auto_adjust import suggest_adjustment

    r = suggest_adjustment("retrieval", {"retrieval_k": 20, "rerank_k": 5, "context_max_chars": 1200})
    assert r.adjusted_params == {"retrieval_k": 25, "rerank_k": 6}

    r = suggest_adjustment("rerank", {"rerank_k": 5, "retrieval_k": 20, "context_max_chars": 1200})
    assert r.adjusted_params["rerank_k"] == 7

    r = suggest_adjustment("assembly", {"context_max_chars": 200})
    assert r.adjusted_params["context_max_chars"] == 600

    r = suggest_adjustment("generation", {})
    assert r.adjusted_params == {"strict_grounding": True}

    r = suggest_adjustment("none", {})
    assert r.adjusted_params == {}

    # Caps respected.
    r = suggest_adjustment("retrieval", {"retrieval_k": 48})
    assert r.adjusted_params["retrieval_k"] == 50


# --------------------------------------------------------------------------- #
# Phase 2: circuit breaker + rate limiter
# --------------------------------------------------------------------------- #
def test_circuit_breaker_opens_and_fails_fast() -> None:
    from server.rag.circuit_breaker import CircuitBreaker

    cb = CircuitBreaker(threshold=3, reset_seconds=30, clock=lambda: 0.0)
    calls = {"n": 0}

    def boom() -> int:
        calls["n"] += 1
        raise RuntimeError("api down")

    for _ in range(3):
        with pytest.raises(RuntimeError):
            cb.call(boom)
    assert cb.state == "open"

    # Fail fast: no underlying call is made while open.
    with pytest.raises(Exception, match="circuit open"):
        cb.call(boom)
    assert calls["n"] == 3

    # Success closes the circuit (after simulated reset).
    cb2 = CircuitBreaker(threshold=1, reset_seconds=0, clock=lambda: 0.0)
    with pytest.raises(RuntimeError):
        cb2.call(boom)
    assert cb2.state == "half_open"
    assert cb2.call(lambda: "ok") == "ok"
    assert cb2.state == "closed"


def test_rate_limiter_window() -> None:
    from server.main import RateLimiter

    rl = RateLimiter(3)
    assert rl.check("ip1") == (True, 0)
    assert rl.check("ip1") == (True, 0)
    assert rl.check("ip1") == (True, 0)
    allowed, retry_after = rl.check("ip1")
    assert not allowed and retry_after >= 1
    # Independent windows per IP.
    assert rl.check("ip2") == (True, 0)


# --------------------------------------------------------------------------- #
# Phase 3: intent classification
# --------------------------------------------------------------------------- #
def test_intent_heuristic() -> None:
    from server.rag.intent import classify_intent, risk_profile

    assert classify_intent("Summarize what the Starter plan includes")[0] == "SUMMARIZATION"
    assert classify_intent("What is the refund window?")[0] == "FACT_LOOKUP"
    assert classify_intent("How do I set up SSO?")[0] == "PROCEDURE"
    intent, confidence = classify_intent("What is the audit-log export API rate limit?")
    assert intent == "FACT_LOOKUP" and 0.0 <= confidence <= 1.0
    # Every intent has a complete risk profile.
    for name in ("FACT_LOOKUP", "PROCEDURE", "COMPARISON", "SUMMARIZATION", "OTHER"):
        profile = risk_profile(name)
        assert set(profile) == {"retrieval", "rerank", "assembly", "generation"}


def test_intent_cached() -> None:
    from server.rag.intent import _classify_intent_cached

    assert _classify_intent_cached.cache_info().maxsize == 500


# --------------------------------------------------------------------------- #
# API: health, heal, rate limiting
# --------------------------------------------------------------------------- #
@pytest.fixture(scope="module")
def client() -> TestClient:
    import json
    from server.main import app, rate_limiter

    rate_limiter._reset_for_tests()
    # Ensure the eval traces exist for heal tests.
    from server.eval.runner import run_eval

    if json.load(open("server/data/queries/queries.json")) and not list(__import__("pathlib").Path("server/data/traces").glob("q*.json")):
        run_eval()
    return TestClient(app, raise_server_exceptions=False)


def test_health_metrics(client: TestClient) -> None:
    h = client.get("/api/health").json()
    assert h["status"] == "ok"
    assert {"uptime_seconds", "total_queries_served", "error_count", "avg_overhead_ms"} <= set(h["metrics"])
    assert {"state", "consecutive_failures"} <= set(h["circuit_breaker"])


def test_heal_q12_and_q15(client: TestClient) -> None:
    d = client.post("/api/query/heal", json={"query_id": "q12"}).json()
    assert d["adjustment"]["adjusted_params"]["rerank_k"] > 5
    kept = {c["chunk_id"] for s in d["healed"]["stages"] if s["stage"] == "rerank" for c in s["candidates"] if c["kept"]}
    assert "pricing#0" in kept
    assert d["adjustment"]["improved"] is True

    d = client.post("/api/query/heal", json={"query_id": "q15"}).json()
    assert d["adjustment"]["adjusted_params"]["context_max_chars"] > 200
    assert "10 requests per minute" in d["healed"]["final_context"]
    assert d["adjustment"]["signals_after"]["key_terms_in_context"] is True


def test_heal_missing_trace(client: TestClient) -> None:
    assert client.post("/api/query/heal", json={"query_id": "nope"}).status_code == 404


def test_rate_limit_on_query_endpoint(client: TestClient) -> None:
    from server.main import rate_limiter

    rate_limiter._reset_for_tests()
    codes = [
        client.post("/api/query", json={"query": "What is the refund window for a new subscription?"}).status_code
        for _ in range(12)
    ]
    assert codes[:10] == [200] * 10
    assert set(codes[10:]) == {429}


def test_query_validation(client: TestClient) -> None:
    from server.main import rate_limiter

    rate_limiter._reset_for_tests()
    assert client.post("/api/query", json={"query": "   "}).status_code == 422


# --------------------------------------------------------------------------- #
# Phase 4: SDK
# --------------------------------------------------------------------------- #
def test_instrumented_pipeline_native() -> None:
    from server.trace.instrument import InstrumentedPipeline

    with InstrumentedPipeline(
        query="rate limit test",
        query_id=f"test_sdk_{id(object()) & 0xFFFF}",
        key_terms=["10"],
        needed_chunk_ids=["audit_logs#2"],
        framework="custom",
    ) as pipe:
        @pipe.stage("retrieval")
        def retrieve(q: str) -> str:
            return f"docs for {q}"

        @pipe.stage("generation")
        def generate(context: str) -> str:
            return "10 requests per minute"

        context = retrieve("rate limit test")
        answer = generate(context)
        pipe.set_context(context)
        pipe.set_answer(answer)

    trace = pipe.trace
    assert trace is not None
    assert [s.stage.value for s in trace.stages] == ["retrieval", "generation"]
    assert trace.framework == "custom"
    assert trace.answer == "10 requests per minute"
    assert trace.indicated_failure.value in ("none", "generation", "retrieval")


def test_traced_stage_fallback() -> None:
    from server.trace.instrument import traced_stage, _get_fallback_ctx

    @traced_stage("retrieval")
    def fn(x: int) -> int:
        return x * 2

    assert fn(21) == 42
    ctx = _get_fallback_ctx()
    assert any(s.stage.value == "retrieval" for s in ctx.trace.stages)


def test_langchain_adapter_records_stages() -> None:
    pytest.importorskip("langchain_core")
    from langchain_core.documents import Document
    from langchain_core.language_models.fake_chat_models import FakeListChatModel
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.retrievers import BaseRetriever
    from langchain_core.runnables import RunnableLambda

    from server.trace.adapters.langchain_adapter import TracingCallbackHandler

    class _R(BaseRetriever):
        def _get_relevant_documents(self, query: str, **kwargs):
            return [Document(page_content="Rate limit is 10 requests per minute.")]

    chain = (
        {
            "context": RunnableLambda(lambda x: x["question"])
            | _R()
            | RunnableLambda(lambda docs: "\n".join(d.page_content for d in docs)),
            "question": RunnableLambda(lambda x: x["question"]),
        }
        | ChatPromptTemplate.from_template("Context:\n{context}\n\nQuestion: {question}")
        | FakeListChatModel(responses=["The rate limit is 10 requests per minute."])
        | StrOutputParser()
    )
    handler = TracingCallbackHandler(query="What is the rate limit?")
    result = chain.invoke({"question": "What is the rate limit?"}, config={"callbacks": [handler]})
    trace = handler.finalize()

    stages = [s.stage.value for s in trace.stages]
    assert "retrieval" in stages and "generation" in stages and "assembly" in stages
    assert "10 requests per minute" in result.lower()
    assert trace.framework == "langchain"


def test_llamaindex_adapter_records_stages() -> None:
    pytest.importorskip("llama_index.core")
    from llama_index.core import Document as LIDoc, VectorStoreIndex
    from llama_index.core.base.embeddings.base import BaseEmbedding
    from llama_index.core.base.llms.types import CompletionResponse, LLMMetadata
    from llama_index.core.llms import CustomLLM

    from server.trace.adapters.llamaindex_adapter import LlamaIndexTraceHandler

    class Emb(BaseEmbedding):
        @classmethod
        def class_name(cls) -> str:
            return "Emb"

        def _get_query_embedding(self, q: str):
            return [0.1, 0.2]

        def _get_text_embedding(self, t: str):
            return [0.1, 0.2]

        async def _aget_query_embedding(self, q: str):
            raise NotImplementedError

        async def _aget_text_embedding(self, t: str):
            raise NotImplementedError

    class Echo(CustomLLM):
        @classmethod
        def class_name(cls) -> str:
            return "Echo"

        @property
        def metadata(self) -> LLMMetadata:
            return LLMMetadata(model_name="echo")

        def chat(self, messages, **kw):
            from llama_index.core.base.llms.types import ChatMessage, ChatResponse

            return ChatResponse(
                message=ChatMessage(role="assistant", content="10 requests per minute"), raw=None
            )

        async def achat(self, messages, **kw):
            raise NotImplementedError

        def complete(self, prompt, **kw):
            return CompletionResponse(text="10 requests per minute", raw=None)

        async def acomplete(self, prompt, **kw):
            raise NotImplementedError

        def stream_chat(self, messages, **kw):
            raise NotImplementedError

        def stream_complete(self, prompt, **kw):
            raise NotImplementedError

        async def astream_chat(self, messages, **kw):
            raise NotImplementedError

        async def astream_complete(self, prompt, **kw):
            raise NotImplementedError

    idx = VectorStoreIndex.from_documents(
        [LIDoc(text="Rate limit is 10 requests per minute.")], embed_model=Emb()
    )
    handler = LlamaIndexTraceHandler(query="What is the rate limit?")
    idx.as_query_engine(llm=Echo(), similarity_top_k=2).query("What is the rate limit?")
    trace = handler.finalize()

    stages = [s.stage.value for s in trace.stages]
    assert "retrieval" in stages and "generation" in stages and "assembly" in stages
    assert trace.framework == "llamaindex"
