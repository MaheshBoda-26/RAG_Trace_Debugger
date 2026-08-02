# RAG Trace Debugger — Live Demo Script

**Event:** RAG Trace Debugger Live Presentation  
**Duration:** ~10 minutes  
**Presenter Notes:** This document contains stage directions, click targets, talking points, and backup plans. Keep it open on a secondary monitor or printed.

---

## 📋 QUICK REFERENCE

| Query | Failure Type | Key Insight | Time |
|-------|--------------|-------------|------|
| q05 | **Rerank** | Legacy doc outranks current pricing | ~2 min |
| q07 | **Generation** | Rate limit "10 requests/min" in context but ignored | ~2 min |
| q08 | **Generation** | Regions + provisioning process in context but omitted | ~2 min |
| q09 | **Generation** | MFA lockout (security-critical) ignored | ~2 min |
| q15 | **Assembly** | Context truncated at 200 chars, drops the answer | ~1 min |

**Total Demo Flow:** ~9 min + 30 sec opening + 30 sec wrap-up = **10 min**

---

## 🎬 1. OPENING (30 seconds)

### Slide / Screen State
- Browser at `http://localhost:5173` (Debugger tab selected)
- Left rail: Query list visible with 15 pre-loaded traces
- No trace selected yet (empty main pane)

### Talking Points
> "Good [morning/afternoon]. I'm [Name], and I'm here to show you the **RAG Trace Debugger** — a diagnostic tool that tells you **exactly which stage of your RAG pipeline failed**, and why.
>
> **The problem:** When a RAG system gives a wrong answer, engineers waste hours guessing — was it retrieval? Reranking? Context assembly? The LLM itself? Traditional logging shows *what* happened, not *where* the failure originated.
>
> **This tool:** Instruments every stage — Query Rewrite → Retrieval → Rerank → Assembly → Generation — captures candidates, scores, keep/drop decisions, and the exact context sent to the model. Then a localizer compares the final answer against ground-truth key terms and **pins the failure to a single stage** with a reason.
>
> Today I'll walk through **5 failure modes** from our eval set — each representing a real production failure pattern."

### Stage Directions
- [ ] Smile, make eye contact
- [ ] Point to the "RAG Trace Debugger" header
- [ ] Point to the Gemini/mock badge in header (shows current mode)
- [ ] Don't click anything yet — let them absorb the UI

---

## 🔍 2. DEMO FLOW — QUERY BY QUERY

### Common Navigation Pattern (use for each query)
1. **Click** query in left rail (QueryList)
2. **Observe** Failure Banner at top of main pane (stage badge + reason)
3. **Scroll** to the indicated stage (highlighted with rose ring)
4. **Click/expand** relevant sections in StageCard
5. **Talk through** the evidence

---

### 📌 DEMO 1: q05 — RERANK FAILURE "Contradictory Pricing Sources"

#### Query
> **"What is the cost of an additional seat on the Growth plan?"**  
> Expected: **$18** | Actual: **$9 (legacy)** | Failure: **rerank**

#### Click Path
1. Left rail → Click **q05** (shows "Rerank" badge in list)
2. Main pane loads → Failure Banner shows **🟠 Rerank** badge

#### What to Highlight (in order)

| UI Element | Action | Talking Point |
|------------|--------|---------------|
| **Failure Banner** | Point to badge + reason text | "The localizer says: 'Needed chunk pricing#0 was retrieved but dropped at rerank.' This is the *smoking gun* — we found the right answer, then threw it away." |
| **Retrieval StageCard** | Expand candidates table | "Retrieval got 20 candidates. Look at rank 7: **pricing#0** — the current pricing table with `$18`. It's there, fused_score 0.0149. But also rank 1 & 2: **contradiction_seats#1** (legacy $9) and #2 (says 'see pricing.md')." |
| **Rerank StageCard** | Expand candidates table | "Rerank top-k=5. The legacy doc chunks score **0.5 and 0.49** — higher than pricing#0 at **0.455**. The reranker *preferred the contradictory source* because it lexically matches 'growth seat' better." |
| **pricing#0 row** | Hover/point (rose "dropped @ rerank") | "This is the tragedy: the correct chunk was **retrieved, scored, then dropped**. The legacy doc even *says* 'see pricing.md' but the reranker didn't follow the pointer." |
| **Assembly StageCard** | Show final context | "Final context includes the legacy doc (3 chunks) but NOT pricing#0. So generation never saw $18." |
| **Generation StageCard** | Show answer | "Model outputs the legacy $9 — confidently wrong because that's all it was given." |

