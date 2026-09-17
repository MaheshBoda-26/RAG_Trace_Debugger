"""End-to-end SDK verification: instrument a minimal LangChain chain,
a minimal LlamaIndex query pipeline, and a custom SDK pipeline.

Run:  .venv/bin/python -m server.examples.verify_sdk

Writes three traces (framework: langchain / llamaindex / custom) into the
trace store, then prints the dashboard-visible summaries. Framework imports
are optional: each section is skipped (with a printed note) when the framework
isn't installed, so the script always exits 0.
"""
from __future__ import annotations

import os
import uuid

# Keep every network call local/deterministic for the verification run.
os.environ.setdefault("GEMINI_API_KEY", "")

from server.trace import store
from server.trace.instrument import InstrumentedPipeline, traced_stage


def _demo_corpus():
    return {
        "pricing": "$18 per additional seat on the Growth plan. Growth includes 5 seats.",
        "refund": "Refund window is 14 days for a full refund on new subscriptions.",
        "rate_limit": "The audit-log export API is rate-limited to 10 requests per minute.",
    }


def _mock_llm(query: str, context: str) -> str:
    """Extractive stand-in for an LLM: pick the sentence with most query overlap."""
    import re

    stop = {"the", "a", "an", "is", "are", "of", "for", "to", "on", "in", "and", "what", "how"}
    qtokens = {t for t in re.findall(r"[a-z0-9]+", query.lower()) if t not in stop}
    best, best_score = "", -1
    for sentence in re.split(r"(?<=[.!?])\s+", context):
        score = len(qtokens & set(re.findall(r"[a-z0-9]+", sentence.lower())))
        if score > best_score:
            best, best_score = sentence, score
    return best or "(no answer)"


def _assemble(chunks: list[str], max_chars: int = 2000) -> str:
    return "\n\n".join(chunks)[:max_chars]


def _retrieve(corpus: dict[str, str], query: str, k: int) -> list[str]:
    import re

    qtokens = set(re.findall(r"[a-z0-9]+", query.lower()))
    scored = sorted(
        corpus.items(),
        key=lambda kv: -len(qtokens & set(re.findall(r"[a-z0-9]+", (kv[0] + " " + kv[1]).lower()))),
    )
    return [text for _, text in scored[:k]]


# --------------------------------------------------------------------------- #
# 1. Native SDK pipeline (custom framework)
# --------------------------------------------------------------------------- #
def run_native_sdk() -> None:
    corpus = _demo_corpus()
    query = "What is the audit-log export API rate limit?"

    with InstrumentedPipeline(
        query=query,
        query_id=f"sdk_demo_{uuid.uuid4().hex[:6]}",
        key_terms=["10", "requests", "minute"],
        framework="custom",
    ) as pipe:
        @pipe.stage("retrieval")
        def retrieve(q: str, k: int = 2):
            return _retrieve(corpus, q, k)

        @pipe.stage("assembly")
        def assemble(chunks: list[str]) -> str:
            return _assemble(chunks)

        @pipe.stage("generation")
        def generate(context: str) -> str:
            return _mock_llm(query, context)

        docs = retrieve(query, k=2)
        context = assemble(docs)
        pipe.set_context(context)
        answer = generate(context)
        pipe.set_answer(answer)

    trace = pipe.trace
    assert trace is not None and len(trace.stages) == 3, "native SDK trace incomplete"
    print(f"[native]  {trace.query_id}: {len(trace.stages)} stages, "
          f"indicated={trace.indicated_failure.value}, framework={trace.framework}")


# --------------------------------------------------------------------------- #
# 2. LangChain minimal chain
# --------------------------------------------------------------------------- #
def run_langchain() -> None:
    try:
        from langchain_core.callbacks import AsyncCallbackManagerForChainRun  # noqa: F401
        from langchain_core.documents import Document
        from langchain_core.language_models.fake_chat_models import FakeListChatModel
        from langchain_core.output_parsers import StrOutputParser
        from langchain_core.prompts import ChatPromptTemplate
        from langchain_core.retrievers import BaseRetriever
        from langchain_core.runnables import RunnableLambda
    except ImportError:
        print("[langchain] skipped (langchain-core not installed)")
        return

    from server.trace.adapters.langchain_adapter import TracingCallbackHandler

    corpus = _demo_corpus()

    class DemoRetriever(BaseRetriever):
        k: int = 2

        def _get_relevant_documents(self, query: str, **kwargs):
            return [Document(page_content=t) for t in _retrieve(corpus, query, self.k)]

    prompt = ChatPromptTemplate.from_template(
        "Answer from the context.\n\nContext:\n{context}\n\nQuestion: {question}"
    )
    # FakeListChatModel keeps the run fully deterministic + offline while
    # exercising the real on_chat_model_start/on_llm_end callback path.
    chat = FakeListChatModel(responses=["The refund window is 14 days for a full refund."])
    chain = (
        {
            "context": RunnableLambda(lambda x: x["question"])
            | DemoRetriever()
            | RunnableLambda(lambda docs: _assemble([d.page_content for d in docs])),
            "question": RunnableLambda(lambda x: x["question"]),
        }
        | prompt
        | chat
        | StrOutputParser()
    )

    query = "What is the refund window for a new subscription?"
    handler = TracingCallbackHandler(query=query)
    result = chain.invoke({"question": query}, config={"callbacks": [handler]})
    trace = handler.finalize()
    assert trace is not None, "langchain trace missing"
    stages = [s.stage.value for s in trace.stages]
    print(f"[langchain] {trace.query_id}: stages={stages}, answer={result[:40]!r}, "
          f"framework={trace.framework}")


