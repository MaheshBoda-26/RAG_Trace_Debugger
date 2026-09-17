# Making the RAG Trace Debugger top-tier

**Strategy + research brief. No code written — this is a decision document.**

Research method (worth stating, because it's part of the doc's credibility): `web_search` and the
`firecrawl` / `agent-reach` CLIs are not available in this environment, so primary sources were
fetched directly with a URL reader. Everything cited in §4 and §14 was actually retrieved, not
recalled. Where I state an opinion, it's marked as one.

---

## 0. TL;DR — the honest verdict

**What you have is genuinely rare.** Almost every "RAG portfolio project" is a chatbot with a
vector DB. Yours is a *debugger for the failure modes of RAG itself*, with a framework-agnostic
collector, a deterministic localizer, a self-healing loop, intent-aware risk profiles, and working
LangChain/LlamaIndex adapters. The thesis is academically sound (§4) and it is the same thesis
companies pay Langfuse/LangSmith/Arize for.

**The one thing capping you right now is credibility, not capability.** The project's headline is
`100% localization accuracy on 15 labeled queries — labels calibrated to this pipeline`. A sharp
hiring manager reads that as *"the author wrote the test to match the implementation."* Right now
your strongest asset (the localizer) is wrapped in your weakest evidence. Fix the evidence and the
same code becomes impressive instead of suspect.

**The second cap is that the demo isn't reachable.** If a reviewer has to clone a repo, build a
venv, install `sentence-transformers`, seed an eval, and start two servers before seeing anything,
you lose ~80% of them before your best idea is on screen.

So the plan is not "add more features." It's: **prove it, package it, deploy it, then deepen it.**
Feature depth is already ahead of the packaging — which is the opposite of the usual problem, and
much easier to fix.

| Dimension | Today | Top-tier bar |
|---|---|---|
| Thesis / differentiation | **Ahead of the bar** | — |
| Feature depth (healing, intent, SDK) | **At the bar** | — |
| Evidence quality | **Well below** | Public datasets, human-validated labels, published methodology |
| Reachability (can a stranger see it?) | **Well below** | Hosted live demo + 60–90s video, zero install |
| Visual craft (frontend) | **Template-default** | Art-directed, motion with meaning, zero generated tells |
| Production engineering | Below | Auth, persistence, sessions, cost, CI, load test |
| Ecosystem credibility | Near zero | OTel-exportable, adapter PRs merged, package on PyPI |

There's a third cap, and it's the one most people never diagnose: **the UI currently reads as
template output**, not as a designed instrument. That matters more than it sounds — a reviewer forms
a taste judgement in the first two seconds, before reading a single metric, and "this looks like
every other AI landing page" quietly discounts everything below it. §14 is a full teardown plus an
explicit art direction that makes the interface as distinctive as the engineering.

---

## 1. Where the project actually stands

Measured from the repo, this session:

| Fact | Value | Read |
|---|---|---|
| Source size | 53 files, ~7.8k LOC (excl. `node_modules`) | Substance, not a tutorial clone |
| Pipeline stages instrumented | 5 (+ localizer, + intent, + SDK/adapter stages) | Complete |
| Framework coverage | native, LangChain, LlamaIndex, custom SDK | Genuine differentiator |
| API surface | `/api/query`, `/api/query/heal`, `/api/traces`, `/api/eval/*`, `/api/health` | Product-shaped |
| Tests | 14 pytest tests (added this session); **0 before** | Must grow |
| CI | **None** (`.github/workflows` absent) | Biggest cheap miss |
| Corpus | 12 synthetic docs / 32 chunks | Fine as a fixture, not as evidence |
| Eval set | 15 queries, self-labeled, 100% | **Evidence risk** (§9) |
| Overhead | 0.03–0.25 ms/query avg, p95 → ~1.0 ms under load | Honest, but self-timed |
| Distribution | none (no Docker deploy, no hosted demo, no PyPI) | Reachability miss |
| Commits | 35, mostly "manual checks"/"update frontend" | History reads as hacking, not engineering |

Two structural things I'd flag as *architecture*, not polish:

