# Instrumentation SDK

The RAG Trace Debugger ships as an embeddable Python SDK: instrument **any** Python RAG pipeline — custom, LangChain, or LlamaIndex — and every run lands in the same trace store, localized and rendered in the same dashboard.

All of this wraps the framework-agnostic collector (`server/trace/collector.py`); nothing is duplicated.

---

## Installation

No extra setup — the SDK is part of the server package. Framework adapters import their framework lazily, so you only need the framework you actually use:

```bash
pip install langchain-core   # for the LangChain adapter
pip install llama-index-core # for the LlamaIndex adapter
```

(Both are commented optional extras in `server/requirements.txt`.)

---

## 1. Custom pipelines — `InstrumentedPipeline`

```python
from server.trace.instrument import InstrumentedPipeline

with InstrumentedPipeline(query="test") as pipe:
    @pipe.stage("retrieval")
    def retrieve(q):
        return vector_store.search(q)

    @pipe.stage("generation")
    def generate(context):
        return llm.complete(context)

    docs = retrieve("test")
    answer = generate(docs)
# On exit the trace is finalized, localized, and saved automatically.
```

Notes:

- Stage names are free-form, but the five canonical ones (`query_rewrite`,
  `retrieval`, `rerank`, `assembly`, `generation`) get full localizer coverage.
- If a `generation`-named stage returns a string, it is captured as the trace's
  answer automatically; likewise an `assembly` stage returning a string sets the
  final context. You can also set them explicitly:

```python
pipe.set_answer(answer)      # what the user saw (FR5)
pipe.set_context(context)    # the exact context string (FR4)
```

- `localize_trace` runs on exit. To enable the retrieval/rerank failure signals,
  pass the ids of the chunks a correct answer needs:

```python
with InstrumentedPipeline(query="test", needed_chunk_ids=["pricing#0"]) as pipe:
    ...
```

- `query_id` is auto-generated (`sdk_<hex>`); pass `query_id="..."` to control it.
- `framework="custom"` by default; the dashboard's framework filter recognizes
  `native`, `langchain`, `llamaindex`, `custom`.

### Standalone decorator

`@traced_stage` works outside any pipeline too. Inside an active
`InstrumentedPipeline` the call attaches to that trace; outside one, calls are
appended to a fallback trace persisted at process exit:

```python
from server.trace.instrument import traced_stage

@traced_stage("retrieval")
def retrieve(q):
    return vector_store.search(q)
```

---

## 2. LangChain — `TracingCallbackHandler`

Maps LangChain callback events onto canonical stages:

| LangChain event | Trace stage |
|---|---|
| `on_retriever_start` / `on_retriever_end` | retrieval |
| `on_llm_start` / `on_llm_end` (and chat models) | generation |
| `on_chain_start` / `on_chain_end` (outermost chain) | assembly |
| `on_tool_start` / `on_tool_end` | generation |

```python
from server.trace.adapters.langchain_adapter import TracingCallbackHandler

handler = TracingCallbackHandler(query="my query")
result = chain.invoke(inputs, config={"callbacks": [handler]})

trace = handler.finalize()   # optional; also runs on GC
print(handler.query_id)      # open this id in the dashboard
```

The handler captures retrieved documents, the assembled context (when the chain
exposes it), and the final answer. Errors are recorded on the corresponding
stage with `status: error` instead of breaking your chain.

---

## 3. LlamaIndex — `LlamaIndexTraceHandler`

Maps llama-index-core instrumentation events onto canonical stages:

| LlamaIndex event | Trace stage |
|---|---|
| `QueryStartEvent` / `QueryEndEvent` | assembly (top-level run) |
| `RetrievalStartEvent` / `RetrievalEndEvent` | retrieval |
| `SynthesizeStartEvent` / `SynthesizeEndEvent` | generation |
| `LLMPredictEndEvent` | answer capture |

```python
from server.trace.adapters.llamaindex_adapter import LlamaIndexTraceHandler

handler = LlamaIndexTraceHandler(query="my query")   # create BEFORE .query()
response = query_engine.query("my query")
trace = handler.finalize()
print(handler.query_id)
```

The handler attaches to the global dispatcher and captures every query run
between construction and `finalize()` — create one handler per query run. It
never raises into the host pipeline: instrumentation failures are swallowed.

---

## 4. What you get in the dashboard

Every SDK trace is byte-compatible with native ones and includes:

- per-stage inputs/outputs, latency, timestamps, and error status
- retrieved documents (doc id, text preview, score where available)
- the exact final context and the raw answer
- `framework` (drives the dashboard's framework filter: All / Native / LangChain / LlamaIndex / Custom SDK)
- localized `indicated_failure` + human-readable `failure_reason`
- intent classification + per-stage risk profile (same as native traces)

Run the bundled end-to-end verification, which writes one trace per mode and
prints their dashboard ids:

```bash
python -m server.examples.verify_sdk
```

---

## 5. API reference

### `InstrumentedPipeline(query, *, query_id=None, key_terms=None, framework="custom", needed_chunk_ids=None, persist=True, localize=True)`

| Member | Description |
|---|---|
| `stage(name)` | decorator: run the function as a traced stage |
| `run_stage(name, fn, args, kwargs)` | imperative equivalent (used by adapters) |
| `set_answer(text)` / `set_context(text)` | record FR5 / FR4 fields |
| `query_id` | the trace id (available inside/after the block) |
| `trace` | the finalized `Trace` (after exit), `None` before |

### `traced_stage(name)`

Standalone decorator; binds to the active pipeline if there is one, else to the
process-level fallback trace (saved at exit).

### `TracingCallbackHandler(query="", *, query_id=None, key_terms=None, needed_chunk_ids=None, persist=True)`

LangChain `BaseCallbackHandler`; see mapping above. `finalize()` is idempotent.

### `LlamaIndexTraceHandler(query="", *, query_id=None, key_terms=None, needed_chunk_ids=None, persist=True)`

Event handler on the global llama-index dispatcher; see mapping above.
`finalize()` is idempotent and detaches the handler.

### Custom events via the raw collector

Need something the adapters don't cover? Use the collector directly — the SDK
adds `begin_stage`/`end` for callback-style frameworks:

```python
from server.trace import tracer

ctx = tracer.start("my query", query_id="custom_001")
scope = ctx.begin_stage("retrieval", input={"query": "..."})
...
scope.set(output={"count": 3})
scope.end()                       # or scope.end(status=..., error=...)
trace = ctx.finish(answer=..., final_context=...)
```

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `ImportError: TracingCallbackHandler requires langchain-core` | Install the framework: `pip install langchain-core`. |
| LlamaIndex trace has no stages | Events didn't reach the dispatcher — make sure the handler is created before `.query()` and `finalize()` is called after. |
| Trace missing from dashboard | Check `persist=True` (default) and the store dir (`server/data/traces/`). |
| No localization verdict | Pass `needed_chunk_ids` (and optionally `key_terms`) so the localizer's structural checks have signals. |