# --------------------------------------------------------------------------- #
# 3. LlamaIndex minimal query pipeline
# --------------------------------------------------------------------------- #
def run_llamaindex() -> None:
    try:
        from llama_index.core import Document as LIDocument, VectorStoreIndex
        from llama_index.core.base.embeddings.base import BaseEmbedding
        from llama_index.core.base.llms.types import (
            CompletionResponse,
            CompletionResponseGen,
            LLMMetadata,
        )
        from llama_index.core.llms import CustomLLM
        from llama_index.core.schema import NodeWithScore  # noqa: F401
    except ImportError:
        print("[llamaindex] skipped (llama-index-core not installed)")
        return

    from server.trace.adapters.llamaindex_adapter import LlamaIndexTraceHandler

    corpus = _demo_corpus()
    docs = [LIDocument(text=t) for t in corpus.values()]

    class DictEmbedding(BaseEmbedding):
        """Deterministic toy embedding: 32-dim bag-of-words hash."""
        @classmethod
        def class_name(cls) -> str:
            return "DictEmbedding"

        def _get_query_embedding(self, query: str):
            return _embed(query)

        def _get_text_embedding(self, text: str):
            return _embed(text)

        def _aget_query_embedding(self, query: str):
            raise NotImplementedError

        async def _aget_text_embedding(self, text: str):
            raise NotImplementedError

    def _embed(text: str) -> list[float]:
        import math
        import re

        vec = [0.0] * 32
        for tok in re.findall(r"[a-z0-9]+", text.lower()):
            vec[hash(tok) % 32] += 1.0
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    class EchoLLM(CustomLLM):
        """Toy LLM: extractive answer from the prompt's context."""
        @classmethod
        def class_name(cls) -> str:
            return "EchoLLM"

        @property
        def metadata(self) -> LLMMetadata:
            return LLMMetadata(model_name="echo")

        def chat(self, messages, **kwargs):
            from llama_index.core.base.llms.types import ChatMessage, ChatResponse

            text = messages[-1].content if messages else ""
            return ChatResponse(message=ChatMessage(role="assistant", content=_pick(text)), raw=None)

        async def achat(self, messages, **kwargs):
            raise NotImplementedError

        def complete(self, prompt: str, **kwargs) -> CompletionResponse:
            return CompletionResponse(text=_pick(prompt), raw=None)

        async def acomplete(self, prompt: str, **kwargs):
            raise NotImplementedError

        def stream_chat(self, messages, **kwargs) -> CompletionResponseGen:
            raise NotImplementedError

        def stream_complete(self, prompt: str, **kwargs) -> CompletionResponseGen:
            raise NotImplementedError

        async def astream_chat(self, messages, **kwargs) -> CompletionResponseGen:
            raise NotImplementedError

        async def astream_complete(self, prompt: str, **kwargs) -> CompletionResponseGen:
            raise NotImplementedError

    def _pick(prompt: str) -> str:
        # The synthesized prompt contains context + question; reuse extractive mock.
        ctx, _, q = prompt.rpartition("Question:")
        return _mock_llm(q.strip() or prompt, ctx)

    index = VectorStoreIndex.from_documents(docs, embed_model=DictEmbedding())
    query_engine = index.as_query_engine(llm=EchoLLM(), similarity_top_k=2)

    query = "What is the cost of an additional seat on the Growth plan?"
    handler = LlamaIndexTraceHandler(query=query)
    response = query_engine.query(query)
    trace = handler.finalize()
    assert trace is not None, "llamaindex trace missing"
    stages = [s.stage.value for s in trace.stages]
    print(f"[llamaindex] {trace.query_id}: stages={stages}, answer={str(response)[:40]!r}, "
          f"framework={trace.framework}")


def main() -> None:
    before = {s.query_id for s in store.list_summaries()}
    run_native_sdk()
    run_langchain()
    run_llamaindex()
    after = [s for s in store.list_summaries() if s.query_id not in before]
    print("\nDashboard-visible new traces:")
    for s in after:
        print(f"  {s.query_id:24s} framework={s.framework:10s} stages={s.stage_count} "
              f"indicated={s.indicated_failure.value}")


if __name__ == "__main__":
    main()