#### Expected Audience Reaction
- "Ah, the reranker is the culprit, not retrieval"
- "The legacy doc is a trap — it even references the correct doc"

#### Key Soundbite
> **"Retrieval found the truth. Rerank buried it. The localizer told us exactly where to look."**

---

### 📌 DEMO 2: q07 — GENERATION FAILURE "Audit Log Rate Limit Ignored"

#### Query
> **"Can I stream my audit logs to my own S3 bucket, and how is the export API limited?"**  
> Expected: **"10 requests per minute"** | Actual: **"I'm not sure..."** | Failure: **generation**

#### Click Path
1. Left rail → Click **q07** (shows "Generation" badge)
2. Failure Banner → **🔴 Generation** badge

#### What to Highlight

| UI Element | Action | Talking Point |
|------------|--------|---------------|
| **Failure Banner** | Point to reason | "'Key terms present in assembled context but absent from answer: 10, requests, minute.' The context *had* the answer. The model *ignored* it." |
| **Retrieval StageCard** | Show rank 1 | "audit_logs#2 at rank 1, BM25 24.17 — huge score. Text: 'Enterprise audit logs can be streamed... rate-limited to **10 requests per minute**.'" |
| **Rerank StageCard** | Show kept chunks | "Rerank kept audit_logs#2 at rank 1 (score 0.5). The chunk survived." |
| **Assembly StageCard** | Show final context (scroll) | "Final context **includes the full sentence** with '10 requests per minute'. It's right there, 1200-char budget, plenty of room." |
| **Generation StageCard** | Show answer | "Model outputs: 'I'm not entirely sure... contact support.' Classic **context ignorance** — the model has the fact but fails to extract it." |

#### Talking Points
- "This is the scariest failure mode: **everything upstream worked perfectly**. Retrieval ✓, Rerank ✓, Assembly ✓. The model just... didn't use the context."
- "In production, this looks like 'the RAG system is hallucinating' — but the trace proves the pipeline delivered the goods."
- "Fixes: better prompting, few-shot examples, or a verifier step that checks key terms appear in the answer."

#### Expected Audience Reaction
- Unease — "the model had it and still failed"
- "How do we catch this automatically?" → Point to the localizer's key-term check

---

### 📌 DEMO 3: q08 — GENERATION FAILURE "Data Residency Regions + Process Ignored"

#### Query
> **"What regions are available for data residency, and can I change it myself later?"**  
> Expected: **us-east-1 default; eu-west-1, ap-southeast-2; cannot self-serve change** | Actual: **"I'm not sure..."** | Failure: **generation**

#### Click Path
1. Left rail → Click **q08** (Generation badge)
2. Failure Banner → **🔴 Generation**

#### What to Highlight

| UI Element | Action | Talking Point |
|------------|--------|---------------|
| **Failure Banner** | Point to reason | "Missing key terms: **eu-west-1, ap-southeast-2, provisioning**. All three in context, all missing from answer." |
| **Retrieval StageCard** | Show ranks 2 & 5 | "data_residency#0 (rank 2): lists **us-east-1, eu-west-1, ap-southeast-2**. data_residency#1 (rank 5): '**cannot be changed by the customer through the UI; requires a support ticket to the provisioning team**.' Both kept." |
| **Assembly StageCard** | Show final context | "Both chunks in final context. Full answer available." |
| **Generation StageCard** | Show answer | "Model gives generic 'contact support' — misses **specific regions** and **provisioning process**. This is a **partial-answer failure**: the model answered the 'can I change it' part vaguely but dropped the region names entirely." |

