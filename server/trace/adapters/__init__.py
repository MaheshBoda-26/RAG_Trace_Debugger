"""Framework adapters for the instrumentation SDK (Phase 4).

- langchain_adapter: TracingCallbackHandler for LangChain chains
- llamaindex_adapter: LlamaIndexTraceHandler for LlamaIndex query engines

Both import their framework lazily at handler construction, so importing this
package never requires the optional dependencies.
"""
from . import langchain_adapter, llamaindex_adapter

__all__ = ["langchain_adapter", "llamaindex_adapter"]