1. **Traces are JSON files in a directory, and everything is synchronous.** Fine for a demo; it's
   the first thing a senior engineer will probe ("what happens at 100 QPS? what's your retention
   policy? how do you query traces by user/session?"). You don't need Postgres to answer this —
   but you need a written answer and a pluggable store interface to show you've thought about it.
2. **The default runtime path is the mock generator.** Your measured evals mostly exercise the
   deterministic mock, not an LLM. That's a defensible engineering choice (offline CI), but it must
   be stated as such, and at least one published benchmark run must use a real model.

---

## 2. How this project is actually judged

You asked for a project so strong a recruiter "has no chance to not hire you." I'll be straight with
you: **no single project guarantees a hire**, and a doc that promises that is selling you something.
What a project *can* do is (a) get you the interview, and (b) hand you 45 minutes of deep material
where you clearly know more than the interviewer. That's what we optimize. That's a real,
achievable goal.

Six signals a hiring manager scans, in order, in about 90 seconds:

1. **Does it do something I recognize as hard?** (Not "a chatbot".)
2. **Is the headline number believable?** (Sample size, labeling process, who labeled it.)
3. **Can I see it without installing anything?**
4. **Is there a written argument, not just a README feature list?**
5. **Is it engineered, or vibed?** (CI, tests, types, error handling, migrations, config.)
6. **Did anyone else care?** (Stars, forks, issues, merged PRs upstream, HN/Reddit thread.)

### The 90-second test (run this on your own README literally, with a timer)

- 0–15s: one-sentence "what is this" + a **GIF/video of the healing loop running**. Not a
  screenshot of a landing page — the *money moment*: bad answer → localized stage → one click →
  side-by-side proof it got better.
- 15–35s: the honest headline: *"On N=300 real queries from [public dataset], the localizer agrees
  with human annotators κ=0.72 (vs. 0.31 for a naive baseline)."* Plus a "we also publish where it
  fails" link.
- 35–60s: architecture diagram + the one-paragraph "why this is hard" argument.
- 60–90s: "try it live →" button, and links to two write-ups.

Right now the project fails at 0–15s (no video), 15–35s (100%/15 is a red flag), and 60–90s (no
hosted demo). Those three failures are cheaper to fix than any feature in Phases 1–5 were.

---

## 3. The landscape, and the gap you uniquely own

What exists (fetched from their own docs):

| Tool | What it is | Overlap with you |
|---|---|---|
| **Langfuse** | OSS AI engineering platform: observability (traces/sessions/agent graphs, cost+latency), prompt management, evals, OTel-based | Tracing + evals. **No failure localization, no healing loop.** |
| **Arize Phoenix** | OTel/OpenInference-based tracing, evals, prompt playground, **span replay**, datasets & experiments | Closest on replay, but replay is *per LLM span*, not *per pipeline stage with parameter search*. |
| **LangSmith** | Managed tracing/eval/prompt tooling | Same shape. Managed, not self-hosted. |
| **RAGAS** | Metric library: context precision/recall, noise sensitivity, faithfulness, response relevancy, factual correctness (+ agentic metrics) | Metrics, not traces. Complementary — you could *import* it. |
| **RAGChecker** | Fine-grained diagnostic metrics for retrieval **and** generation modules, meta-validated against human judgment | Closest prior art to your thesis, at the metric level. |

**The gap you own:** every one of those tools answers *"what happened?"* and *"how good was it?"*.
Almost none answer **"which stage caused this specific bad answer, and can you prove the fix?"**
Localization + counterfactual re-run + automatic regression-test generation is a coherent wedge, and
it's the exact wedge practitioners ask for (see §4, first paper: *"validation of a RAG system is only
feasible during operation"*).

**One-sentence positioning** (use verbatim everywhere):

> Tracing tools tell you *what* happened and *how good* the answer was. This one tells you *which
> stage broke it*, then re-runs the query to prove a fix — and turns every failure into a permanent
> regression test.

That's the whole product. Everything else either supports it or dilutes it.

**Positioning discipline:** do *not* market this as "an observability platform" — you lose that
comparison to Langfuse on features and to Phoenix on ecosystem. Stay the specialist: **failure
attribution + verified repair for RAG**. "Small and sharp" beats "big and shallow" with technical
reviewers every single time.

---

## 4. Research backing (this is your unfair credibility)

Four primary sources make the project's thesis *defensible in an interview* rather than a
personal opinion. Fetch and read them; quote them in the README.

1. **"Seven Failure Points When Engineering a Retrieval Augmented Generation System"**
   (Barnett et al., 2024 — arXiv:2401.05856). Experience report across research, education, and
   biomedical case studies. Two stated takeaways: *"validation of a RAG system is only feasible
   during operation"* and *"the robustness of a RAG system evolves rather than designed in at the
   start."*
   → **This is the academic justification for a runtime tracer with a self-healing loop.** Say exactly
   that in the README: *"The literature says RAG robustness can only be established in operation.
   That's why this tool exists."* Also: map your stages to their 7 failure points and publish the
   mapping table — cheap, and it shows you read the field.

2. **RAGChecker** (Ru et al., 2024 — arXiv:2408.08067). Fine-grained diagnostic metrics for both the
   retrieval and generation modules, meta-evaluated as significantly better correlated with human
   judgment than prior metrics.
   → Your localizer is an *unvalidated* classifier. RAGChecker's whole contribution is *meta-evaluation*
   — proving a metric agrees with humans. **Do that for your localizer** (§6, Tier 4). This turns your
   headline from self-labeled 100% into a defensible agreement score.

3. **RAGTruth** (Niu et al., 2023 — arXiv:2401.00396). ~18k manually annotated RAG responses with
   word-level hallucination intensity labels; shows a small fine-tuned model can match GPT-4-class
   prompt-based hallucination detection.
   → Two uses: (a) validate your `generation` failure signal against a real annotated corpus of
   unsupported/contradictory claims; (b) if you want one genuinely research-flavored artifact, a
   small trained hallucination/attribution classifier is far more impressive than another dashboard
   tab, and the corpus makes it feasible.

4. **OpenTelemetry GenAI semantic conventions** (`open-telemetry/semantic-conventions-genai`).
   A dedicated repo extending core semantic conventions with GenAI spans, metrics, and events for
   GenAI clients, **MCP (Model Context Protocol)**, and provider-specific conventions, managed with
   Weaver; includes a Python reference compliance matrix.
   → **Emit OTel GenAI spans and you stop being a toy.** Phoenix and Langfuse are both OTel-based;
   exporting to them means a reviewer can point your tracer at their real stack on day one. This is
   the single highest-leverage interop move in the entire document, and it's also the honest answer to
   "why not just use Langfuse?": *because this produces standard spans and can feed yours.*

**Optional, if you want a metric-theory citation:** RAGAS's metric taxonomy (context precision,
context recall, noise sensitivity, response relevancy, faithfulness, factual correctness, plus agent
metrics like tool-call accuracy and agent-goal accuracy) is the de-facto vocabulary. Don't
reimplement it — *import* it and be honest that you did.

---

## 5. Four lenses, four verdicts

I ran the project through four expert lenses. Each gives one or two findings that change the plan.

### `/rag-engineer` — retrieval quality must be measured separately from generation