#### Talking Points
- "Two facts in two chunks — the model needs to **synthesize across chunks**. That's harder than single-chunk extraction."
- "Notice the key terms are **proper nouns (eu-west-1)** and **process language (provisioning)** — both are high-value, specific details that generic answers omit."
- "This is why we track *key terms* not just 'did it answer' — partial credit is dangerous in compliance/security contexts."

#### Expected Audience Reaction
- "So the model cherry-picks easy parts and drops specifics"
- "Key-term tracking catches partial answers"

---

### 📌 DEMO 4: q09 — GENERATION FAILURE "MFA Billing Lockout Ignored (Security)"

#### Query
> **"I'm on Enterprise and my account owner hasn't set up MFA. What happens to billing access?"**  
> Expected: **"Locked out of billing actions after 7 days"** | Actual: **"I'm not sure..."** | Failure: **generation**

#### Click Path
1. Left rail → Click **q09** (Generation badge)
2. Failure Banner → **🔴 Generation**

#### What to Highlight

| UI Element | Action | Talking Point |
|------------|--------|---------------|
| **Failure Banner** | Point to reason | "Missing: **locked, 7, days, billing** — all security-critical terms. This isn't just 'wrong answer' — it's a **safety failure**." |
| **Retrieval StageCard** | Show rank 1 | "mfa#0 at rank 1, BM25 14.5 — very high. Text: '**required on Enterprise plans. Enterprise accounts without MFA enabled on the account owner are locked out of billing actions after 7 days.**'" |
| **Assembly StageCard** | Show context | "The exact sentence is in the final context. No truncation, no competition." |
| **Generation StageCard** | Show answer | "Model: 'I'm not entirely sure...' — **complete refusal to state the policy**. This is the model being *over-cautious* or *failing to ground*." |

#### Talking Points
- ⚠️ **EMPHASIZE**: "This is a **security policy**. A customer asking this *needs* the correct answer. The system retrieved it perfectly and the model *still* refused to commit."
- "In regulated environments (finance, healthcare), this failure mode is **unacceptable** — it's not hallucination, it's *silence when precision is required*."
- "The trace gives you **evidence for the model vendor** — 'here's the context, here's the failure, fix your grounding.'"

#### Expected Audience Reaction
- Serious concern — "this is a liability"
- "Can we auto-detect this?" → Yes, the localizer flagged it via key-term absence

---

### 📌 DEMO 5: q15 — ASSEMBLY FAILURE "Rate Limit Number Truncated"

#### Query
> **"What is the audit-log export API rate limit?"**  
> Expected: **"10 requests per minute"** | Actual: **Truncated table** | Failure: **assembly**

#### Click Path
1. Left rail → Click **q15** (Assembly badge)
2. Failure Banner → **🟣 Assembly**

#### What to Highlight

| UI Element | Action | Talking Point |
|------------|--------|---------------|
| **Failure Banner** | Point to reason | "'Key term 10 present in kept chunks but missing from assembled context. Likely truncated/over-summarized.'" |
| **Retrieval StageCard** | Show rank 1 | "audit_logs#2 at rank 1 — has 'rate-limited to **10 requests per minute**'. Kept." |
| **Rerank StageCard** | Show kept | "Rerank keeps audit_logs#2 at rank 1. Still there." |
| **Assembly StageCard** | **CRITICAL** — show input: `max_chars: 200` | "**Here's the bug**: context_max_chars = **200**. The assembly stage only keeps the first 200 chars of the combined context." |
| **Assembly output** | Show context | "Final context: '# Audit Logs\nAll plans record a basic audit log... Audit log retention varies by plan:\n\n# API Rate Limits\n| Plan | Requests per minute | Burst |\n|------|-----------…' — **truncated mid-table!** The '10 requests per minute' line was at char ~340." |
| **Generation StageCard** | Show answer | "Model outputs the truncated table — it *can't* answer because the number was never in the context." |

