# Project Rules: RAG Trace Debugger

## 1. What We Use

- **FastAPI** for the backend, with pydantic models for every request/response and trace event — no untyped dicts passed across API boundaries.
- **SQLite via stdlib `sqlite3`** for the trace store — no ORM. At this scale, raw SQL with parameterized queries is simpler to reason about and faster to build than adding SQLAlchemy for a 9-day project.
- **React functional components with hooks** (`useState`, `useEffect`) — no class components.
- **Tailwind utility classes** for styling — no separate CSS files, no CSS-in-JS libraries.
- **A single shared `log_stage()` function** as the only way any pipeline stage writes a trace event — every stage calls the same function with the same signature, so the trace format is consistent by construction.
- **One LLM provider** for the generation stage (pick Anthropic or OpenAI at project start and stick with it) — avoids demo-day risk from juggling multiple provider SDKs and keys.

## 2. What We Avoid

- **No ORM** (SQLAlchemy, Prisma, etc.) — adds setup and abstraction overhead this project's scale doesn't need.
- **No authentication/authorization scaffolding** — explicitly out of scope per the PRD; do not add login flows, JWTs, or session middleware even if it seems "more complete."
- **No premature multi-provider abstraction** for the LLM call — do not build a provider-agnostic adapter layer for one hackathon demo; hardcode the single chosen provider's SDK call.
- **No microservices split** — backend, pipeline, and tracing logic all live in one FastAPI app/process. Splitting into separate services would add deployment complexity with no benefit at this scale.
- **No client-side state management library** (Redux, Zustand, etc.) — the dashboard's state (selected query, trace data) is simple enough for local component state and prop passing.
- **No auto-fix or auto-correction logic in the debugger** — per the PRD, this tool localizes failures, it does not attempt to resolve them. Do not add "suggested fix" features; that's explicitly future work, not this project.

## 3. Libraries (Approved List, With Version Pins)

See TRD.md Section 2 for the full table. Quick reference for version pins that matter most for reproducibility during the hackathon:
- `fastapi ^0.115`, `uvicorn ^0.30`, `pydantic ^2.8`
- `sentence-transformers ^3.0`, `rank-bm25 ^0.2`
- `react ^18`, `vite ^5`, `tailwindcss ^3.4`

Do not upgrade major versions mid-project once the environment is working — a broken dependency two days before the live demo is a bigger risk than an outdated minor version.

## 4. Error Handling Rules

- **Pipeline stage errors**: if any stage throws (e.g., the LLM API call fails or times out), the trace collector still logs a `trace_event` for that stage marked with an `error` field containing the exception message, so failed queries are still visible in the dashboard rather than silently disappearing.
- **API errors**: FastAPI endpoints return structured JSON errors (`{"error": "message"}`) with appropriate HTTP status codes (4xx for bad input, 5xx for internal failures) — never a raw stack trace to the frontend.
- **Frontend display**: if a trace fails to load or a query fails to run, the dashboard shows a clear inline message ("This query failed at the generation stage: [error]") rather than a blank screen or generic "Something went wrong."
- **Logging**: all backend errors are also printed to console/log output during the hackathon (no need for a full logging service at this scale) so they're visible during live debugging at the venue.

## 5. Boundaries of an AI Coding Assistant

**Can change freely, without asking first:**
- Code inside `backend/app/pipeline/`, `backend/app/tracing/`, and `frontend/src/components/` — the core implementation work of this project.
- Test files in `backend/tests/` and `eval/`.
- Non-destructive refactors (renaming variables, extracting functions) within those same areas.

**Needs a human review before merging/finalizing:**
- Any change to the trace event schema (`models.py`, the two SQLite table definitions) — this is the contract the whole system depends on; changing it affects both pipeline and dashboard code.
- Any change to `docker-compose.yml` or deployment/startup scripts, since these are what run live on demo day and a working setup should not be touched casually close to the presentation.
- Any change to the labeled `eval/test_queries.json` ground-truth labels — these are the "answer key" for the evaluation plan and should be human-verified, not silently edited.

**Must not touch on its own:**
- `data/corpus/` documents once the test corpus is finalized and the ground-truth labels in `eval/test_queries.json` are set against them — changing the corpus after labeling invalidates the evaluation.
- API keys or `.env` files — read from environment, never generated, hardcoded, or committed.
- Anything framed as adding authentication, multi-tenancy, or production-hardening features — these are explicitly out of scope per the PRD, and adding them "helpfully" would be scope creep the 9-day timeline can't absorb.