- **Biggest gap: you report end-to-end localization accuracy, but never retrieval-quality metrics.**
  No Recall@k, MRR, nDCG, or context precision/recall anywhere. The RAG-engineering consensus (and
  RAGAS's taxonomy) is that if you conflate them you can't tell whether retrieval or generation
  failed — which is *literally your product's thesis*. **Not reporting MRR/Recall@k/nDCG@k
  undermines your own argument.** Add retrieval-only metrics with labeled relevant chunks; you
  already store `needed_chunk_ids`, so the plumbing exists.
- Your retriever is a hybrid (dense + BM25 + RRF) with a cross-encoder reranker — good. But the
  corpus is 12 synthetic docs. Hybrid-vs-dense-vs-BM25 ablations need a real corpus to mean
  anything. A public retrieval set (BEIR-style, or a QA set with gold supporting passages) fixes
  this and gives you a genuinely interesting chart: *"which failure stage dominates at which k?"*
- Chunking is paragraph-level only. The rag-engineer literature is emphatic that fixed/naive
  chunking is the #1 quiet retrieval killer. **Make it a first-class failure mode**: add a chunking
  strategy dimension and show a trace that fails because of a bad boundary. That's a great demo and
  a real feature.

### `/ai-engineer` — production reliability, cost, and safety

- You're missing **sessions/multi-turn traces and agent/tool traces**. Langfuse treats sessions and
  agent graphs as table stakes. In 2026, a "RAG debugger" that can't show a retrieval-then-tool-call
  loop looks dated. Multi-turn is also where *query rewriting* failures actually bite (pronoun
  resolution) — a natural extension of your existing `query_rewrite` stage.
- **No cost/token accounting per stage.** You capture latency; capture tokens, model name, and $
  per stage. Then healing becomes an obviously valuable feature: *"this fix costs +$0.0004 and 90ms
  — and it removed a failure."* That's a product insight, not a metric.
- **No indirect prompt-injection defense.** Retrieved documents are an untrusted input channel — a
  poisoned chunk can hijack generation. Detection here is both a genuine safety feature and a
  spectacular demo: a trace that shows *"this retrieved chunk contains instruction-like imperative
  text; the answer was influenced by it."* Almost nobody in the OSS RAG-debugging space ships this.
- Your hardening (breaker, rate limit, fallbacks) is currently in-process and in-memory. Good
  enough, but say so, and make the store + limiter pluggable with a documented production path.

### `/data-engineer` — datasets, contracts, lineage, and the thing you're missing

- **The eval set has no lineage story.** 15 hand-written queries in a JSON file, labels "relaxed
  against observed behavior" — that's a data-quality red flag by data-engineering standards. You
  need: versioned datasets (JSONL + hash), a provenance field per label (who/what labeled it and
  when), a change log, and a data-quality check that fails CI when a dataset changes without a
  version bump.
- **No dataset registry or run artifact records.** An eval run should record: dataset version, corpus
  version, code commit SHA, model + params, seed, and environment. Without that, numbers aren't
  reproducible, and reproducibility is the first thing a senior reviewer checks.
- **Traces are your raw data asset, and nothing consumes them.** Right now traces are read by a UI.
  The high-value move is a pipeline: traces → failure taxonomy aggregates → regression datasets →
  charts. That's an actual data product and the story writes itself: *"every production failure
  becomes training/eval data automatically."*
- PII/governance: traces will contain user text. You need a redaction hook and a documented
  retention policy — even a naive one — before anyone would run this on real traffic.

### `/andrej-karpathy` — simplicity, surgical scope, verifiable goals

- **You are at risk of building features instead of evidence.** Five phases shipped; zero public
  benchmarks, zero CI, zero deploy. More features now would be *worse* engineering, not better.
- **Delete/reframe the vanity metrics.** "0.089 ms/query overhead" measured by the tracer timing
  itself is self-referential — measure it *against a control* (tracing on vs. off, same workload,
  same machine, reported P50/P95 across N runs) or drop the claim. A reviewer who spots a
  self-timed overhead number distrusts everything else on the page. One honest A/B number beats
  five pretty ones.
- **Cut the 1200-char context budget as a "feature"** — it's a knob, not a capability; it only earns
  its place because it produces a demonstrable, explainable failure mode (assembly truncation). Keep
  it as a *failure fixture*, not a headline.
- **Every goal must have a verification command.** If a claim in the README can't be reproduced by a
  single copy-pasteable command, rewrite the claim.

---

## 6. The twelve moves, ranked by return on effort

"Proof" = what it demonstrates to a reviewer. Effort = focused solo days.

### Tier 1 — Credibility and reach (do these before anything else)

| # | Move | Effort | Proof |
|---|---|---|---|
| 1 | **Deploy a live demo** (hosted, seeded, read-only, no install) | 1–2 | Reviewer sees it in 10s. Single highest-ROI change. |
| 2 | **90-second demo video/GIF** of the healing loop, at the top of the README | 0.5 | Communicates the whole thesis without words |
| 3 | **CI: lint + types + tests + eval regression gate** on every push | 1 | "Engineered, not vibed." Also the eval gate is a genuinely good idea to *show*. |
| 4 | **Run it on a real public dataset** (retrieval: MRR/Recall@k/nDCG@k; end-to-end: faithfulness/factual correctness) | 3–5 | Kills the "15 self-labeled queries" objection permanently |
| 5 | **OTel GenAI span export** (+ document "feed this into Phoenix/Langfuse") | 2–3 | Interop with the standards the whole industry moved to |
| 6 | **Human-validated labels**: 150–300 traces, 2 annotators, report κ agreement with the localizer, **including where it's wrong** | 4–6 | The single most hireable artifact in this document |
| 6b | **Art direction + signature motion** (§14): new token system, distinctive type, one purposeful interaction | 3–5 | Kills the "another AI landing page" first impression |

Moves 4–6 together transform the headline from *"100% on 15 queries I labeled"* to *"agrees with
independent human annotators at κ≈0.7 on 300 traces, and here's the confusion matrix and the cases
where it fails."* That second sentence gets you interviewed.

### Tier 2 — Product depth (the things that make it feel like a product, not a demo)

| # | Move | Effort | Proof |
|---|---|---|---|
| 7 | **Trace → regression test in one click** (failure becomes a versioned eval case with provenance) | 2–3 | Closes the loop; shows product thinking; grows the eval set honestly |
| 8 | **Stage-level counterfactual replay** (re-run from stage N with edited inputs, cached upstream) | 3–4 | Phoenix has LLM-span replay; stage-level replay with parameter search is yours alone |
| 9 | **Sessions + multi-turn traces** (and pronoun-resolution rewrite failures) | 3–4 | Matches 2026 expectations; unlocks a real failure class |
| 10 | **A/B pipeline comparison** (two configs × a dataset → win/loss matrix, per-stage deltas) | 2–3 | Turns "a debugger" into "an experimentation tool people pay for" |

### Tier 3 — Production engineering (for the senior-engineer read)

| # | Move | Effort | Proof |
|---|---|---|---|
| 11 | **Pluggable storage + auth**: SQLite/Postgres store behind the existing `store` interface, API keys, tenant scoping, retention/redaction hooks, cost accounting per stage | 4–6 | Answers "what happens at 100 QPS / with real user data?" |
| 12 | **Load + failure drills as published artifacts** (k6 or locust, P50/P95/P99, tracing on-vs-off overhead A/B, breaker/rate-limit drill transcripts) | 2–3 | Numbers with a methodology, not vibes |

### Tier 4 — Research-grade (the differentiator that ends arguments)

| # | Move | Effort | Proof |
|---|---|---|---|
| 13 | **Localizer meta-evaluation**: treat localization as a calibrated classifier — confusion matrix, per-stage precision/recall, abstention, and a written error analysis | 3–4 | RAGChecker-style rigor applied to a novel target |
| 14 | **Failure taxonomy at scale**: run on thousands of queries, publish the distribution of failure stages and how it shifts with k / chunking / model | 3–5 | A chart nobody else has; a blog post that writes itself |

If you do only #1–#6 plus #7, this project is in the top 1% of portfolio RAG projects. #8 and #13
are what make a *senior* engineer sit up.

---

## 7. Moonshots — things almost nobody ships

Pick one or two. Each is a strong differentiator rather than a checkbox.

1. **"Diagnose any RAG endpoint" harness.** Define a tiny protocol (HTTP endpoint + config
   descriptor). Then anyone can point this at *their* RAG and get a failure breakdown. This is the
   growth loop: it turns your repo into infrastructure, and it's how a portfolio project earns
   stars. Publish a leaderboard of well-known OSS RAG demos and their dominant failure stages.
2. **Automatic regression-suite growth.** Every failure → test case → dataset version → CI gate.
   Announce it as: *"the eval set that grows itself."* Then show the eval set's version history as
   evidence.
3. **Calibrated localization with abstention.** Report a confidence, and *decline to localize* when
   signals conflict — with the abstention rate measured. Honest systems are rare and they read as
   maturity. (Conformal prediction is the rigorous version of this.)
4. **Cost-aware healing.** Enumerate candidate fixes (k, rerank, chunking, prompt, model swap),
   score each by (success vs. regression suite) ÷ (added $ and ms), and recommend the cheapest fix
   that passes. That is *exactly* the ai-engineer cost-optimization competency, made visible.
5. **Indirect prompt-injection detection in retrieved context.** A guardrail + a trace view that
   shows influence. Safety work is scarce in OSS RAG tooling; this is memorable.
6. **Upstream credibility.** Ship a PyPI package, and open PRs adding your adapter to the LangChain
   and LlamaIndex docs/repos. "I contributed the tracing adapter upstream" outranks any amount of
   frontend polish. Also consider contributing your GenAI span mapping to the OTel GenAI conventions
   repo's reference implementations.

---

## 8. What to cut (discipline beats scope)

- **Don't build a vector DB.** You have a deliberate, pluggable corpus. Add a documented adapter for
  pgvector/Qdrant and stop there. Nobody is judging your HNSW implementation.
- **Don't build more dashboards.** The React surface is already generous (landing, features, about,
  debugger, eval, corpus). Marginal UI work now has near-zero hiring value; the differentiating work
  is evidence, replay, and interop.
