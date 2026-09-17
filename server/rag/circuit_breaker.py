"""Circuit breaker for outbound LLM calls.

After CIRCUIT_BREAKER_THRESHOLD consecutive failures, the circuit "opens" and
calls fail fast (returning the mock fallback) for CIRCUIT_BREAKER_RESET_SECONDS.
After the reset window the circuit half-opens and a single real attempt is
allowed through: success closes it, failure re-opens it.

Thread-safe (a lock guards all state transitions) so it behaves correctly under
FastAPI's threadpool execution of sync endpoints.
"""
from __future__ import annotations

import threading
import time
from typing import Callable, TypeVar

from ..config import (
    CIRCUIT_BREAKER_RESET_SECONDS,
    CIRCUIT_BREAKER_THRESHOLD,
)

T = TypeVar("T")

CLOSED = "closed"
OPEN = "open"
HALF_OPEN = "half_open"


class CircuitBreaker:
    """Classic closed → open → half-open circuit breaker."""

    def __init__(
        self,
        *,
        threshold: int = CIRCUIT_BREAKER_THRESHOLD,
        reset_seconds: float = CIRCUIT_BREAKER_RESET_SECONDS,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._threshold = max(1, int(threshold))
        self._reset_seconds = float(reset_seconds)
        self._clock = clock
        self._lock = threading.Lock()
        self._state = CLOSED
        self._consecutive_failures = 0
        self._opened_at = 0.0

    # ---- introspection ------------------------------------------------------
    @property
    def state(self) -> str:
        with self._lock:
            if self._state == OPEN and (self._clock() - self._opened_at) >= self._reset_seconds:
                # Lazily transition to half-open when the reset window elapses.
                self._state = HALF_OPEN
            return self._state

    @property
    def consecutive_failures(self) -> int:
        with self._lock:
            return self._consecutive_failures

    def seconds_until_retry(self) -> float:
        """How long until the breaker half-opens (0 when calls are allowed)."""
        with self._lock:
            if self._state != OPEN:
                return 0.0
            remaining = self._reset_seconds - (self._clock() - self._opened_at)
            return max(0.0, remaining)

    # ---- guarded execution --------------------------------------------------
    def allow_attempt(self) -> bool:
        """True when a real outbound attempt should be made right now."""
        return self.state != OPEN

    def record_success(self) -> None:
        with self._lock:
            self._state = CLOSED
            self._consecutive_failures = 0

    def record_failure(self) -> None:
        with self._lock:
            self._consecutive_failures += 1
            if self._state == HALF_OPEN or self._consecutive_failures >= self._threshold:
                self._state = OPEN
                self._opened_at = self._clock()

    def call(self, fn: Callable[[], T]) -> T:
        """Run fn() under the breaker, raising CircuitOpenError when open."""
        if not self.allow_attempt():
            raise CircuitOpenError(
                f"circuit open; retry in {self.seconds_until_retry():.1f}s"
            )
        try:
            result = fn()
        except Exception:
            self.record_failure()
            raise
        self.record_success()
        return result


class CircuitOpenError(RuntimeError):
    """Raised when a call is attempted while the circuit is open."""


# Process-level breaker shared by every generation call.
generation_breaker = CircuitBreaker()


__all__ = [
    "CircuitBreaker",
    "CircuitOpenError",
    "generation_breaker",
    "CLOSED",
    "OPEN",
    "HALF_OPEN",
]
