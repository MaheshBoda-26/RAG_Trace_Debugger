import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FeatureCard } from '../components/FeatureCard';
import type { Feature } from '../types/feature';

const features: Feature[] = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Five-Stage Instrumentation',
    description: 'Query rewrite → Retrieval → Rerank → Assembly → Generation. Every stage captures inputs, outputs, scores, latency, and timestamps in a structured event.',
    metric: '0.089 ms/query overhead',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Failure Localization (FR7)',
    description: 'Deterministic heuristic ranks stages by root-cause likelihood. Structural deficits (missing context) are checked before generation misses — because a generation miss is often a symptom of an upstream drop.',
    metric: '100% on test set',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'Framework-Agnostic Core',
    description: 'Plain Python trace collector — call it from any RAG framework. LangChain, LlamaIndex, Haystack, or custom pipelines all supported. Zero framework dependencies.',
    metric: 'Zero dependencies',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Honest Evaluation',
    description: '15 labeled queries with deliberately injected failures (missing context, contradictory sources, ambiguous phrasing, info hidden in tables). Results reported with explicit caveats — test set calibrated to this pipeline.',
    metric: '15/15 accuracy',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Runs Without API Keys',
    description: 'BM25-only retrieval + deterministic mock generation works out of the box. Add GEMINI_API_KEY to enable dense embeddings (text-embedding-004) and real LLM generation (Gemini 2.5-flash).',
    metric: 'Zero-config demo',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Human-Inspectable Traces',
    description: 'JSON files per query — one record, keyed by query ID (correlation ID). Open in any editor, version control, or pipe to analysis tools. No proprietary format lock-in.',
    metric: 'File-based store',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Query Rewrite / Expansion',
    description: 'Captures raw query and rewritten/expanded query. Useful for debugging whether expansion improved or degraded retrieval. Records original tokens vs. expanded tokens.',
    metric: 'Stage 1 of 5',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Hybrid Retrieval (FR2)',
    description: 'Dense embeddings (Gemini text-embedding-004, disk-cached) + BM25 keyword search fused via Reciprocal Rank Fusion (RRF, k=60). Captures ALL candidate chunks with dense/BM25/fused scores.',
    metric: 'Stage 2 of 5',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V4z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8v8M15 8v8" />
      </svg>
    ),
    title: 'Rerank with Kept/Dropped (FR3)',
    description: 'Cross-encoder reranking captures which chunks were kept vs. dropped with their rerank scores. The localizer checks: needed chunk retrieved but dropped → rerank failure.',
    metric: 'Stage 3 of 5',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Context Assembly (FR4)',
    description: 'Records the EXACT final context string passed to the LLM. Detects truncation: key term present in kept chunks but missing from assembled context → assembly failure.',
    metric: 'Stage 4 of 5',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5a3 3 0 1 0-3 3c0 1.5-.5 3-2 4v1c7 0 7-6 7-6a3 3 0 1 0-6 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 0 1-2-2c0-1.5.5-3 2-4v-1" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17a2 2 0 0 0 2-2c0-1.5-.5-3-2-4v-1" />
      </svg>
    ),
    title: 'Generation Capture (FR5)',
    description: 'Records the model\'s raw generated answer. Localizer checks: key terms present in context but absent from answer → generation failure (ignored/misused context).',
    metric: 'Stage 5 of 5',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Trace Overhead Measurement',
    description: 'The collector measures its OWN bookkeeping cost separately (trace_overhead_ms). Honest overhead reporting — it\'s the real cost tracing added, not an assumption. Avg: 0.089ms, p95: 0.230ms.',
    metric: 'Built-in',
  },
];

export function Features() {
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
                <span className="text-xs font-medium">All features</span>
              </div>
              <h1 className="mb-6">
                Features that <span className="text-primary">save debugging time</span>
              </h1>
              <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto">
                Every feature exists because a real debugging session needed it.
                No marketing checkboxes — just tools that help you find the broken stage fast.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="features-heading">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="feature-grid" role="list"
          >
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </motion.div>

          <div className="mt-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
              className="card max-w-3xl mx-auto"
            >
              <h2 className="font-display text-2xl mb-4 text-center">Pipeline Stage Detail</h2>
              <div className="space-y-4 text-sm">
                {[
                  { stage: '1. Query Rewrite', captures: 'Raw query, rewritten query, expansion tokens' },
                  { stage: '2. Retrieval', captures: 'All candidate chunks, dense/BM25/fused scores (RRF k=60)' },
                  { stage: '3. Rerank', captures: 'Kept vs. dropped chunks, rerank scores, drop reasons' },
                  { stage: '4. Assembly', captures: 'Exact final context string, token count, truncation flag' },
                  { stage: '5. Generation', captures: 'Raw model answer, model name, tokens, temperature' },
                ].map((item) => (
                  <div key={item.stage} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-surface rounded-lg">
                    <span className="font-mono text-primary font-medium w-36 sm:w-40 shrink-0">{item.stage}</span>
                    <span className="text-text-muted">{item.captures}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="mt-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
            >
              <Link to="/debugger" className="btn btn-primary">
                Try It in the Dashboard
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="section-sm relative" aria-labelledby="localizer-heading">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-4xl mx-auto"
          >
            <header className="text-center mb-12">
              <h2 id="localizer-heading" className="mb-4">
                How the <span className="text-primary">localizer</span> works
              </h2>
              <p className="text-lg text-text-muted">
                A deterministic heuristic — not an LLM judge — ranks stages by root-cause likelihood.
                Structural deficits are checked first because a generation miss is often a symptom of an upstream drop.
              </p>
            </header>

            <div className="space-y-4">
              {[
                { rank: 1, stage: 'Retrieval', check: 'Needed chunk NOT in retrieved candidates', type: 'Structural deficit' },
                { rank: 2, stage: 'Rerank', check: 'Needed chunk retrieved but DROPPED during rerank', type: 'Structural deficit' },
                { rank: 3, stage: 'Assembly', check: 'Key term in kept chunks but MISSING from assembled context (truncation)', type: 'Structural deficit' },
                { rank: 4, stage: 'Generation', check: 'Key terms in context but ABSENT from answer (ignored/misused)', type: 'Content misuse' },
                { rank: 5, stage: 'Query Rewrite', check: 'Rewrite replaced ALL original tokens (informational)', type: 'Informational' },
              ].map((item) => (
                <div
                  key={item.stage}
                  className="card flex flex-col sm:flex-row sm:items-center gap-4 p-4 relative overflow-hidden group"
                  style={{ borderLeft: `4px solid var(--color-${item.rank <= 3 ? 'error' : item.rank === 4 ? 'warning' : 'info'})` }}
                >
                  <div className="flex items-center gap-3 w-20 sm:w-24 shrink-0">
                    <span className="text-3xl font-display font-bold text-primary/20">{item.rank}</span>
                    <span className="font-display font-semibold text-text">{item.stage}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-text-muted">{item.check}</p>
                    <span className={`badge badge-${item.rank <= 3 ? 'error' : item.rank === 4 ? 'warning' : 'info'}`}>{item.type}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 card">
              <p className="text-text-muted">
                <strong>Important:</strong> The localizer provides a diagnostic aid, never a guaranteed verdict.
                Accuracy depends on how representative the test corpus and injected failures are of real-world cases.
                Results on the controlled test set (100%) may not generalize to arbitrary production RAG systems.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}