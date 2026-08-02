import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export function About() {
  return (
    <>
      <section className="hero relative min-h-[60vh]">
        <div className="container hero-content">
          <div className="max-w-4xl mx-auto text-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 badge badge-info mb-6">
                <span className="text-xs font-medium">About the project</span>
              </div>
              <h1 className="mb-6">
                Why <span className="text-primary">RAG Trace Debugger</span> exists
              </h1>
              <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto">
                Production RAG systems fail silently. When an agent gives a wrong answer,
                engineers have no reliable way to tell whether the fault lies in retrieval,
                reranking, context assembly, or generation. This tool localizes the failure.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="problem-heading">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto space-y-12"
          >
            <article>
              <header className="mb-8">
                <h2 id="problem-heading" className="font-display text-3xl mb-4">
                  The <span className="text-primary">problem</span>
                </h2>
              </header>
              <div className="prose prose-invert max-w-none text-text-muted space-y-6">
                <p>
                  Production RAG (Retrieval-Augmented Generation) systems fail silently. When a RAG-powered agent
                  gives a wrong or nonsensical answer, engineers currently have no reliable way to determine
                  <em>why</em> it failed — whether the fault lies in:
                </p>
                <ul className="list-disc list-inside space-y-3 pl-4">
                  <li><strong>Retrieval</strong> — wrong or missing chunks retrieved</li>
                  <li><strong>Reranking</strong> — right chunks retrieved but dropped or buried</li>
                  <li><strong>Context Assembly</strong> — right chunks but poorly assembled (truncation, ordering)</li>
                  <li><strong>Generation</strong> — right context but ignored or misused by the model</li>
                </ul>
                <p>
                  This lines up with what practitioners commonly report: retrieval, not generation, is frequently
                  the actual point of failure, yet most debugging effort today goes into tweaking prompts or swapping
                  models because there's no visibility into the retrieval layer itself. Multiple engineering write-ups
                  point to the same root cause: without trace-level logging across pipeline stages, debugging a bad
                  answer comes down to guesswork.
                </p>
                <p>
                  This is directly relevant to any team running RAG-based agents pulling from policy documents,
                  pricing sheets, call transcripts, or knowledge bases — there is no tooling to localize failures quickly.
                </p>
              </div>
            </article>

            <article>
              <header className="mb-8">
                <h2 className="font-display text-3xl mb-4">
                  The <span className="text-primary">solution</span>
                </h2>
              </header>
              <div className="prose prose-invert max-w-none text-text-muted space-y-6">
                <p>
                  RAG Trace Debugger is a <strong>tracing and debugging layer</strong> that wraps an existing RAG
                  pipeline — without altering its core architecture — so that any engineer can select a query,
                  see the full chain of what happened at every stage, and immediately identify which stage caused
                  a bad answer.
                </p>
                <p className="font-semibold text-text">
                  <em>Diagnostic, not curative.</em> It narrows down <em>where</em> a failure happened; it does not
                  correct retrieval, reranking, or generation.
                </p>
                <h3 className="font-display text-xl text-text">Five pipeline stages are instrumented:</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold text-text">Stage</th>
                      <th className="text-left p-3 font-semibold text-text">Captures</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-3 font-mono text-primary">query_rewrite</td>
                      <td className="p-3 text-text-muted">Raw query, rewritten query</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-primary">retrieval</td>
                      <td className="p-3 text-text-muted">All candidate chunks + dense/BM25/fused scores</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-primary">rerank</td>
                      <td className="p-3 text-text-muted">Kept vs. dropped chunks + rerank scores</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-primary">assembly</td>
                      <td className="p-3 text-text-muted">Exact final context string passed to the LLM</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono text-primary">generation</td>
                      <td className="p-3 text-text-muted">Model's raw generated answer</td>
                    </tr>
                  </tbody>
                </table>
                <p>
                  Each stage records status, inputs, outputs, latency, and timestamps. One JSON record per query,
                  keyed by query ID (correlation ID). The trace collector measures its own bookkeeping cost
                  separately (<code className="code-inline">trace_overhead_ms</code>) so the overhead metric is honest.
                </p>
              </div>
            </article>

            <article>
              <header className="mb-8">
                <h2 className="font-display text-3xl mb-4">
                  Failure <span className="text-primary">localization</span>
                </h2>
              </header>
              <div className="prose prose-invert max-w-none text-text-muted space-y-6">
                <p>
                  A deterministic heuristic ranks stages by likelihood of being the root cause.
                  <strong>Structural deficits</strong> (the needed information never reached the model) are checked
                  before generation, because a generation miss is often a <em>symptom</em> of an upstream drop:
                </p>
                <ol className="list-decimal list-inside space-y-3 pl-4">
                  <li><strong>Retrieval</strong> — needed chunk not in retrieved candidates</li>
                  <li><strong>Rerank</strong> — needed chunk retrieved but dropped</li>
                  <li><strong>Assembly</strong> — key term present in kept chunks but missing from assembled context (truncation)</li>
                  <li><strong>Generation</strong> — key terms present in context but absent from answer (ignored/misused)</li>
                  <li><strong>Query Rewrite</strong> — informational: rewrite replaced all original tokens</li>
                </ol>
                <p>
                  The result is a <strong>diagnostic aid</strong>, never a guaranteed verdict.
                  Accuracy of localization depends on how representative the test corpus and injected failures
                  are of real-world cases.
                </p>
              </div>
            </article>

            <article>
              <header className="mb-8">
                <h2 className="font-display text-3xl mb-4">
                  <span className="text-primary">Tech stack</span>
                </h2>
              </header>
              <div className="prose prose-invert max-w-none text-text-muted space-y-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-semibold text-text">Layer</th>
                      <th className="text-left p-3 font-semibold text-text">Choice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr>
                      <td className="p-3 font-semibold text-text">Backend + trace core + pipeline</td>
                      <td className="p-3">Python 3.12 — FastAPI, pydantic, numpy, httpx</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-text">Dense retrieval</td>
                      <td className="p-3">Gemini <code className="code-inline">text-embedding-004</code> (disk-cached) — falls back to BM25-only when no API key</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-text">Keyword retrieval</td>
                      <td className="p-3">BM25 (pure Python, no external dep)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-text">Fusion</td>
                      <td className="p-3">Reciprocal Rank Fusion (RRF, k=60)</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-text">Generation</td>
                      <td className="p-3">Gemini 2.5-flash when <code className="code-inline">GEMINI_API_KEY</code> set; deterministic mock fallback otherwise</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-text">Trace store</td>
                      <td className="p-3">JSON files — <code className="code-inline">data/traces/&lt;query_id&gt;.json</code>, human-inspectable</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-semibold text-text">Dashboard</td>
                      <td className="p-3">React + Vite + TypeScript + Tailwind CSS 4</td>
                    </tr>
                  </tbody>
                </table>
                <p>
                  <strong>Runs end-to-end with zero API keys.</strong> Set <code className="code-inline">GEMINI_API_KEY</code> to upgrade
                  retrieval (dense+hybrid) and generation (real LLM) — the dashboard shows which mode is active.
                </p>
              </div>
            </article>

            <article>
              <header className="mb-8">
                <h2 className="font-display text-3xl mb-4">
                  <span className="text-primary">Demo corpus & evaluation</span>
                </h2>
              </header>
              <div className="prose prose-invert max-w-none text-text-muted space-y-6">
                <p>
                  A fictional "Northwind SaaS" knowledge base: <strong>12 markdown docs</strong> (31 chunks) with
                  deliberately embedded failure conditions:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Missing info</strong> — answer requires combining facts from separate docs</li>
                  <li><strong>Contradictory sources</strong> — a legacy doc conflicts with current policy</li>
                  <li><strong>Ambiguous phrasing</strong> — query terms match the wrong docs</li>
                  <li><strong>Info hidden in tables</strong> — key facts only inside markdown tables</li>
                </ul>
                <p>
                  A labeled test set of <strong>15 queries</strong>, each with:
                </p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><code className="code-inline">ground_truth_failure</code> — manually-verified true failure stage</li>
                  <li><code className="code-inline">needed_chunk_ids</code> — chunks containing a correct answer</li>
                  <li><code className="code-inline">key_terms</code> — terms that should appear in a correct answer</li>
                </ul>
                <p>
                  The eval runner compares the localizer's <code className="code-inline">indicated_failure</code>
                  against <code className="code-inline">ground_truth_failure</code> → <strong>localization accuracy</strong>.
                </p>
              </div>
            </article>

            <article>
              <header className="mb-8">
                <h2 className="font-display text-3xl mb-4">
                  <span className="text-primary">Honest results</span>
                </h2>
              </header>
              <div className="prose prose-invert max-w-none text-text-muted space-y-6">
                <p>
                  Measured on the controlled test set (mock generator, no API key):
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="card text-center p-6">
                    <div className="text-4xl font-display font-bold text-success">100%</div>
                    <div className="text-text-muted">Localization accuracy (15/15)</div>
                  </div>
                  <div className="card text-center p-6">
                    <div className="text-4xl font-display font-bold text-primary">0.089 ms</div>
                    <div className="text-text-muted">Avg tracing overhead</div>
                  </div>
                  <div className="card text-center p-6">
                    <div className="text-4xl font-display font-bold text-primary">0.230 ms</div>
                    <div className="text-text-muted">p95 tracing overhead</div>
                  </div>
                </div>
                <div className="card p-6">
                  <p className="text-text-muted">
                    <strong>Caveat:</strong> 100% accuracy reflects a test set whose ground-truth labels were calibrated
                    to this specific pipeline's behavior. The PRD explicitly states results on this controlled set
                    may not generalize to arbitrary production RAG systems. The BM25-only mock run has no retrieval
                    failures because BM25 is a full-corpus search; a dense+hybrid run with a live Gemini key may
                    surface retrieval misses on low-overlap queries.
                  </p>
                </div>
              </div>
            </article>

            <article>
              <header className="mb-8">
                <h2 className="font-display text-3xl mb-4">
                  <span className="text-primary">Constraints & limitations</span>
                </h2>
              </header>
              <div className="prose prose-invert max-w-none text-text-muted space-y-6">
                <h3 className="font-display text-xl text-text">Constraints (9-day build window)</h3>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Single builder / small team scope</li>
                  <li>No paid infrastructure — local/free-tier only</li>
                  <li>Must run reliably on laptop for live demo</li>
                  <li>No time for production hardening, auth, multi-tenancy</li>
                </ul>
                <h3 className="font-display text-xl text-text mt-8">Known limitations</h3>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Diagnostic tool, not a fix-it tool — localizes failure, does not auto-resolve</li>
                  <li>Accuracy depends on representativeness of test corpus/injected failures</li>
                  <li>No claim that results generalize to arbitrary production RAG systems</li>
                  <li>Demo pipeline intentionally simple (not production-grade RAG stack)</li>
                  <li>Framework adapters (LangChain, LlamaIndex) are future work</li>
                </ul>
              </div>
            </article>
          </motion.div>

          <div className="mt-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to="/debugger" className="btn btn-primary mr-4">
                Open Dashboard
              </Link>
              <Link to="/features" className="btn btn-secondary">
                View Features
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section-sm relative" aria-labelledby="team-heading">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto text-center card"
          >
            <h2 id="team-heading" className="font-display text-2xl mb-4">
              Built for <span className="text-primary">engineers</span>, by engineers
            </h2>
            <p className="text-text-muted mb-8">
              No marketing fluff. No hidden agendas. Just a tool that saves debugging time.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-text-dim">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Framework-agnostic core
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Honest evaluation
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Zero-config demo
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                File-based traces
              </span>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}