#### Talking Points
- "This is a **configuration bug**, not a model bug. The pipeline worked — but the **context budget was too small** for this query."
- "Notice: `context_max_chars: 200` is a **per-query override** (set in the eval config for this query to *simulate* the failure). In production, you'd tune this globally or per-query-type."
- "The localizer caught it by comparing **kept chunks** (which had '10') vs **assembled context** (which didn't). That's the **assembly-stage localization** working."

#### Expected Audience Reaction
- "Oh! It's a parameter issue, not the model"
- "So the tool tells you 'increase context budget' not 'fix the model'"

---

## 🏁 3. WRAP-UP (1 minute)

### Screen State
- Back to **Evaluation tab** (click "Evaluation" in top nav)
- Show EvalPanel with results.json loaded

### Talking Points
> "Let me show you the **evaluation results** across all 15 queries."
>
> **Point to metrics:**
> - **Localization Accuracy: 100%** (15/15) — the localizer correctly identified the failure stage every time
> - **Overhead: 0.23 ms avg, 2.8 ms max** — negligible production cost
> - **Confusion Matrix:** Clean diagonal — no misclassifications
>
> "This means: **when the debugger says 'rerank', it's rerank. When it says 'generation', it's generation.** You can trust the signal."
>
> **Key takeaways:**
> 1. **Stage-level visibility** turns 'RAG is broken' into 'rerank dropped the right chunk at rank 7'
> 2. **Key-term tracking** catches partial answers and context ignorance — not just 'wrong' vs 'right'
> 3. **Sub-millisecond overhead** means you can run this in production, not just eval
> 4. **The tool doesn't fix it** — it tells you *where to aim your fix*: prompt, reranker, context budget, corpus hygiene

### Q&A Prep (Anticipated Questions)

| Question | Answer |
|----------|--------|
| "Does this work with real LLMs (not mock)?" | Yes — toggle `mock_drift=false` and set `GEMINI_API_KEY`. The trace format is identical. |
| "Can I add custom failure stages?" | The schema is extensible — add stages in `server/trace/events.py` and mirror in `web/src/types/trace.ts`. |
| "How does the localizer work?" | Compares `key_terms` (from eval set) against final context (assembly) and answer (generation). If terms in context but not answer → generation. If terms in kept chunks but not context → assembly. If needed chunk dropped at rerank → rerank. |
| "What about multi-hop queries?" | Each hop creates a new trace. The debugger shows each independently. |
| "Can I export traces for offline analysis?" | Yes — `GET /api/traces/{id}` returns full JSON. CI/CD can ingest this. |

---

## 🛟 4. BACKUP PLANS

### Scenario A: API / Backend Fails
**Symptom:** "Failed to load traces" error banner, or queries time out
**Action:**
1. Stay calm — acknowledge: "Let me show you the pre-recorded traces instead"
2. Switch to **Evaluation tab** — runs purely on `results.json` (no backend needed)
3. Walk through the same 5 queries using the **eval results table** (shows query, ground truth, indicated, correct, failure reason)
4. Say: "The debugger UI is a thin client — all the intelligence is in the trace JSON, which we have."

### Scenario B: Demo Queries Don't Load (Empty List)
**Symptom:** Left rail shows "No traces"
**Action:**
1. Click **"Run a query"** in left rail → type any question → click "Run query"
2. Or: Run `python -m server.eval.runner` in terminal to regenerate traces
3. If both fail: Use **Corpus tab** to show the document set, explain the contradiction_seats trap manually

### Scenario C: Running Long (>10 min)
**Time Checks:**
- After q05: ~2:30 elapsed → if >3:00, **skip Assembly detail on q07/q08**, go straight to Generation
- After q09: ~7:00 elapsed → if >8:00, **combine q15 into wrap-up** ("One more: assembly truncation — context budget too small")
- Hard stop at 9:30 → jump to Evaluation tab for results

