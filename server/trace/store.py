"""JSON file trace store — one record per query, keyed by query id.

Layout: <TRACES_DIR>/<query_id>.json  (a single Trace object).

Human-readable on purpose: you can open any trace in a text editor during the
live demo (PRD: "readable output" + JSON-file storage decision).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from ..config import TRACES_DIR, ensure_dirs
from .events import FailureStage, Trace, TraceSummary, summarize


def _path_for(query_id: str) -> Path:
    # query_id is generated (uuid hex) / eval ids (q01..) — safe for filenames,
    # but we harden against path traversal anyway.
    safe = "".join(c for c in query_id if c.isalnum() or c in ("_", "-"))
    if safe != query_id:
        raise ValueError(f"unsafe query_id: {query_id!r}")
    return TRACES_DIR / f"{safe}.json"


def save(trace: Trace) -> Path:
    """Persist a trace to disk, overwriting any prior record for this id."""
    ensure_dirs()
    path = _path_for(trace.query_id)
    path.write_text(trace.model_dump_json(indent=2), encoding="utf-8")
    return path


def load(query_id: str) -> Optional[Trace]:
    """Load a single trace by id, or None if it doesn't exist."""
    path = _path_for(query_id)
    if not path.exists():
        return None
    return Trace.model_validate_json(path.read_text(encoding="utf-8"))


def delete(query_id: str) -> bool:
    path = _path_for(query_id)
    if path.exists():
        path.unlink()
        return True
    return False


def list_summaries(
    *,
    failure: Optional[FailureStage] = None,
    limit: Optional[int] = None,
) -> list[TraceSummary]:
    """Return compact summaries of all stored traces, newest first.

    Optionally filter by indicated failure stage.
    """
    ensure_dirs()
    files = sorted(TRACES_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    out: list[TraceSummary] = []
    for path in files:
        try:
            trace = Trace.model_validate_json(path.read_text(encoding="utf-8"))
        except Exception:
            # Skip corrupt traces rather than crashing the list endpoint.
            continue
        if failure is not None and trace.indicated_failure != failure:
            continue
        out.append(summarize(trace))
        if limit is not None and len(out) >= limit:
            break
    return out


def all_traces() -> list[Trace]:
    ensure_dirs()
    files = sorted(TRACES_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    traces: list[Trace] = []
    for path in files:
        try:
            traces.append(Trace.model_validate_json(path.read_text(encoding="utf-8")))
        except Exception:
            continue
    return traces


def clear() -> int:
    """Remove all stored traces. Returns the count deleted."""
    ensure_dirs()
    files = list(TRACES_DIR.glob("*.json"))
    for path in files:
        path.unlink()
    return len(files)


def to_dashboard_json(trace: Trace) -> str:
    """Convenience: pretty JSON suitable for an API response body."""
    return trace.model_dump_json(indent=2)


def summaries_to_json(summaries: list[TraceSummary]) -> str:
    return json.dumps([s.model_dump(mode="json") for s in summaries], indent=2, default=str)
