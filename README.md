# 🎯 RAG Trace Debugger

> **Observability, Failure Localization, and Trace Analysis for Retrieval-Augmented Generation (RAG) Pipelines**

[![Python 3.9+](https://img.shields.io/badge/python-3.9%2B-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-009688.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Trace Overhead](https://img.shields.io/badge/Trace%20Overhead-%3C%200.1ms-brightgreen.svg)]()
[![Localization Accuracy](https://img.shields.io/badge/Localization%20Accuracy-85.7%25-success.svg)]()

---

## 📌 Overview

**RAG Trace Debugger** is a framework-agnostic observability tool designed to pinpoint the exact failure stage in Retrieval-Augmented Generation (RAG) pipelines. 

When a RAG system outputs a hallucinated, vague, or incorrect response, determining **which** component failed—whether the query rewrite dropped key terms, vector retrieval missed the document, reranking filtered out the relevant chunk, prompt assembly truncated the context, or the LLM ignored the retrieved text—can be tedious and error-prone.

RAG Trace Debugger solves this by instrumenting each pipeline stage, capturing structured trace events, and running a **deterministic failure localizer** that attributes bad responses to their root-cause stage with high accuracy and microsecond-level overhead.

---

## ✨ Key Features

- 🔍 **5-Stage Pipeline Instrumentation**: Complete trace logging across `query_rewrite`, `retrieval`, `rerank`, `assembly`, and `generation`.
- 🎯 **Automated Failure Localizer**: A priority-based heuristic algorithm that identifies root-cause stage failures with **85.7% accuracy** on benchmark evaluation sets.
- ⚡ **Ultra-Low Tracing Overhead**: Adds **< 0.06 ms average latency** per query, ensuring zero performance impact on production traffic.
- 🤖 **Hybrid Execution Engine**: Supports deterministic local mock mode (for fast testing without API keys) and live LLM integration with Google Gemini (`gemini-2.5-flash`) & embeddings (`text-embedding-004`).
- 📊 **Built-in Evaluation Suite**: Includes a labeled query dataset with automated batch execution, confusion matrix reporting, and accuracy tracking persisted to `data/eval/results.json`.
- 🌐 **RESTful API Backend**: FastAPI server with CORS, health monitoring, trace inspection, corpus browsing, and ad-hoc query execution endpoints.

---

## 🏗️ Architecture & Pipeline Flow

```
                     +---------------------------------------+
                     |             Incoming Query            |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |         1. Query Rewrite Stage        |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |          2. Retrieval Stage           |
                     |     (Dense Embeddings + BM25)        |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |           3. Rerank Stage             |
                     |      (Hybrid Score & Top-K)          |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |          4. Assembly Stage            |
                     |     (Context Budget & Truncation)     |
                     +---------------------------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |         5. Generation Stage           |
                     |      (LLM Prompting / Gemini)         |
                     +---------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                              Trace Collector & Store                             |
|  - Log Stage Event (inputs, outputs, candidates, scores, latency, metadata)     |
|  - Compute Trace Overhead (ms)                                                  |
+---------------------------------------------------------------------------------+
                                         |
                                         v
+---------------------------------------------------------------------------------+
|                            Automated Failure Localizer                          |
|  Evaluates root-cause failure stage using structural deficit priority ranking:  |
|  1. RETRIEVAL -> 2. RERANK -> 3. ASSEMBLY -> 4. GENERATION -> 5. QUERY_REWRITE  |
+---------------------------------------------------------------------------------+
```

---

## 🎯 Failure Localization Logic

The failure localizer evaluates traces using a **structural precedence hierarchy**. Structural deficits—where necessary information failed to reach downstream stages—are evaluated **before** checking generation, preventing downstream symptoms from masking upstream root causes.

| Failure Stage | Diagnostic Condition |
| :--- | :--- |
| **`RETRIEVAL`** | Ground truth required chunks were **not retrieved** in candidate set. |
| **`RERANK`** | Required chunks were retrieved but **dropped** during reranking/filtering. |
| **`ASSEMBLY`** | Kept chunks contain key terms, but prompt truncation **omitted them** from final context. |
| **`GENERATION`** | Context contains key terms, but model answer **misses them** (hallucination/drift). |
| **`QUERY_REWRITE`** | Query rewrite materially **altered/dropped core terms** from original prompt. |
| **`NONE`** | All stages completed successfully with expected keyword and chunk coverage. |

---

## 📂 Project Structure

```
RAG_Trace_Debugger/
├── server/
│   ├── api/
│   │   ├── routes_corpus.py   # GET /api/corpus (document & chunk viewer)
│   │   ├── routes_eval.py     # POST /api/eval/run, GET /api/eval/results, GET /api/eval/queries
│   │   └── routes_traces.py   # GET /api/traces, POST /api/query, GET /api/traces/{id}
│   ├── data/
│   │   ├── corpus/            # Markdown & text document corpus
│   │   ├── queries/           # queries.json (labeled benchmark test set)
│   │   ├── traces/            # JSON trace storage
│   │   └── eval/              # Evaluation results (results.json)
│   ├── eval/
│   │   └── runner.py          # Benchmark evaluation runner & accuracy reporter
│   ├── rag/
│   │   ├── bm25.py            # BM25 lexical retriever implementation
│   │   ├── corpus.py          # Document loader & chunker
│   │   ├── embeddings.py      # Dense vector embeddings generator & cache
│   │   ├── pipeline.py        # 5-Stage RAG execution pipeline coordinator
│   │   ├── retrieval.py       # Hybrid retrieval & RRF (Reciprocal Rank Fusion)
│   │   └── stages.py          # Stage implementations (rewrite, retrieval, rerank, assembly, generation)
│   ├── trace/
│   │   ├── collector.py       # Context-managed trace event collector
│   │   ├── events.py          # Pydantic models for StageEvent, Trace, Candidate, FailureStage
│   │   ├── localize.py        # Failure localization heuristic engine
│   │   └── store.py           # Trace persistence layer
│   ├── config.py              # Environment configuration & directory management
│   ├── main.py                # FastAPI application entry point
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Environment template
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites

- **Python 3.9+**
- Virtual environment tool (`venv`)

### 2. Installation

Clone the repository and set up a virtual environment:

```bash
git clone https://github.com/MaheshBoda-26/RAG_Trace_Debugger.git
cd RAG_Trace_Debugger

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r server/requirements.txt
```

### 3. Environment Setup (Optional)

Copy the environment configuration file:

```bash
cp server/.env.example server/.env
```

To run with live Google Gemini LLM & Embeddings, set your API key in `server/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004
```

> **Note**: If `GEMINI_API_KEY` is not provided, the pipeline operates in **Mock Mode**, using hybrid BM25 lexical matching and deterministic fallback generation so you can run the entire system offline.

---

## 🚀 Running the Server & Evaluation

### Start the FastAPI Server

Run the server via `uvicorn`:

```bash
uvicorn server.main:app --reload --port 8000
```
Or run directly via python:
```bash
python -m server.main
```

The API will be live at `http://127.0.0.1:8000`. You can test health status at:
`http://127.0.0.1:8000/api/health`

### Run the Benchmark Evaluation Suite

To run the labeled evaluation suite across all benchmark queries and print the localization accuracy report:

```bash
python -m server.eval.runner
```

#### Sample Benchmark Output:
```text
=== Eval results (2026-07-21T17:47:10.120084+00:00) ===
Gemini enabled : False
Accuracy       : 12/14 = 85.7%
Overhead avg   : 0.053 ms/query
Overhead p95   : 0.098 ms/query
Results written: .../server/data/eval/results.json

Per-query:
  OK q01  gt=none           indicated=none            How many active multi-currency wallets can I have...
  OK q02  gt=none           indicated=none            What is the first-response time for a Severity-1...
  OK q05  gt=rerank         indicated=rerank          What is the cost of an additional seat on Growth...
  OK q07  gt=generation     indicated=generation      Can I stream my audit logs to my own S3 bucket...
  OK q12  gt=rerank         indicated=rerank          Summarize what the Starter plan does and does not...
```

---

## 📡 API Reference

### Health & Corpus

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Server health check, document & chunk counts, Gemini status |
| `GET` | `/api/corpus` | Returns document corpus with associated chunks and metadata |

### Traces & Queries

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/traces` | List trace summaries (supports filtering by `?failure=<stage>`) |
| `GET` | `/api/traces/{query_id}` | Retrieve full trace details including stage events & candidates |
| `POST` | `/api/query` | Run an ad-hoc query through the pipeline & persist trace |
| `DELETE` | `/api/traces` | Clear all saved trace records |

#### Sample Request: `POST /api/query`
```json
{
  "query": "What is the refund window for a new subscription?",
  "needed_chunk_ids": ["refund_policy_c01"],
  "key_terms": ["14 days", "refund"],
  "retrieval_k": 20,
  "rerank_k": 5
}
```

### Evaluation

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/eval/queries` | List all benchmark queries and ground truth labels |
| `POST` | `/api/eval/run` | Execute evaluation batch and update metrics |
| `GET` | `/api/eval/results` | Fetch latest evaluation results JSON |

---

## 📊 Performance Benchmarks

| Metric | Result | Target / Requirement | Status |
| :--- | :--- | :--- | :--- |
| **Localization Accuracy** | **85.7%** (12/14 queries) | > 80% | ✅ Passed |
| **Average Tracing Overhead** | **0.053 ms** | < 5.0 ms | ✅ Passed |
| **P95 Tracing Overhead** | **0.098 ms** | < 10.0 ms | ✅ Passed |
| **Framework Agnostic** | Pydantic Event Schema | OpenTelemetry compatible | ✅ Passed |

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
