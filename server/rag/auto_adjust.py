"""Parameter auto-adjustment suggestions for the self-healing loop.

Given the localized failure stage, suggest pipeline parameter changes that are
most likely to fix the failure class, then re-run the query with them (the
/api/query/heal endpoint applies them and returns a before/after comparison).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional

from ..trace.events import FailureStage
from .pipeline import DEFAULT_CONTEXT_MAX_CHARS, DEFAULT_RETRIEVAL_K, DEFAULT_RERANK_K


@dataclass
class AdjustmentSuggestion:
    """A concrete parameter adjustment for one localized failure stage."""

    failure_stage: str
    adjusted_params: dict[str, Any] = field(default_factory=dict)
    rationale: str = ""
    # Populated by the caller (heal endpoint) after re-running the query.
    applied: bool = False
    healed_query_id: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "failure_stage": self.failure_stage,
            "adjusted_params": self.adjusted_params,
            "rationale": self.rationale,
            "applied": self.applied,
            "healed_query_id": self.healed_query_id,
        }


def _bump(current: Any, *, by: int, cap: int, default: int) -> int:
    """Increase a parameter by `by`, capped; None means 'use the default'."""
    try:
        base = default if current is None else int(current)
    except (TypeError, ValueError):
        base = default
    return min(base + by, cap)


def suggest_adjustment(
    failure_stage: FailureStage | str,
    current_params: dict[str, Any],
) -> AdjustmentSuggestion:
    """Map a failure stage to concrete parameter increases.

    current_params keys: retrieval_k, rerank_k, context_max_chars (any may be
    None, meaning "pipeline default was used").
    """
    stage = FailureStage(failure_stage)

    retrieval_k = current_params.get("retrieval_k")
    rerank_k = current_params.get("rerank_k")
    context_max_chars = current_params.get("context_max_chars")

    if stage == FailureStage.RETRIEVAL:
        # Widen the candidate pool; a +1 on rerank_k keeps the extra context
        # from being immediately pruned by an unchanged rerank budget.
        return AdjustmentSuggestion(
            failure_stage=stage.value,
            adjusted_params={
                "retrieval_k": _bump(retrieval_k, by=5, cap=50, default=DEFAULT_RETRIEVAL_K),
                "rerank_k": _bump(rerank_k, by=1, cap=10, default=DEFAULT_RERANK_K),
            },
            rationale=(
                "Retrieval missed a needed chunk. Increasing retrieval_k widens the "
                "candidate pool (better recall); rerank_k +1 keeps the strongest of "
                "the new candidates from being immediately pruned."
            ),
        )

    if stage == FailureStage.RERANK:
        # The needed chunk WAS retrieved but pruned — widen the keep budget.
        return AdjustmentSuggestion(
            failure_stage=stage.value,
            adjusted_params={
                "retrieval_k": _bump(retrieval_k, by=0, cap=50, default=DEFAULT_RETRIEVAL_K),
                "rerank_k": _bump(rerank_k, by=2, cap=10, default=DEFAULT_RERANK_K),
            },
            rationale=(
                "A needed chunk was retrieved but dropped at rerank. Increasing "
                "rerank_k keeps more of the retrieved candidates in the final "
                "context."
            ),
        )

    if stage == FailureStage.ASSEMBLY:
        # Information existed in kept chunks but was truncated out of the context.
        return AdjustmentSuggestion(
            failure_stage=stage.value,
            adjusted_params={
                "context_max_chars": _bump(
                    context_max_chars, by=400, cap=4000, default=DEFAULT_CONTEXT_MAX_CHARS
                ),
            },
            rationale=(
                "A key detail existed in the kept chunks but was truncated out of the "
                "assembled context. Increasing context_max_chars preserves the tail "
                "of the context where long passages get cut."
            ),
        )

    if stage == FailureStage.GENERATION:
        # The context was complete; the model ignored or misused it. The heal
        # endpoint re-runs with a stricter grounding prompt (see
        # generate_answer(strict_grounding=True)) and without mock drift.
        return AdjustmentSuggestion(
            failure_stage=stage.value,
            adjusted_params={"strict_grounding": True},
            rationale=(
                "The needed information reached the model but the answer missed it. "
                "Re-running with a stricter grounding prompt instructs the model to "
                "restate the relevant context sentences verbatim."
            ),
        )

    if stage == FailureStage.QUERY_REWRITE:
        # Rewrite lost intent — bypassing the rewrite restores the raw query.
        return AdjustmentSuggestion(
            failure_stage=stage.value,
            adjusted_params={"skip_rewrite": True},
            rationale=(
                "Query rewrite replaced the original tokens and may have lost intent. "
                "Re-running with the raw (un-rewritten) query bypasses the rewrite stage."
            ),
        )

    # FailureStage.NONE (or unknown) — nothing to fix.
    return AdjustmentSuggestion(
        failure_stage=stage.value,
        adjusted_params={},
        rationale="No failure detected; no adjustment needed.",
    )


__all__ = ["AdjustmentSuggestion", "suggest_adjustment"]
