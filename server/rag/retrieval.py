"""Hybrid retrieval: dense + BM25 → Reciprocal Rank Fusion (RRF).

RRF score for rank position i:  1 / (k + i), where k = 60 (standard default).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np

from ..config import has_gemini
from .bm25 import BM25Index
from .corpus import Chunk, Corpus
from .embeddings import Embeddings

_RRF_K = 60


@dataclass
class RetrievalResult:
    """One candidate returned by hybrid retrieval."""

    chunk: Chunk
    dense_score: float
    bm25_score: float
    fused_score: float
    rank: int


def retrieve(
    query: str,
    corpus: Corpus,
    embeddings: Optional[Embeddings] = None,
    bm25_index: Optional[BM25Index] = None,
    *,
    top_k: int = 20,
) -> list[RetrievalResult]:
    """Run hybrid retrieval and return ranked candidates.

    If embeddings is None or has no Gemini key, only BM25 is used
    (dense_score = 0 for all candidates).
    """
    embeddings = embeddings or Embeddings()
    bm25_index = bm25_index or BM25Index.from_chunks(corpus.chunks)

    # --- BM25 scores ---
    bm25_results = bm25_index.top_k(query, k=top_k * 2)
    bm25_map: dict[int, float] = {i: s for i, s in bm25_results}

    # --- Dense scores (if available) ---
    dense_map: dict[int, float] = {}
    if has_gemini() and embeddings:
        query_vec = embeddings.embed_text(query)
        chunk_texts = [c.text for c in corpus.chunks]
        chunk_vecs = embeddings.embed_texts(chunk_texts)
        sims = Embeddings.cosine_similarity(query_vec, chunk_vecs)  # (1, N)
        for i in range(len(corpus.chunks)):
            dense_map[i] = float(sims[0, i])

    # --- RRF fusion ---
    # Rank by dense (descending)
    dense_ranked = sorted(dense_map.items(), key=lambda x: x[1], reverse=True)
    bm25_ranked = [(i, s) for i, s in bm25_results]

    fused: dict[int, float] = {}
    for rank_pos, (i, _) in enumerate(dense_ranked, start=1):
        fused[i] = fused.get(i, 0.0) + 1.0 / (_RRF_K + rank_pos)
    for rank_pos, (i, _) in enumerate(bm25_ranked, start=1):
        fused[i] = fused.get(i, 0.0) + 1.0 / (_RRF_K + rank_pos)

    # Sort by fused score descending
    ranked = sorted(fused.items(), key=lambda x: x[1], reverse=True)[:top_k]

    results: list[RetrievalResult] = []
    for rank_pos, (chunk_idx, fused_score) in enumerate(ranked, start=1):
        chunk = corpus.chunks[chunk_idx]
        results.append(
            RetrievalResult(
                chunk=chunk,
                dense_score=round(dense_map.get(chunk_idx, 0.0), 6),
                bm25_score=round(bm25_map.get(chunk_idx, 0.0), 6),
                fused_score=round(fused_score, 6),
                rank=rank_pos,
            )
        )
    return results
