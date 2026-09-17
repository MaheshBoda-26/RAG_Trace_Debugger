"""FastAPI entrypoint for the RAG Trace Debugger server.

Run:  uvicorn server.main:app --reload --port 8000
      (or: python -m server.main)
"""
from __future__ import annotations

import logging
import sys
import threading
import time

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api import routes_corpus, routes_eval, routes_traces
from .config import (
    HOST,
    PORT,
    RATE_LIMIT_QUERIES_PER_MINUTE,
    ensure_dirs,
    has_gemini,
)
from .metrics import metrics
from .rag.pipeline import get_components

# --- Structured logging (observability skill: structured events, not prose) -
logging.basicConfig(
    level=logging.INFO,
    format='{"ts":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}',
    stream=sys.stdout,
)
log = logging.getLogger("rag_trace_debugger")


# --- Simple in-memory rate limiter (Phase 2) --------------------------------
class RateLimiter:
    """Fixed-window per-IP limiter for query endpoints.

    10 queries/minute per IP by default (configurable via
    RATE_LIMIT_QUERIES_PER_MINUTE). Returns 429 with a Retry-After header when
    the window is exceeded.
    """

    def __init__(self, max_per_minute: int) -> None:
        self._max = max(1, int(max_per_minute))
        self._lock = threading.Lock()
        self._windows: dict[str, tuple[int, float]] = {}  # ip -> (count, window_start)

    @property
    def max_per_minute(self) -> int:
        return self._max

    def check(self, client_ip: str) -> tuple[bool, int]:
        """Return (allowed, retry_after_seconds)."""
        now = time.monotonic()
        with self._lock:
            count, window_start = self._windows.get(client_ip, (0, now))
            if now - window_start >= 60.0:
                count, window_start = 0, now
            if count >= self._max:
                retry_after = max(1, int(60.0 - (now - window_start)) + 1)
                return False, retry_after
            self._windows[client_ip] = (count + 1, window_start)
            return True, 0

    def _reset_for_tests(self) -> None:
        with self._lock:
            self._windows.clear()


rate_limiter = RateLimiter(RATE_LIMIT_QUERIES_PER_MINUTE)

# Endpoints subject to the per-IP query rate limit.
_RATE_LIMITED_PATHS = {"/api/query", "/api/query/heal"}


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

    @app.middleware("http")
    async def rate_limit_and_metrics(request: Request, call_next):
        path = request.url.path
        # Rate limit POST /api/query and POST /api/query/heal per client IP.
        if request.method == "POST" and path in _RATE_LIMITED_PATHS:
            client_ip = request.client.host if request.client else "unknown"
            allowed, retry_after = rate_limiter.check(client_ip)
            if not allowed:
                metrics.record_error()
                return JSONResponse(
                    status_code=429,
                    content={"detail": {"error": "rate_limited",
                                        "message": "Too many queries; slow down.",
                                        "retry_after_seconds": retry_after}},
                    headers={"Retry-After": str(retry_after)},
                )
        try:
            response = await call_next(request)
        except Exception:
            metrics.record_error()
            raise
        return response

    @app.get("/api/health")
    def health():
        comps = get_components()
        from .rag.circuit_breaker import generation_breaker

        return {
            "status": "ok",
            "gemini_enabled": has_gemini(),
            "doc_count": len(comps.corpus.doc_ids()),
            "chunk_count": len(comps.corpus.chunks),
            "metrics": metrics.to_dict(),
            "circuit_breaker": {
                "state": generation_breaker.state,
                "consecutive_failures": generation_breaker.consecutive_failures,
            },
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