- **Don't reimplement RAGAS.** Import it, credit it, and spend your time on the part that's yours.
- **Don't add frameworks for the sake of the matrix.** Haystack/crewAI adapters add no credibility
  once LangChain + LlamaIndex + OTel exist; OTel covers the long tail for free.
- **Don't publish a number you can't defend.** One honest, methodologically-clear benchmark beats six
  headline metrics.
- **Don't hide the mock generator.** Frame it correctly: *"the default path is a deterministic mock,
  which is why our CI eval is reproducible offline; benchmark results labeled 'live model' use
  Gemini."* That framing turns a weakness into an engineering decision.

---

## 9. Metric honesty: replace the vanity claims

The fastest credibility win in this document. Left column is roughly what's there today.

| Current claim | Why it's a liability | Replace with |
|---|---|---|
| "100% localization accuracy (test set)" | Self-labeled, n=15, labels calibrated to the implementation | "Agreement with 2 independent annotators: κ=0.72 (n=300); confusion matrix + failure cases published" |
| "0.089 ms/query overhead" | The tracer times itself | "Tracing adds 0.9% P95 latency (on-vs-off, n=1000, same host); methodology in `bench/`" |
| "15/15 queries, 100%" | Round number, small n, calibrated | Keep as a **smoke test** and label it that way; the real evidence is the benchmark |
| "Framework-agnostic / zero dependencies" | Partially true (adapters need frameworks) | "Core collector has zero framework dependencies; adapters are lazy optional imports" |
| Landed "Live trace timeline" hero | It's a mock animation on the landing page | Either label it as an illustration or wire the hero to a real seeded trace |

Two rules: **(1)** every number links to a reproducible command; **(2)** every headline number has a
caveat in the same paragraph. Counter-intuitive but true: publishing your failures is one of the
strongest seniority signals available to you.

---

## 10. Packaging: the 90 seconds that decide everything

**README order (rewrite for this order, nothing else first):**

1. Title + one-line positioning sentence (from §3).
2. **The 60–90s GIF/video** of: bad answer → localized stage → click Heal → before/after proof.
3. **Try it live →** hosted URL. Also a one-command local path (`make demo` or `docker compose up`).
4. "What this is / why it's hard" — 4–6 sentences including the literature framing (§4.1).
5. **Results table with methodology**: dataset, n, what was labeled, who labeled it, agreement
   score, link to raw artifacts, link to failures.
6. Architecture diagram (collector → localizer → healer → store → dashboard) + the OTel export note.
7. "Use it in your pipeline": three 6-line snippets (native SDK, LangChain, LlamaIndex).
8. Honest limitations + "what I'd build next".
9. Two write-up links (see below).

**Write-ups (the highest-leverage non-code artifacts):**

- *"Why RAG failures can only be diagnosed in operation"* — your thesis, anchored on Barnett et al.
  and your own failure distribution chart. Post to your blog + HN/Reddit/dev.to.
- *"I built a localizer for RAG failures — here's where it's wrong"* — the error analysis, honestly.
  This is the post that gets shared by practitioners, because everyone has suffered this problem.
- Optionally: *"Emit OTel GenAI spans from any RAG pipeline in 20 lines."*

**Also do these:** a `docs/` ADR set (why JSON-first store, why deterministic free localizer, why
optional LLM enrichment); a `DEMO.md` 5-minute script; a 1-page PDF/Notion "technical overview" for
your résumé link; and pin the repo with topics (`rag`, `observability`, `llmops`, `opentelemetry`,
`evaluation`).

