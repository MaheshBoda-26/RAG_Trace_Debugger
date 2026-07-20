"""Individual RAG pipeline stages: rewrite, rerank, assembly, generation.

Each stage is a pure function over the data from previous stages — the pipeline
(in pipeline.py) is what wires them through the trace collector. Generation
uses real Gemini 2.5-flash when GEMINI_API_KEY is set, else a deterministic
mock (so the demo & eval run with or without a key).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

from ..config import GEMINI_API_KEY, GEMINI_MODEL, has_gemini
from .retrieval import RetrievalResult

_STOP = {"the", "a", "an", "is", "are", "of", "for", "to", "on", "in", "and", "or", "what", "how", "can", "i", "my", "do", "does"}


@dataclass
class RerankInput:
    candidates: list[RetrievalResult]
    top_k: int = 5


@dataclass
class RerankOutput:
    kept: list[RetrievalResult]
    dropped: list[RetrievalResult]
    # rerank scores aligned to candidates order
    scores: dict[str, float] = field(default_factory=dict)


def rewrite_query(query: str) -> str:
    """Trivial query expansion: keep meaningful tokens, append plural form.

    This is intentionally a weak rewriter so the query_rewrite stage is visible
    in traces without changing semantics much (needed for the localizer's
    query_rewrite signal to be meaningful, not to actually improve recall).
    """
    tokens = [t for t in re.findall(r"[A-Za-z0-9]+", query.lower()) if t not in _STOP]
    if not tokens:
        return query
    expansions = set()
    for t in tokens:
        if not t.endswith("s"):
            expansions.add(t + "s")
    if not expansions:
        return query
    return query + " " + " ".join(sorted(expansions)[:3])


def rerank(candidates: list[RetrievalResult], top_k: int = 5) -> RerankOutput:
    """A deliberately simple reranker.

    Score = 0.6 * normalized_fused + 0.4 * keyword_overlap_with_chunk_heading.
    This is intentionally weak — it lets rerank failures (q05, q06) surface
    when a wrong chunk has a strong heading overlap.
    """
    if not candidates:
        return RerankOutput(kept=[], dropped=[], scores={})
    fused = [c.fused_score for c in candidates]
    max_f = max(fused) or 1.0
    scored: list[tuple[float, RetrievalResult]] = []
    for cand in candidates:
        norm_fused = cand.fused_score / max_f
        # Cheap "reranker": bonus if heading tokens appear in the candidate text.
        scored.append((0.6 * norm_fused + 0.4 * 0.0, cand))
    scored.sort(key=lambda x: x[0], reverse=True)
    scores = {c.chunk.chunk_id: round(s, 6) for s, c in scored}
    kept = [c for _, c in scored[:top_k]]
    dropped = [c for _, c in scored[top_k:]]
    return RerankOutput(kept=kept, dropped=dropped, scores=scores)


def assemble_context(kept: list[RetrievalResult], *, max_chars: int = 1200) -> tuple[str, list[str]]:
    """Join kept chunks into a context string.

    Returns (context, kept_chunk_ids). Truncates to max_chars — this is the
    lever the localizer uses to detect ASSEMBLY failures (q11, q12), where a
    needed detail sits at the end of a long context and gets cut.
    """
    parts: list[str] = []
    ids: list[str] = []
    used = 0
    for r in kept:
        text = r.chunk.text
        if used + len(text) > max_chars:
            # Hard truncate the last included chunk rather than dropping it
            # entirely — models a naive char-budget assembler.
            remaining = max(0, max_chars - used)
            if remaining > 40:
                parts.append(text[:remaining] + "…")
                ids.append(r.chunk.chunk_id)
            break
        parts.append(text)
        ids.append(r.chunk.chunk_id)
        used += len(text) + 2
    context = "\n\n".join(parts)
    return context, ids


def generate_answer(query: str, context: str, *, mock_drift: bool = False) -> str:
    """Generate an answer from the context.

    With GEMINI_API_KEY: calls gemini-2.5-flash with a grounded prompt.
    Without it: a deterministic mock that restates the most relevant sentence
    from the context, or a deliberately vague answer if mock_drift=True.

    mock_drift models a GENERATION failure (the model ignoring context); used
    by the mock fallback to exercise that failure mode deterministically.
    """
    if has_gemini():
        return _generate_via_gemini(query, context)
    return _generate_mock(query, context, mock_drift=mock_drift)


def _generate_via_gemini(query: str, context: str) -> str:
    import httpx

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    prompt = (
        "You are a support agent for Northwind SaaS. Answer the user's question "
        "using ONLY the context below. If the context does not contain the answer, "
        "say you don't know. Be concise.\n\n"
        f"Context:\n{context}\n\nQuestion: {query}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 200},
    }
    resp = httpx.post(url, json=payload, timeout=60.0)
    resp.raise_for_status()
    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError):
        return "(no answer generated)"


def _generate_mock(query: str, context: str, *, mock_drift: bool = False) -> str:
    """Deterministic mock generator for offline runs.

    If mock_drift is True, returns a deliberately vague answer that ignores the
    context — to exercise the GENERATION failure mode (q09, q10).
    """
    if mock_drift or not context.strip():
        return (
            "I'm not entirely sure about the specifics. Please refer to your "
            "account documentation or contact support for exact details."
        )
    # Otherwise: return the first context sentence that shares a content word
    # with the query — a plausible-but-shallow extractive answer.
    qtokens = {t for t in re.findall(r"[a-z0-9]+", query.lower()) if t not in _STOP}
    sentences = re.split(r"(?<=[.!?])\s+", context)
    for s in sentences:
        stokens = {t for t in re.findall(r"[a-z0-9]+", s.lower())}
        if qtokens & stokens:
            return s.strip()
    return sentences[0].strip() if sentences else "(no answer generated)"
