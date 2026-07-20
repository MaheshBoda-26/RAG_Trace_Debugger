"""Dense embeddings via Gemini text-embedding-004, with on-disk numpy cache.

When GEMINI_API_KEY is not set, this module returns zero vectors so the rest of
the pipeline (BM25 + RRF) still works — just without the dense signal.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Optional

import numpy as np

from ..config import EMBEDDINGS_CACHE_DIR, GEMINI_API_KEY, GEMINI_EMBEDDING_MODEL, ensure_dirs

_DIM = 768  # text-embedding-004 output dimension


class Embeddings:
    """Wraps Gemini embeddings with a deterministic disk cache."""

    def __init__(self, cache_dir: Optional[Path] = None) -> None:
        self._cache_dir = cache_dir or EMBEDDINGS_CACHE_DIR
        ensure_dirs()
        self._embedding_fn = _embed_via_gemini if GEMINI_API_KEY else _embed_zero

    def embed_texts(self, texts: list[str]) -> np.ndarray:
        """Return (N, _DIM) array of embeddings for a list of texts."""
        return np.vstack([self.embed_text(t) for t in texts])

    def embed_text(self, text: str) -> np.ndarray:
        """Embed a single text, using the cache when possible."""
        key = hashlib.sha256(text.encode()).hexdigest()[:16]
        path = self._cache_dir / f"{key}.npy"
        if path.exists():
            return np.load(path)
        vec = self._embedding_fn(text)
        np.save(path, vec)
        return vec

    @staticmethod
    def cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
        """(N, D) vs (M, D) -> (N, M) similarity matrix."""
        if a.ndim == 1:
            a = a.reshape(1, -1)
        if b.ndim == 1:
            b = b.reshape(1, -1)
        a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-9)
        b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-9)
        return a_norm @ b_norm.T


def _embed_zero(text: str) -> np.ndarray:
    """Fallback: return a zero vector (no API key)."""
    return np.zeros(_DIM, dtype=np.float32)


def _embed_via_gemini(text: str) -> np.ndarray:
    """Call Gemini embedding API. Raises on network errors."""
    import httpx

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_EMBEDDING_MODEL}:embedContent?key={GEMINI_API_KEY}"
    payload = {"model": GEMINI_EMBEDDING_MODEL, "content": {"parts": [{"text": text}]}}
    resp = httpx.post(url, json=payload, timeout=30.0)
    resp.raise_for_status()
    values = resp.json()["embedding"]["values"]
    return np.array(values, dtype=np.float32)
