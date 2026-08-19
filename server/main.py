"""FastAPI entrypoint for the RAG Trace Debugger server.

Run:  uvicorn server.main:app --reload --port 8000
      (or: python -m server.main)
"""
from __future__ import annotations

import logging
import sys

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import routes_corpus, routes_eval, routes_traces
from .config import HOST, PORT, ensure_dirs, has_gemini
from .rag.pipeline import get_components

# --- Structured logging (observability skill: structured events, not prose) -
logging.basicConfig(
    level=logging.INFO,
    format='{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}',
    stream=sys.stdout,
)
log = logging.getLogger("rag_trace_debugger")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_dirs()
    comps = get_components()
    log.info(
        'event="startup" gemini_enabled=%s docs=%d chunks=%d',
        has_gemini(), len(comps.corpus.doc_ids()), len(comps.corpus.chunks),
    )
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="RAG Trace Debugger", version="0.1.0", lifespan=lifespan)

    # CORS: the Vite dev server runs on :5173 and proxies /api here in dev,
    # but we allow localhost origins directly too for flexibility.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["*"],
        allow_headers=["*"],
    )


    @app.get("/api/health")
    def health():
        comps = get_components()
        return {
            "status": "ok",
            "gemini_enabled": has_gemini(),
            "doc_count": len(comps.corpus.doc_ids()),
            "chunk_count": len(comps.corpus.chunks),
        }

    app.include_router(routes_traces.router)
    app.include_router(routes_corpus.router)
    app.include_router(routes_eval.router)
    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run("server.main:app", host=HOST, port=PORT, reload=False)


if __name__ == "__main__":
    main()
