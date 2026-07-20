"""Central configuration for the RAG Trace Debugger server.

Reads from environment (or a local .env file). Every value has a sensible
default so the demo runs end-to-end without any API keys.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

# Load server/.env if present (optional).
_SERVER_DIR = Path(__file__).resolve().parent
load_dotenv(_SERVER_DIR / ".env")


def _env(name: str, default: str) -> str:
    return os.environ.get(name, default).strip()


# --- LLM / embeddings (all optional) ---------------------------------------
GEMINI_API_KEY: str = _env("GEMINI_API_KEY", "")
GEMINI_MODEL: str = _env("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_EMBEDDING_MODEL: str = _env("GEMINI_EMBEDDING_MODEL", "text-embedding-004")


def has_gemini() -> bool:
    """True only when a real Gemini API key is configured."""
    return bool(GEMINI_API_KEY)


# --- Server ----------------------------------------------------------------
HOST: str = _env("HOST", "127.0.0.1")
PORT: int = int(_env("PORT", "8000"))


# --- Paths -----------------------------------------------------------------
DATA_DIR: Path = _SERVER_DIR / "data"
CORPUS_DIR: Path = DATA_DIR / "corpus"
QUERIES_FILE: Path = DATA_DIR / "queries" / "queries.json"
TRACES_DIR: Path = DATA_DIR / "traces"
EVAL_DIR: Path = DATA_DIR / "eval"
EMBEDDINGS_CACHE_DIR: Path = DATA_DIR / "embeddings_cache"


def ensure_dirs() -> None:
    """Create the writable output directories (traces, eval, cache)."""
    for d in (TRACES_DIR, EVAL_DIR, EMBEDDINGS_CACHE_DIR):
        d.mkdir(parents=True, exist_ok=True)