---

## 11. 30 / 60 / 90 plan with hard acceptance gates

Each phase ends with a *verifiable* acceptance command — if you can't verify it, it isn't done.

### Days 1–30 — "Provable"
1. Hosted demo deployed (seeded corpus + 3 pre-computed failing traces + healing works).
   *Gate:* a stranger with no install can reach it and heal a trace in <60s.
2. Demo video/GIF in the README.
   *Gate:* someone who watches it can explain the product back to you.
3. CI: ruff + mypy + pytest + eval regression gate.
   *Gate:* a deliberately broken PR fails CI; a clean one passes.
4. Public-dataset benchmark v1 + methodology doc + raw artifacts.
   *Gate:* `make bench` reproduces the README table on a clean machine.
5. README rewritten to §10's order with the honest metric replacements from §9.
6. Design tokens rebuilt + landing page + signature hero motion (§14).
   *Gate:* a designer who has never seen the project can't name the template it came from; the
   grayscale test passes; Lighthouse ≥95; reduced-motion pass produces a still-legible page.

### Days 31–60 — "Interoperable"
6. OTel GenAI span export + a doc showing Phoenix/Langfuse ingesting your spans.
   *Gate:* a real trace from your pipeline appears in a stock Phoenix instance.
7. Human-label study (150–300 traces, 2 annotators, κ, confusion matrix, error analysis posted).
   *Gate:* the published agreement number is reproduced by the committed annotation files.
8. Trace → regression-test-in-one-click, with dataset versioning + provenance.
   *Gate:* clicking it during a live demo adds a case that a later CI run actually evaluates.
9. Sessions/multi-turn traces with a pronoun-rewrite failure case in the demo set.

### Days 61–90 — "Indispensable"
10. Stage-level counterfactual replay (from stage N, edit, replay, diff).
    *Gate:* replaying from `retrieval` with a manual chunk injection fixes q12 without re-running upstream.
11. A/B config comparison with a win/loss matrix on the dataset.
12. Retrieval-only metrics (Recall@k, MRR, nDCG) + ablation chart (dense vs BM25 vs hybrid, k sweep).
13. Load/failure drill artifacts (P95/P99, tracing on-vs-off overhead A/B, breaker + rate-limit drill logs).
14. One moonshot from §7 — my recommendation: **cost-aware healing** (best story per unit effort),
    or **upstream adapter PR** if you want the credibility play.
15. Launch: write-up + HN/Reddit + a pinned issue list of "known limitations, PRs welcome".

**Milestone definition of "top tier" (all must be true):**
hosted demo live · video in README · CI green with eval gate · one public-dataset benchmark with
methodology · human-agreement number published with failure cases · OTel export verified into a
third-party tool · 100+ stars or a merged upstream PR · two technical write-ups.

---

## 12. Narrative tools (copy-adapt these)

**Positioning sentence** (README line 1):
> RAG Trace Debugger — finds which stage of your RAG pipeline produced a bad answer, re-runs the
> query to prove a fix, and turns every failure into a permanent regression test.

