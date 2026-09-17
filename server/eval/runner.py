"""Eval runner: runs the labeled query batch and reports localization accuracy.

This implements the PRD §7 headline metric:
  localization_accuracy = correct / total
where 'correct' means the dashboard's indicated_failure == ground_truth_failure.

It also reports overhead (trace_overhead_ms per query) honestly, broken down
per stage. Results persist to data/eval/results.json.
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from ..config import EVAL_DIR, QUERIES_FILE, ensure_dirs, has_gemini
from ..rag.pipeline import reload_components, run_labeled_query
from ..trace import store
from ..trace.events import FailureStage, Trace

RESULTS_PATH = EVAL_DIR / "results.json"


@dataclass
class QueryResult:
    query_id: str
    query: str
    ground_truth: str
    indicated: str
    correct: bool
    answer_preview: str
    trace_overhead_ms: float
    total_duration_ms: float
    failure_reason: str = ""
    intent: str = ""

    def to_dict(self) -> dict:
        return {
            "query_id": self.query_id,
            "query": self.query,
            "ground_truth": self.ground_truth,
            "indicated": self.indicated,
            "correct": self.correct,
            "answer_preview": self.answer_preview,
            "trace_overhead_ms": self.trace_overhead_ms,
            "total_duration_ms": self.total_duration_ms,
            "failure_reason": self.failure_reason,
            "intent": self.intent,
        }


@dataclass
class EvalResults:
    ran_at: str
    localization_accuracy: float
    correct: int
    total: int
    gemini_enabled: bool
    avg_overhead_ms: float
    max_overhead_ms: float
    p95_overhead_ms: float
    per_query: list[QueryResult] = field(default_factory=list)
    confusion: dict[str, dict[str, int]] = field(default_factory=dict)
    accuracy_by_intent: dict[str, dict[str, float]] = field(default_factory=dict)
    intent_classification_accuracy: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "ran_at": self.ran_at,
            "localization_accuracy": round(self.localization_accuracy, 4),
            "correct": self.correct,
            "total": self.total,
            "gemini_enabled": self.gemini_enabled,
            "overhead_ms": {
                "avg": round(self.avg_overhead_ms, 3),
                "max": round(self.max_overhead_ms, 3),
                "p95": round(self.p95_overhead_ms, 3),
            },
            "per_query": [q.to_dict() for q in self.per_query],
            "confusion": self.confusion,
            "accuracy_by_intent": self.accuracy_by_intent,
            "intent_classification_accuracy": (
                round(self.intent_classification_accuracy, 4)
                if self.intent_classification_accuracy is not None
                else None
            ),
        }


def _load_queries() -> list[dict]:
    if not QUERIES_FILE.exists():
        raise FileNotFoundError(f"queries file not found: {QUERIES_FILE}")
    data = json.loads(QUERIES_FILE.read_text(encoding="utf-8"))
    return data.get("queries", [])


def _percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    k = (len(s) - 1) * (p / 100.0)
    f = int(k)
    c = min(f + 1, len(s) - 1)
    if f == c:
        return s[f]
    return s[f] + (s[c] - s[f]) * (k - f)


def run_eval(clear_previous: bool = True) -> EvalResults:
    """Run the full labeled batch. Persists traces + results.json."""
    ensure_dirs()
    if clear_previous:
        store.clear()

    # Fresh corpus/index build in case docs changed during dev.
    reload_components()
    queries = _load_queries()

    per_query: list[QueryResult] = []
    confusion: dict[str, dict[str, int]] = {}
    overheads: list[float] = []
    intent_totals: dict[str, int] = {}
    intent_correct: dict[str, int] = {}
    intent_classification_correct = 0
    intent_classification_total = 0

    for spec in queries:
        # Mock-drift the generation-stage probes so the failure mode triggers
        # deterministically even without a live Gemini key.
        mock_drift = spec.get("ground_truth_failure") == "generation" and not has_gemini()
        overrides = dict(mock_drift=mock_drift)
        # Allow per-query context budget to exercise assembly failures.
        if "context_max_chars" in spec:
            overrides["context_max_chars"] = spec["context_max_chars"]
        trace: Trace = run_labeled_query(spec, **overrides)

        gt = (trace.ground_truth_failure or FailureStage.NONE).value
        ind = trace.indicated_failure.value
        correct = (trace.ground_truth_failure is not None
                   and trace.indicated_failure == trace.ground_truth_failure)

        per_query.append(
            QueryResult(
                query_id=trace.query_id,
                query=trace.query,
                ground_truth=gt,
                indicated=ind,
                correct=correct,
                answer_preview=(trace.answer[:140] + "…") if len(trace.answer) > 140 else trace.answer,
                trace_overhead_ms=trace.trace_overhead_ms,
                total_duration_ms=trace.total_duration_ms,
                failure_reason=trace.failure_reason,
                intent=trace.intent,
            )
        )
        overheads.append(trace.trace_overhead_ms)
        confusion.setdefault(gt, {})
        confusion[gt][ind] = confusion[gt].get(ind, 0) + 1
        # Intent-stratified accuracy (Phase 3).
        intent_totals[trace.intent] = intent_totals.get(trace.intent, 0) + 1
        if correct:
            intent_correct[trace.intent] = intent_correct.get(trace.intent, 0) + 1
        expected_intent = spec.get("expected_intent")
        if expected_intent:
            intent_classification_total += 1
            if trace.intent == expected_intent:
                intent_classification_correct += 1

    correct_count = sum(1 for q in per_query if q.correct)
    total = len(per_query)
    accuracy = correct_count / total if total else 0.0

    accuracy_by_intent = {
        intent: {
            "accuracy": round(intent_correct.get(intent, 0) / intent_totals[intent], 4),
            "correct": intent_correct.get(intent, 0),
            "total": intent_totals[intent],
        }
        for intent in sorted(intent_totals)
    }
    intent_classification_accuracy = (
        intent_classification_correct / intent_classification_total
        if intent_classification_total
        else None
    )

    results = EvalResults(
        ran_at=datetime.now(timezone.utc).isoformat(),
        localization_accuracy=accuracy,
        correct=correct_count,
        total=total,
        gemini_enabled=has_gemini(),
        avg_overhead_ms=sum(overheads) / len(overheads) if overheads else 0.0,
        max_overhead_ms=max(overheads) if overheads else 0.0,
        p95_overhead_ms=_percentile(overheads, 95),
        per_query=per_query,
        confusion=confusion,
        accuracy_by_intent=accuracy_by_intent,
        intent_classification_accuracy=intent_classification_accuracy,
    )

    RESULTS_PATH.write_text(json.dumps(results.to_dict(), indent=2), encoding="utf-8")
    return results


if __name__ == "__main__":
    # CLI entry: python -m server.eval.runner
    res = run_eval()
    print(f"\n=== Eval results ({res.ran_at}) ===")
    print(f"Gemini enabled : {res.gemini_enabled}")
    print(f"Accuracy       : {res.correct}/{res.total} = {res.localization_accuracy:.1%}")
    if res.intent_classification_accuracy is not None:
        print(f"Intent accuracy: {res.intent_classification_accuracy:.1%}")
    print(f"Overhead avg   : {res.avg_overhead_ms:.3f} ms/query")
    print(f"Overhead p95   : {res.p95_overhead_ms:.3f} ms/query")
    print(f"Results written: {RESULTS_PATH}")
    print("\nPer-query:")
    for q in res.per_query:
        flag = "OK " if q.correct else "XX "
        print(f"  {flag}{q.query_id}  gt={q.ground_truth:14s} indicated={q.indicated:14s}  {q.query[:50]}")
