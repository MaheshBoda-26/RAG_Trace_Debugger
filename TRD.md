# Technical Requirements Document: RAG Trace Debugger

## 1. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Backend language | Python 3.11 | Standard for RAG/ML tooling, matches the ecosystem of embedding/rerank/LLM libraries |
| Backend framework | FastAPI | Async support, automatic OpenAPI docs, fast to stand up in a hackathon timeframe |
| Frontend framework | React 18 + Vite | Fast dev loop, component model fits a timeline/dashboard UI well |
| Styling | Tailwind CSS | Rapid UI without hand-writing CSS under time pressure |
| Database (demo) | SQLite | Zero setup, file-based, sufficient for a single-machine hackathon demo |
| Database (documented future path) | PostgreSQL | Noted as the production path if this became a real internal tool; not built in the hackathon window |
| Hosting (demo) | Local machine / single Docker container | No infra budget or need; live demo runs locally at the venue |

## 2. Libraries and Packages

| Library | Version (pin) | Purpose |
|---|---|---|
| fastapi | ^0.115 | Backend API server |
| uvicorn | ^0.30 | ASGI server to run FastAPI |
| pydantic | ^2.8 | Request/response validation and trace event schema |
| sqlite3 (stdlib) | — | Trace store persistence, no extra dependency needed |
| sentence-transformers | ^3.0 | Embedding model for vector retrieval (e.g., `all-MiniLM-L6-v2`) |
| rank-bm25 | ^0.2 | Sparse/keyword retrieval component of hybrid search |
| cross-encoder (via sentence-transformers) | ^3.0 | Reranking retrieved candidates |
| anthropic or openai (pick one) | latest stable | LLM call for the generation stage |
| react | ^18 | Frontend UI |
| vite | ^5 | Frontend build/dev server |
| tailwindcss | ^3.4 | Styling |
| axios | ^1.7 | Frontend → backend API calls |
| pytest | ^8 | Backend unit tests |

## 3. APIs and Third-Party Integrations

- **LLM provider API** (Anthropic or OpenAI, whichever the builder already has a key for) — used only in the generation stage of the demo RAG pipeline. This is the only external network dependency; kept to one provider to reduce demo-day risk.
- No other third-party integrations. The project intentionally avoids dependency on OneInbox's actual internal systems, since this is a standalone demo pipeline built to showcase the debugging concept.

## 4. Data Models and Schema

**`traces` table** (SQLite)

| Column | Type | Notes |
|---|---|---|
| query_id | TEXT (PK) | UUID generated per incoming query |
| query_text | TEXT | Original user query |
| created_at | TIMESTAMP | When the query was received |

**`trace_events` table**

| Column | Type | Notes |
|---|---|---|
| id | INTEGER (PK, autoincrement) | |
| query_id | TEXT (FK → traces.query_id) | Links event to its parent query |
| stage | TEXT | One of: `query_rewrite`, `retrieval`, `rerank`, `assemble`, `generate` |
| input_json | TEXT (JSON) | Stage input, serialized |
| output_json | TEXT (JSON) | Stage output, serialized (includes scores where relevant) |
| latency_ms | REAL | Time taken by this stage |
| timestamp | TIMESTAMP | When this event was logged |

This two-table design keeps a query and its ordered stage events cleanly separated, and lets the dashboard reconstruct a full timeline with a single query on `trace_events` filtered by `query_id`, ordered by `timestamp`.

## 5. Authentication and Authorization

Out of scope for this hackathon. The demo runs single-user, locally, with no login flow. This is explicitly called out in the PRD's "Out of scope" section. If this became a real internal tool, the noted future path would be a simple API-key or SSO gate in front of the FastAPI server — not built here.

## 6. Performance Requirements

- **Tracing overhead**: no hard target is pre-committed (see PRD's honest-reporting stance); the goal is for tracing overhead to be small relative to the LLM call itself, and this will be measured and reported, not assumed.
- **Concurrent users**: not a requirement for this project — it's a single-user diagnostic tool demoed by one person at a time, not a multi-user production service.
- **Dashboard responsiveness**: trace lookups should feel instant for a demo corpus of 10–20 documents and a few dozen test queries; this scale does not stress SQLite or a simple REST API.

## 7. Security Requirements

- No sensitive or real customer data is used — the demo corpus is custom-built and synthetic.
- LLM API keys are read from environment variables, never hardcoded or committed to the repository.
- Since there's no auth layer, the demo must not be exposed on a public network during or after the event; it stays local.

## 8. Deployment and Environment Setup

| Environment | Setup |
|---|---|
| Dev | Local Python virtualenv + `npm run dev` for frontend, SQLite file in the repo's `.gitignore`d data folder |
| Staging | Not applicable for a 9-day hackathon scope |
| Production | Not applicable for a 9-day hackathon scope; noted only as a "future work" direction (Postgres, auth, containerized deployment) in case of continued development post-hackathon |

Single `docker-compose.yml` (optional, if time allows) to run backend + a static build of the frontend together for the live demo, reducing setup risk on presentation day.

## 9. Testing Approach

- **Unit tests** (pytest): cover the trace collector's `log_stage()` function, the trace store read/write logic, and each pipeline stage's core logic in isolation (e.g., retrieval returns expected candidates for a known query against the test corpus).
- **Integration tests**: run a full query through the instrumented pipeline end-to-end and assert that a complete, correctly-ordered trace is written and retrievable via the API.
- **Evaluation-as-testing**: the PRD's evaluation plan (labeled broken queries vs. dashboard-indicated failure stage) doubles as the project's most important "test" — it validates the tool's actual purpose, not just that the code runs.
- **e2e / UI testing**: no dedicated framework (e.g., Playwright) planned given the time budget; the dashboard will be manually verified against the test query set before the live demo.