**Résumé bullets you can defend** (keep the numbers you've actually measured):
- Built a framework-agnostic RAG tracing layer (Python/FastAPI + React) that localizes failures to
  one of 5 pipeline stages and auto-remediates via parameter search, cutting time-to-diagnosis from
  hours of manual log reading to a single click.
- Implemented OTel GenAI-compatible span export, so traces flow into Phoenix/Langfuse without
  vendor lock-in.
- Designed a human-validated evaluation harness (n=300, 2 annotators, κ=0.xx) and a CI regression
  gate that blocks merges when localization quality drops.
- Instrumented a hybrid retrieval pipeline (dense + BM25 + RRF + cross-encoder rerank) with
  per-stage retrieval metrics (Recall@k, MRR, nDCG) and a published failure-mode distribution.
- Shipped LangChain + LlamaIndex adapters that capture third-party pipeline runs as first-class traces.

**Interview walkthrough (10 min):** problem (30s) → architecture (90s) → the money demo, healing a
rerank failure live (120s) → how the localizer works and **where it fails** (120s) → evaluation
methodology and what you'd do with more data (120s) → the fix I'm proudest of and the one I'd redo
(60s). Bring the confusion matrix. Interviewers remember candidates who volunteer their weaknesses.

**The two questions you must be able to answer cold:**
1. *"Why not just use Langfuse/Phoenix?"* → "They tell you what happened and how good it was. I tell
   you which stage caused it and prove the fix. And I emit OTel GenAI spans, so I feed them rather
   than compete with them."
2. *"How do you know your localizer is right?"* → point at the κ agreement number, the confusion
   matrix, and the documented failure cases.

---

## 13. Decisions I need from you before writing code

1. **Which model for the public benchmark?** Gemini (you already have the path), plus a local OSS
   model via Ollama for offline reproducibility? *(Recommend: Gemini for headline + Ollama for CI.)*
2. **Which dataset(s)?** Retrieval-only public set (clean MRR/nDCG story) vs. a QA set with gold
   supporting passages (realistic end-to-end story). *(Recommend: one of each; retrieval metrics are
   the cheapest credible win.)*
3. **Annotation borrow vs. LLM-judge-only for the localizer study?** True human labeling is the
   strongest artifact but costs you days; an LLM-judge with 50 human-verified spot checks is 80% of
   the value at 25% of the cost. *(Recommend: hybrid — 50 fully human, rest judged + audited; state
   the mix explicitly.)*
4. **Hosting target for the live demo?** Must be free/cheap and outlive a portfolio review.
   *(Recommend: Vercel for the web + Fly.io/Render for the API with a seeded SQLite + a read-only,
   rate-limited "demo" mode that resets daily.)*
5. **How far to go on storage/auth?** *(Recommend: keep JSON store as default, add a SQLite backend
   behind the existing interface, and a single API-key gate for the demo — enough to answer the
   question without building a multi-tenant platform.)*
6. **One moonshot to prioritize?** (§7; recommend cost-aware healing, or the upstream PR if you want
   maximum credibility per hour.)
7. **Design direction and scope** — the four decisions are in §14.7 (art direction A vs B, type
   pairing, theme scope, and how far to take the redesign).

---

## 14. Frontend & visual design — making it look expensive, not generated

Short version: **the design problem here is not "not enough animation".** Your CSS already animates
every section, stacks three background layers, and glows on hover. The problem is that every one of
those choices is the *default* choice, so the page reads as generated rather than authored. Fixing it
means **subtracting**, then adding exactly **one** signature interaction that only your product could
have.

### 14.1 The audit (measured from `web/src/index.css` + `web/index.html`, not vibes)

| Finding | Evidence in the repo | Why it reads as template |
|---|---|---|
| **Template display font** | `--font-display: "Space Grotesk"` (Google Fonts) | Space Grotesk is *the* AI-landing-page display face. A designer spots it instantly. |
| **Default palette** | `#F97316` = Tailwind `orange-500`; neutrals are Tailwind zinc; semantic colors are stock `green-500/amber-500/red-500/blue-500` | Nothing here is *yours*. There is no brand hue, only a framework's default ramp plus an accent swap. |
| **Palette bugs** (real defects) | `--color-accent-cyan: #FB923C` (named cyan, is orange); `.bg-radial-glow` paints **blue** `rgba(37,99,235,.12)` behind an orange brand; `<meta name="theme-color" content="#0A0F1A">` is navy vs `--color-bg: #050505` | Inconsistent tokens are the clearest sign nobody art-directed this. |
| **The "AI hero" trio** | `.bg-grid` (64px grid, 0.3 alpha) + `.bg-radial-glow` + `.bg-noise` stacked `fixed inset-0` | Three decorative background layers, zero information. Costs paint on every scroll. |
| **SaaS geometry** | 12px radius everywhere, 4 elevation levels, `--shadow-glow-primary` on `.card:hover` | Glow-on-hover + drop shadows is the Shopify-template signature; premium dev tools use hairlines and near-zero elevation. |
| **Uniform entrance motion** | `animate-fade-in-up` + `stagger-1..6` on essentially every section; `--ease-out-expo` | Animating *everything* the same way is the single biggest generated tell. Motion that carries no meaning reads as decoration. |
| **Broken focus styles** | `:focus-visible { outline: none; ring: 2px solid … }` — `ring` is not a CSS property | Focus indicators are effectively missing app-wide. An a11y defect *and* a craft defect. |
| **Uncontrolled theming** | Light mode is switched by `@media (prefers-color-scheme: light)` | Light-mode visitors see a design nobody reviewed. Premium products *choose* their theme. |
| **Font loading cost** | 3 Google Font families via `<link>`, `display=swap`, no self-hosting/fallback metrics | Render-blocking third-party request + CLS risk. |
| **Copy that decorates** | "Live trace timeline — hover stages for details" badge with a pinging dot; "0.089 ms/query" trust pills | Decorative claims where data should be. Same instinct as the fake metrics in §9. |

**Diagnosis:** this is a well-built app wearing a starter template. The engineering says "instrument",
the surface says "generated landing page". That gap is the whole opportunity.

### 14.2 The art direction: **“Forensic Instrument” (the case-file aesthetic)**

The test for a non-slop direction is: *could this be copied off a template gallery?* Yours can't,
because it comes from the product's own thesis — **a trace is evidence, and the tool is the thing
that attributes blame and re-tests the fix.** So design the interface like a laboratory case file.

**Vocabulary shift (this drives copy, URLs, empty states — everything):**

| Now | Becomes |
|---|---|
| trace / query | **case file** (the `query_id` is already your case number) |
| pipeline stage | **exhibit** ("Exhibit 3 of 5 — Rerank") |
| localizer output | **verdict** |
| heal | **re-test** |
| regression test | **filed case** |
| eval run | **batch review** |

This is the highest-leverage single decision in the section: it makes the product memorable, it gives
you unique copy for free, and it is impossible to mistake for AI slop.

**Signature duotone (ink + bone + one ownable accent):**

- **Ink** — near-black, very slightly warm (not `#000`, not zinc): e.g. `oklch(0.16 0.008 60)`.
- **Bone** — warm off-white for the light mode: e.g. `oklch(0.97 0.006 85)`.
- **Accent: oxidized copper** — e.g. `oklch(0.68 0.15 52)`. Deliberately derived from your existing
  orange but *desaturated and aged*, so it reads as a chosen brand color rather than `orange-500`.
- **Failure ramp derived from the brand, not Tailwind**: copper → rust → dried blood for
  retrieval/rerank → assembly → generation, and a muted **verdigris** for success instead of
  `green-500`. The failure palette *is* the brand palette — appropriate for a tool whose job is
  showing you what broke.
- **Geometry**: 1px hairlines instead of borders + shadows; **2px radius** (a technical instrument
  radius) with pills reserved for verdicts only; a strict 8px rhythm with 4px micro-steps; numbers
  always tabular mono and right-aligned in a column.
- **Substrate (replaces the grid/glow/noise trio)**: at most **one** static background element at
  ≤3% opacity — a faint ruled baseline grid in the hero that fades out by the fold — or nothing at
  all. Reference moods: lab notebook, annotated audit, oscilloscope readout, court exhibit labels.
  **Not** "dark SaaS with a neon accent".

**Typography — two complete, license-clean, self-hostable pairings:**

| | Display | UI text | Data / mono | Feel |
|---|---|---|---|---|
| **A (recommended)** | **Fraunces** (variable, optical sizing) | **Instrument Sans** | **Commit Mono** | Editorial + precise. A warm serif heading makes the page feel *authored*; the serif/sans/mono triptych is rare in dev tooling and instantly distinguishing. |
| **B** | **Instrument Serif** | **Public Sans** | **JetBrains Mono** | Sharper, lighter editorial feel; safer. |

**Ban outright:** Inter, Space Grotesk, Poppins, Manrope, Satoshi, Geist (and gradient text on
headings). Self-host the chosen faces with `size-adjust` fallback metrics so CLS stays ≈0 and the
Google Fonts request disappears.

**Role-named type scale** (the practice Vercel's Geist system documents — name styles by *role*, not
by pixel size):

| Role | Spec |
|---|---|
| `exhibit-label` | 11px, caps, +0.08em tracking, mono — used for every field label and meta row |
| `meta` | 12px mono, tabular numerals — ids, latencies, scores |
| `body` | 15px / 1.6, max 68ch |
| `lead` | 18px / 1.5, muted |
| `display-2` | clamp(1.75rem, 3vw, 2.5rem), −0.02em |
| `display-1` | clamp(2.75rem, 6vw, 4.5rem), −0.03em, `text-wrap: balance` |

Use only two text weights (500/600) plus one display weight. Restraint reads as expensive; five
weights read as a template.

### 14.3 Motion: two rules and one signature

**Directly answering "what about background animations":** don't. Animated backgrounds (gradient
blobs, particles, noise drift, aurora) are the most reliable "generated" signal there is, they burn
GPU on every scroll, and they say nothing about your product. Spend that budget on motion that
**explains the pipeline** instead.

