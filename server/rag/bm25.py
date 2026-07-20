"""Minimal BM25 keyword scoring.

A pure-Python implementation for the demo corpus. No external dependency
(e.g. rank_bm25) — keeps requirements.txt small and the code transparent.
"""
from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field

from .corpus import Chunk


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


@dataclass
class BM25Index:
    """Build-once BM25 index over a list of chunks."""

    k1: float = 1.5
    b: float = 0.75
    _terms: list[list[str]] = field(default_factory=list, repr=False)
    _df: Counter = field(default_factory=Counter, repr=False)
    _dl: list[int] = field(default_factory=list, repr=False)
    _avgdl: float = 0.0
    _N: int = 0
    _chunks: list[Chunk] = field(default_factory=list)

    @classmethod
    def from_chunks(cls, chunks: list[Chunk], k1: float = 1.5, b: float = 0.75) -> "BM25Index":
        idx = cls(k1=k1, b=b)
        idx._chunks = chunks
        idx._terms = [_tokenize(c.text) for c in chunks]
        idx._dl = [len(t) for t in idx._terms]
        idx._N = len(chunks)
        idx._avgdl = sum(idx._dl) / max(idx._N, 1)
        # Document frequency
        for terms in idx._terms:
            idx._df.update(set(terms))
        return idx

    def score(self, query: str) -> list[tuple[int, float]]:
        """Return (chunk_index, bm25_score) sorted descending, for all chunks."""
        qterms = _tokenize(query)
        scores: list[tuple[int, float]] = []
        for i in range(self._N):
            s = 0.0
            dl = self._dl[i]
            for t in qterms:
                if t not in self._terms[i]:
                    continue
                tf = self._terms[i].count(t)
                df = self._df.get(t, 0)
                idf = math.log((self._N - df + 0.5) / (df + 0.5) + 1.0)
                tf_norm = (tf * (self.k1 + 1)) / (tf + self.k1 * (1 - self.b + self.b * dl / self._avgdl))
                s += idf * tf_norm
            scores.append((i, s))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores

    def top_k(self, query: str, k: int = 20) -> list[tuple[int, float]]:
        return self.score(query)[:k]