### Scenario D: Audience Asks Deep Technical Question Mid-Demo
**Action:** "Great question — let me park that for Q&A at the end so we stay on track. The short answer is [one sentence], and I'll come back to it."

---

## ⚙️ 5. TECHNICAL DETAILS (For Speaker Reference)

### How to Run the Demo

```bash
# Terminal 1: Backend
cd /Users/maheshboda/Projects/RAG_Trace_Debugger
source .venv/bin/activate
uvicorn server.main:app --reload --port 8000

# Terminal 2: Frontend
cd /Users/maheshboda/Projects/RAG_Trace_Debugger/web
npm run dev
# Opens http://localhost:5173

# Optional: Regenerate eval traces
cd /Users/maheshboda/Projects/RAG_Trace_Debugger
python -m server.eval.runner
```

### Color Coding (Failure Badges)

| Stage | Color | Hex (Light) | Meaning |
|-------|-------|-------------|---------|
| **none** | 🟢 Emerald | `#10b981` | No failure detected |
| **query_rewrite** | 🔵 Sky | `#0ea5e9` | Query rewriting failed |
| **retrieval** | 🟠 Amber | `#f59e0b` | Relevant docs not found |
| **rerank** | 🟠 Orange | `#f97316` | Right docs found, wrong ones kept |
| **assembly** | 🟣 Purple | `#a855f7` | Context truncated/misassembled |
| **generation** | 🔴 Rose | `#f43f5e` | Context had answer, model missed it |

### Key UI Elements to Point Out

1. **Left Rail (QueryList)**
   - Each row: query_id, query preview, **failure badge**, timestamp
   - Filter dropdown: show only specific failure types
   - "Run a query" form at top (live tracing)

2. **Failure Banner (Top of Main Pane)**
   - Large badge: indicated failure stage
   - `failure_reason`: human-readable explanation from localizer
   - Ground truth comparison (green ✓ / red ✗)
   - Total duration + trace overhead

3. **Stage Timeline (Vertical)**
   - Chronological: Query Rewrite → Retrieval → Rerank → Assembly → Generation
   - **Rose ring + bar** on the indicated failure stage
   - Each stage: duration, input/output JSON, candidates table (if applicable), context/answer

4. **Candidates Table (Retrieval & Rerank)**
   - Columns: Rank, Chunk ID, Dense, BM25, Fused, Rerank, Status
   - **Green "kept"** vs **Red "dropped @ stage"**
   - Click chunk_id to see full text (in future version)

5. **Context / Answer Blocks (Assembly & Generation)**
   - Scrollable, monospace, syntax-highlighted
   - Assembly: "Final context (FR4)" — what the model *actually* saw
   - Generation: "Generated answer (FR5)" — what the model *actually* said

### Architecture Summary (If Asked)

```
┌─────────────────────────────────────────────────────────────┐
│                        RAG Pipeline                         │
│  Query Rewrite → Retrieval → Rerank → Assembly → Generation │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Trace Collector                          │
│  (server/trace/collector.py — wraps each stage, emits JSON) │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Failure Localizer                        │
│  (server/trace/localize.py — compares key_terms vs context  │
│   vs answer, emits indicated_failure + failure_reason)      │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
       ┌─────────────┐                 ┌─────────────┐
       │  Web UI     │                 │  Eval Runner│
       │  (React)    │                 │  (CI/CD)    │
       └─────────────┘                 └─────────────┘
```

---

## 📝 FINAL CHECKLIST (Pre-Demo)

- [ ] Backend running on :8000 (`uvicorn server.main:app --reload`)
- [ ] Frontend running on :5173 (`npm run dev`)
- [ ] Browser open to `http://localhost:5173`
- [ ] Debugger tab selected, traces loaded (15 items in left rail)
- [ ] Evaluation tab works (shows 100% accuracy)
- [ ] This script open on second monitor / printed
- [ ] Water / tea ready
- [ ] Backup plan rehearsed (Eval tab walkthrough)

---

**Break a leg!** 🎭

*The debugger doesn't fix your RAG — it tells you exactly where to aim the wrench.*
