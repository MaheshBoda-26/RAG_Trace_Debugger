"""Eval API routes.

POST /api/eval/run     run the full labeled batch -> results
GET  /api/eval/results latest results.json
GET  /api/eval/queries list the labeled query set
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException

from ..config import EVAL_DIR, QUERIES_FILE, ensure_dirs
from ..eval.runner import RESULTS_PATH, run_eval

router = APIRouter(prefix="/api/eval", tags=["eval"])


@router.get("/queries")
def get_queries():
    if not QUERIES_FILE.exists():
        raise HTTPException(status_code=404, detail={"error": "queries_not_found"})
    return json.loads(QUERIES_FILE.read_text(encoding="utf-8"))


@router.post("/run")
def post_run_eval():
    """Run the full labeled batch, persist results.json, and return it."""
    results = run_eval()
    return results.to_dict()


@router.get("/results")
def get_results():
    if not RESULTS_PATH.exists():
        raise HTTPException(status_code=404, detail={"error": "no_eval_results", "hint": "POST /api/eval/run first"})
    return json.loads(RESULTS_PATH.read_text(encoding="utf-8"))
