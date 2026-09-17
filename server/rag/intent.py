"""Query intent classification (Phase 3).

Classifies a query into one of five intent buckets with a confidence score.
Two modes:

- With GEMINI_API_KEY: few-shot LLM classification via gemini-2.5-flash.
- Without: deterministic keyword/regex heuristic fallback (so the demo and
  eval run identically offline).

Results are cached per query text (lru_cache) — classification is pure with
respect to its string input at runtime (the key is fixed at process start).
"""
from __future__ import annotations

import functools
import json
import re

from ..config import GEMINI_API_KEY, GEMINI_MODEL, GEMINI_TIMEOUT, has_gemini

INTENTS = ("FACT_LOOKUP", "PROCEDURE", "COMPARISON", "SUMMARIZATION", "OTHER")

RiskProfile = dict[str, str]

# Hard-coded intent → per-stage risk mapping (roadmap Phase 3).
INTENT_RISK_PROFILES: dict[str, RiskProfile] = {
    "FACT_LOOKUP": {
        "retrieval": "high", "rerank": "medium", "assembly": "low", "generation": "low",
    },
    "PROCEDURE": {
        "retrieval": "medium", "rerank": "low", "assembly": "high", "generation": "medium",
    },
    "COMPARISON": {
        "retrieval": "high", "rerank": "high", "assembly": "medium", "generation": "medium",
    },
    "SUMMARIZATION": {
        "retrieval": "low", "rerank": "low", "assembly": "high", "generation": "high",
    },
    "OTHER": {
        "retrieval": "medium", "rerank": "medium", "assembly": "medium", "generation": "medium",
    },
}

INTENT_LABELS: dict[str, str] = {
    "FACT_LOOKUP": "Fact Lookup",
    "PROCEDURE": "Procedure",
    "COMPARISON": "Comparison",
    "SUMMARIZATION": "Summarization",
    "OTHER": "Other",
}

# Few-shot examples: one per category (used for the LLM prompt AND documented
# here as the definition of each bucket).
_FEW_SHOT = [
    ("FACT_LOOKUP", "What is the first-response time for a Severity-1 incident?"),
    ("PROCEDURE", "How do I set up SSO for my organization?"),
    ("COMPARISON", "What's the difference between the Growth and Enterprise plans?"),
    ("SUMMARIZATION", "Summarize what the Starter plan does and does not include."),
    ("OTHER", "Who should I contact if my invoice looks wrong?"),
]

# Deterministic heuristic patterns (fallback mode). Ordered by specificity:
# summarization > comparison > procedure > fact lookup. Procedure requires an
# explicit how-to/question form so statements like "hasn't set up MFA" don't
# misfire; bare topic nouns (set up, configure) are NOT anchors.
_HEURISTICS: list[tuple[str, re.Pattern[str]]] = [
    ("SUMMARIZATION", re.compile(r"\b(summar(y|ize|ise)|overview|tl;?dr|in short|high[- ]level)\b|\bwhat does .+ (include|cover)\b", re.I)),
    ("COMPARISON", re.compile(r"\b(difference(s)? between|compare|comparison|versus|\bvs\.?\b|which (is )?better|plan a or|or the .+ plan)\b", re.I)),
    ("PROCEDURE", re.compile(r"\b(how (do|can|should) i|how to|steps? (to|for)|walk me through|guide (to|for)|process (to|for)|enable|install|migrate)\b", re.I)),
    (
        "FACT_LOOKUP",
        re.compile(
            r"\b(what (is|are|was|were|does|do|happens?|file|formats?|regions?|tier|status|type)|"
            r"how (many|much|is|are)|which (tier|plan|regions?|file|format)|"
            r"price|cost|refund|rate[- ]?limit|limited|quota|cap)\b",
            re.I,
        ),
    ),
]


def classify_intent(query: str) -> tuple[str, float]:
    """Classify query text → (intent, confidence in [0,1]). Cached."""
    return _classify_intent_cached(query.strip())


@functools.lru_cache(maxsize=500)
def _classify_intent_cached(query: str) -> tuple[str, float]:
    if not query:
        return "OTHER", 0.0
    if has_gemini():
        try:
            return _classify_via_gemini(query)
        except Exception:
            # LLM classification is best-effort; fall back to heuristics.
            pass
    return _classify_heuristic(query)


def _classify_heuristic(query: str) -> tuple[str, float]:
    for intent, pattern in _HEURISTICS:
        m = pattern.search(query)
        if m:
            # Confidence scales with how much of the query the match anchors.
            strength = min(1.0, 0.6 + 0.05 * len(m.group(0)))
            return intent, round(strength, 2)
    return "OTHER", 0.5


def _classify_via_gemini(query: str) -> tuple[str, float]:
    import httpx

    examples = "\n".join(f"{q} => {i}" for i, q in _FEW_SHOT)
    prompt = (
        "Classify the support query into exactly one intent:\n"
        "FACT_LOOKUP, PROCEDURE, COMPARISON, SUMMARIZATION, OTHER.\n\n"
        f"Examples:\n{examples}\n\n"
        "Respond with ONLY a JSON object: {\"intent\": \"...\", \"confidence\": 0.0}\n\n"
        f"Query: {query}"
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 60},
    }
    resp = httpx.post(url, json=payload, timeout=httpx.Timeout(GEMINI_TIMEOUT))
    resp.raise_for_status()
    text = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
    # Tolerate markdown fences around the JSON.
    text = re.sub(r"^```(?:json)?|```$", "", text, flags=re.M).strip()
    data = json.loads(text)
    intent = str(data.get("intent", "OTHER")).upper()
    if intent not in INTENTS:
        intent = "OTHER"
    try:
        confidence = min(1.0, max(0.0, float(data.get("confidence", 0.5))))
    except (TypeError, ValueError):
        confidence = 0.5
    return intent, round(confidence, 2)


def risk_profile(intent: str) -> RiskProfile:
    """Per-stage risk levels for an intent (defaults to OTHER's profile)."""
    return INTENT_RISK_PROFILES.get(intent, INTENT_RISK_PROFILES["OTHER"])


__all__ = [
    "INTENTS",
    "INTENT_LABELS",
    "INTENT_RISK_PROFILES",
    "classify_intent",
    "risk_profile",
]
