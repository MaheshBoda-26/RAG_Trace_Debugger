"""Corpus API routes.

GET /api/corpus      list docs and their chunks
"""
from __future__ import annotations

from fastapi import APIRouter

from ..rag.corpus import load_corpus
from ..rag.pipeline import get_components

router = APIRouter(prefix="/api", tags=["corpus"])


@router.get("/corpus")
def get_corpus():
    """Return docs grouped with their chunks, plus global stats."""
    corpus = get_components().corpus
    docs: dict[str, list[dict]] = {}
    for c in corpus.chunks:
        docs.setdefault(c.doc_id, []).append({
            "chunk_id": c.chunk_id,
            "index": c.index,
            "heading": c.heading,
            "text": c.text,
        })
    return {
        "doc_count": len(docs),
        "chunk_count": len(corpus.chunks),
        "docs": [
            {"doc_id": doc_id, "chunks": chunks}
            for doc_id, chunks in sorted(docs.items())
        ],
    }