**The signature interaction — "the run".** Your hero currently shows a static trace timeline. Make it
*execute*:

1. On viewport entry, the pipeline plays **once**, ~3.5–4s: exhibits illuminate in true pipeline
   order (query_rewrite → retrieval → rerank → assembly → generation), each emitting its latency tick.
2. The failing exhibit **desaturates the others** (draw attention by removing emphasis elsewhere, not
   by adding glow) and a verdict stamp lands with a one-frame overshoot.
3. A single copper underline sweeps the failing exhibit; the **Re-test** affordance pulses once.
4. It **stops and rests.** No looping. Infinite ambient motion is the amateur tell.
5. Ship a **drag-to-scrub handle** on the timeline. Turning a decorative mock into a real toy is worth
   more than every transition on the page combined.

**Scroll-linked narrative:** the landing pipeline diagram advances 1:1 with scroll (`useScroll` +
`useTransform`). Scrolling *is* the explanation; the diagram never animates on its own.

**The money moment (re-test):** shared-layout transition from the failing exhibit into the comparison
view (~320ms, spring `stiffness 320 / damping 32`); diff rows stagger in at 40ms; the changed param
chip sweeps once (600ms); recovered-signal pills spring in (`stiffness 400 / damping 30`). **Exactly
one** accent flash in the whole sequence. No confetti, no particles, no sound.

**Rule 1 — springs for physics, easing for state.** Springs (`stiffness 260–400`, `damping 28–34`,
`mass 1`) only for layout/drag/share-element moves. Easing for state changes:
`cubic-bezier(0.2, 0, 0, 1)` in, `cubic-bezier(0.4, 0, 1, 1)` out, at 120 / 180 / 300 / 600ms.
Animate **transform and opacity only** — never `width`/`height`/`top`/`left` (use Motion's `layout`
prop for FLIP instead).

**Rule 2 — restraint and honesty.** Max 3 concurrently animated elements; stagger 30–50ms (your
current 80ms reads sluggish); no animated counters unless the number is real; one motion budget per
page (hero run once per session, one scroll-linked element); and `prefers-reduced-motion` replaces
everything with instant state + opacity, showing the hero's final frame immediately.

**Micro-interaction spec:**

| Interaction | Spec |
|---|---|
| Button press | `scale 0.985`, 120ms |
| Hover | `translateY(-1px)` + hairline darkens, 150ms |
| Focus | 2px copper ring, 2px offset — **and fix the broken `:focus-visible`** |
| Tabs | sliding `layoutId` underline, 180ms (not an instant swap) |
| Panel / route change | crossfade 180ms + 4px rise |
| Table row hover | 1px accent left rail |
| Copy button | icon morph + 900ms confirm |
| Skeleton | shimmer 1.4s linear, **only** while actually loading, matching final layout |
| Command palette | scale 0.98→1 + fade, 160ms, backdrop blur 4px max |

### 14.4 Component-by-component plan

| File | Change | Why |
|---|---|---|
| `Layout.tsx` | Delete the three stacked background layers → one static substrate (or none). Nav becomes a hairline thin bar; wordmark in the display face with a mono version tag. Add a **⌘K command palette**. Theme becomes an explicit toggle, dark default. | Fixes the biggest tell, adds a premium interaction, ends the unreviewed light mode. |
| `Home.tsx` | Hero copy from ~40 words to ~12; one primary CTA + one text link; **delete** the ping-dot badge and the three trust pills, replace with a single mono specimen strip (`n=300 · κ=0.72 · 5 exhibits · 32 chunks`); scroll-linked pipeline; cut one of the three CTA sections. | Claims → data. Fewer words reads as confidence. |
| `Features.tsx` | 12 cards → 6, grouped into 3 sections (Instrumentation / Attribution / Repair) as editorial two-column rows with hairlines, not a card grid. | The 12-card grid is the most template-shaped thing in the app. |
| `LandingTraceTimeline.tsx` | Becomes the signature "run" + drag-to-scrub. | One memorable interaction beats ten decorative ones. |
| `DashboardApp.tsx` | Rounded-card grid → **instrument panel**: hairline separators, zero elevation, dense 8px rhythm, sticky case header, keyboard nav (`j`/`k`, `/`, `r` to re-test), mono case numbers. | Makes the tool feel like hardware. |
| `TraceTimeline.tsx` | Evidence stack: exhibits as labeled rows on a left rail, tabular numerals right-aligned in a true column, failing exhibit stamped + others desaturated. | Alignment encodes meaning; attention via subtraction. |
| `ComparisonView.tsx` | "Re-test": two specimen columns joined by a diff rail; changed values underlined with a single sweep; verdict stamp (`IMPROVED` / `UNCHANGED`) rotated ~1.5° — subtle, not kitschy. | This is the artifact that sells the product. |
| `ChunkTable.tsx`, tables | Data-grid craft: 11px caps mono headers, hairlines instead of zebra, right-aligned tabular numbers, 2px inline micro-bars for scores. | Data-viz *is* the design in a debugger. |
| `FailureBadge.tsx` | Verdict pills on the brand failure ramp (copper→rust→blood, verdigris for OK), not Tailwind red/amber/emerald. | Makes failures look intentional. |
| `EvalPanel.tsx` | Big-number cards → instrument readouts: hairline table, tabular numbers, per-intent heatmap cells (opacity encoding), overhead sparkline. | "Four cards with giant numbers" is the slop pattern. |
| `QueryList.tsx` | Case list with hairline rows, mono case numbers, status as a 2px left rail color. | Density with air. |
| Empty / loading / error states | Give them voice ("No case files yet. Run the batch review to open the first one."), skeletons that match final layout, a designed error state. | Reviewers click empty states on purpose. |
| `favicon.svg` + OG image + README diagrams | Re-cut in the new palette; docs diagrams use the same tokens. | Art-directing the *whole* artifact is the premium move. |

