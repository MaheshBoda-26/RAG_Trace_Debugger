"""Process-level in-memory metrics for /api/health.

Counters are intentionally not persisted: they reset on restart, which is
fine for a demo-grade diagnostic tool (per roadmap Phase 2).
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Metrics:
    started_at: float = field(default_factory=time.monotonic)
    total_queries_served: int = 0
    error_count: int = 0
    # Per-query trace_overhead_ms samples (bounded ring).
    _overhead_samples: list[float] = field(default_factory=list)
    _overhead_cap: int = 1000

    def record_query(self, overhead_ms: Optional[float] = None) -> None:
        self.total_queries_served += 1
        if overhead_ms is not None:
            self._overhead_samples.append(float(overhead_ms))
            if len(self._overhead_samples) > self._overhead_cap:
                self._overhead_samples.pop(0)

    def record_error(self) -> None:
        self.error_count += 1

    @property
    def uptime_seconds(self) -> float:
        return time.monotonic() - self.started_at

    @property
    def avg_overhead_ms(self) -> float:
        if not self._overhead_samples:
            return 0.0
        return sum(self._overhead_samples) / len(self._overhead_samples)

    def to_dict(self) -> dict:
        return {
            "uptime_seconds": round(self.uptime_seconds, 3),
            "total_queries_served": self.total_queries_served,
            "error_count": self.error_count,
            "avg_overhead_ms": round(self.avg_overhead_ms, 3),
        }


metrics = Metrics()

__all__ = ["Metrics", "metrics"]