### 14.5 Anti-slop checklist (the ban list)

If any of these ship, the project gets mentally filed as generated: gradient mesh blobs · purple→pink
or blue→purple gradients · glassmorphism everywhere · glow on hover · a pinging "live" badge · emoji
as icons · three identical feature cards · "Trusted by 10,000+ teams" with fake logos · counters that
animate to invented numbers · ✨/🤖 AI iconography · gradient-text headings · `rounded-[24px]` on
everything · grid + glow + noise stacked as backgrounds · **uniform fade-up-on-scroll for every
section** · Lottie robots/brains · typing-effect headlines · cursor trails · confetti. And the three
slop fonts by name: Inter, Space Grotesk, Poppins.

### 14.6 Quality gates (verifiable, per the gating discipline in §11)

- **5-second test** — a stranger can say what the product does after 5s.
- **Squint test** — the hierarchy still reads when blurred.
- **Grayscale test** — hierarchy must survive with color removed (proves you're not leaning on hue).
- **Contrast audit** — WCAG AA minimum; target APCA Lc 60 body / Lc 90 strong (the Radix-scale
  guarantee), verified by a command, not by eye.
- **Lighthouse ≥95** on performance and accessibility; **CLS < 0.02** with self-hosted fonts.
- **Bundle** — currently a single 474 KB JS chunk (verified from `web/dist`); route-split landing vs.
  dashboard and lazy-load motion.
- **Keyboard-only pass** — every interactive element reachable with a visible focus ring.
- **Reduced-motion pass** — one screenshot with `prefers-reduced-motion` forced; page must still be
  legible and complete.
- **The taste gate** — "would this look at home next to Linear's docs, or on a template gallery?"

### 14.7 Scope, effort, and the design decisions I need

**Effort:** tokens + fonts + type scale ≈ 1 day · landing + signature interaction ≈ 2–3 days ·
dashboard instrument pass ≈ 2–3 days · comparison view + eval craft ≈ 1–2 days · a11y/perf gates ≈
1 day. **≈ 7–10 focused days total.**

**What NOT to do:** don't redesign every page, don't add a component library, don't add animation
libraries (Motion is already installed as `framer-motion` — use its `motion/react` import path), and
don't add pages. Tokens propagate, so a token swap plus the **three surfaces a stranger sees first**
(Landing → Timeline → Comparison) delivers ~80% of the perceived quality for ~30% of the work. Full
app coverage is polish, not priority.

**Decisions for you (raised as §13 item 7):**

1. **Direction** — A "Forensic Instrument" as specified, or B a more conventional precision-mono
   look? *(Recommend A: it's the one thing a template can't replicate.)*
2. **Type pairing** — Fraunces/Instrument Sans/Commit Mono, or Instrument Serif/Public Sans/JetBrains
   Mono? *(Recommend the first.)*
3. **Theme scope** — dark default with a real "bone paper" light mode, or dark only? *(Recommend dark
   default + a genuine light mode: shipping both proves craft, and the tokens already exist.)*
4. **Scope** — the three money surfaces, or full-app redesign? *(Recommend three surfaces now; the
   rest rides on the token change.)*

---

## 15. Sources (all fetched, not recalled)

1. Barnett, Kurniawan, Thudumu, Brannelly, Abdelrazek. *Seven Failure Points When Engineering a
   Retrieval Augmented Generation System.* arXiv:2401.05856 — "validation of a RAG system is only
   feasible during operation"; "robustness evolves rather than designed in at the start".
   <https://arxiv.org/abs/2401.05856>
2. Ru et al. *RAGChecker: A Fine-grained Framework for Diagnosing Retrieval-Augmented Generation.*
   arXiv:2408.08067 — diagnostic metrics for both modules, meta-validated vs. human judgment.
   <https://arxiv.org/abs/2408.08067>
3. Niu et al. *RAGTruth: A Hallucination Corpus for Developing Trustworthy Retrieval-Augmented
   Language Models.* arXiv:2401.00396 — ~18k annotated responses, word-level hallucination intensity.
   <https://arxiv.org/abs/2401.00396>
4. OpenTelemetry. *GenAI Semantic Conventions* — spans, metrics, events for GenAI clients, MCP, and
   provider conventions; Python reference compliance matrix.
   <https://github.com/open-telemetry/semantic-conventions-genai>
5. Arize. *What is Arize Phoenix?* — OTel + OpenInference tracing, evals, prompt management, span
   replay, datasets & experiments. <https://arize.com/docs/phoenix>
6. Langfuse. *Docs overview* — OSS AI engineering platform: tracing (sessions, agent graphs, cost,
   latency), prompt management, evals; OTel-based, self-hostable.
   <https://langfuse.com/docs>
7. Ragas. *List of available metrics* — context precision/recall, noise sensitivity, response
   relevancy, faithfulness, factual correctness, plus agentic metrics.
   <https://docs.ragas.io/en/stable/concepts/metrics/available_metrics/>

**Design sources (fetched for §14):**

8. Vercel. *Geist — Typography.* Role-named type scale (heading / copy / label / button), dedicated
   mono scale, tabular numerals for numeric UI. <https://vercel.com/geist/typography>
9. Radix. *Understanding the scale (Radix Colors).* 12 steps with a documented use case per step
   (1–2 app bg, 3–5 component bg, 6–8 borders/focus, 9–10 solid, 11–12 text) and APCA Lc60/Lc90
   contrast guarantees for text steps. <https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale>
10. Motion. *React animation.* Motion components, independent transform axes, enter/exit, variants,
    springs and keyframes. <https://motion.dev/docs/react-animation>
11. Linear. *The Linear Method.* Craft-first product principles: "scope projects down", "idea
    quality is driven by how creators feel while crafting", launch-and-keep-launching.
    <https://linear.app/method>

*(Not available in this environment: `firecrawl`, `agent-reach`, and the web-search backend. If you
want the competitive teardown deepened — pricing pages, star counts, feature-matrix rows, recent
changelogs — install the firecrawl CLI or re-enable search and I'll extend §3 with scraped detail.)*
