import { Link } from 'react-router-dom';
import { LandingTraceTimeline } from '../components/LandingTraceTimeline';
import { FeatureCard } from '../components/FeatureCard';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Five-Stage Instrumentation',
    description: 'Query rewrite → Retrieval → Rerank → Assembly → Generation. Every stage captures inputs, outputs, scores, latency, and timestamps.',
    metric: '0.089 ms/query overhead',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Failure Localization',
    description: 'Deterministic heuristic ranks stages by root-cause likelihood. Structural deficits (missing context) checked before generation misses.',
    metric: '100% on test set',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: 'Framework-Agnostic Core',
    description: 'Plain Python trace collector — call from any RAG framework. LangChain, LlamaIndex, or custom pipelines all supported.',
    metric: 'Zero dependencies',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Honest Evaluation',
    description: '15 labeled queries with injected failures. Results reported with caveats — test set calibrated to this pipeline, not claimed to generalize.',
    metric: '15/15 accuracy',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Runs Without API Keys',
    description: 'BM25-only retrieval + deterministic mock generation works out of the box. Add GEMINI_API_KEY for dense embeddings + real LLM generation.',
    metric: 'Zero-config demo',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Human-Inspectable Traces',
    description: 'JSON files per query — one record, keyed by query ID. Open in any editor, version control, or pipe to analysis tools.',
    metric: 'File-based store',
  },
];

export function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero relative">
        <div className="container hero-content">
          <div className="max-w-4xl mx-auto text-center px-4">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 badge badge-info mb-6 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-info" />
              </span>
              <span className="text-xs font-medium">Live trace timeline — hover stages for details</span>
            </div>

            {/* Headline */}
            <h1 className="mb-6 animate-fade-in-up stagger-1">
              Debug RAG pipelines.
              <br />
              <span className="text-primary">See exactly where it broke.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto mb-10 animate-fade-in-up stagger-2">
              A diagnostic layer that wraps your RAG pipeline without changing it.
              Select any query → see the full stage-by-stage trace → identify the failing stage in seconds.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up stagger-3">
              <Link to="/debugger" className="btn btn-primary w-full sm:w-auto">
                Open Dashboard
              </Link>
              <Link to="/features" className="btn btn-secondary w-full sm:w-auto">
                View Features
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-text-dim animate-fade-in-up stagger-4">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                100% localization accuracy (test set)
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                0.089 ms/query overhead
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Runs without API keys
              </span>
            </div>
          </div>

          {/* Interactive Trace Timeline Hero */}
          <div className="mt-16 animate-fade-in-up stagger-5">
            <LandingTraceTimeline />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section relative" aria-labelledby="features-heading">
        <div className="container">
          <header className="text-center max-w-2xl mx-auto mb-16">
            <h2 id="features-heading" className="mb-4">
              Built for <span className="text-primary">engineers who debug</span>
            </h2>
            <p className="text-lg text-text-muted">
              Every feature exists because a real debugging session needed it.
              No marketing checkboxes — just tools that save time.
            </p>
          </header>

          <div className="feature-grid" role="list">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/features" className="btn btn-secondary">
              View all features →
            </Link>
          </div>
        </div>
      </section>

      {/* Code/Architecture Section */}
      <section className="section-sm relative" aria-labelledby="architecture-heading">
        <div className="container">
          <header className="text-center max-w-2xl mx-auto mb-12">
            <h2 id="architecture-heading" className="mb-4">
              <span className="text-primary">Framework-agnostic</span> by design
            </h2>
            <p className="text-lg text-text-muted">
              The trace collector is a plain Python module. Call it from any pipeline stage —
              no framework lock-in, no invasive changes.
            </p>
          </header>

          <div className="max-w-5xl mx-auto py-8">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {/* Stage 1 */}
              <div className="flex flex-col items-center bg-bg-elevated border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors shadow-card relative">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-3">1</div>
                <h4 className="text-sm font-semibold text-text mb-1">Query Rewrite</h4>
                <p className="text-xs text-text-dim leading-relaxed">Raw Query &rarr; Cleaned Search Query</p>
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 text-primary font-bold text-lg z-10">&rarr;</div>
              </div>

              {/* Stage 2 */}
              <div className="flex flex-col items-center bg-bg-elevated border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors shadow-card relative">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-3">2</div>
                <h4 className="text-sm font-semibold text-text mb-1">Retrieval</h4>
                <p className="text-xs text-text-dim leading-relaxed">Dense + Keyword (BM25) Candidate Search</p>
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 text-primary font-bold text-lg z-10">&rarr;</div>
              </div>

              {/* Stage 3 */}
              <div className="flex flex-col items-center bg-bg-elevated border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors shadow-card relative">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-3">3</div>
                <h4 className="text-sm font-semibold text-text mb-1">Rerank</h4>
                <p className="text-xs text-text-dim leading-relaxed">Scores Candidates, Prunes Top-K Chunks</p>
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 text-primary font-bold text-lg z-10">&rarr;</div>
              </div>

              {/* Stage 4 */}
              <div className="flex flex-col items-center bg-bg-elevated border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors shadow-card relative">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-3">4</div>
                <h4 className="text-sm font-semibold text-text mb-1">Context Assembly</h4>
                <p className="text-xs text-text-dim leading-relaxed">Builds Clean Prompts &amp; Context String</p>
                <div className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 text-primary font-bold text-lg z-10">&rarr;</div>
              </div>

              {/* Stage 5 */}
              <div className="flex flex-col items-center bg-bg-elevated border border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors shadow-card">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm mb-3">5</div>
                <h4 className="text-sm font-semibold text-text mb-1">Generation</h4>
                <p className="text-xs text-text-dim leading-relaxed">LLM Infers and Produces Answer</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3 text-center">
            <div className="card">
              <div className="text-3xl font-display font-bold text-primary mb-2">5</div>
              <div className="text-text-muted">Pipeline Stages</div>
            </div>
            <div className="card">
              <div className="text-3xl font-display font-bold text-primary mb-2">1</div>
              <div className="text-text-muted">JSON Record / Query</div>
            </div>
            <div className="card">
              <div className="text-3xl font-display font-bold text-primary mb-2">0</div>
              <div className="text-text-muted">Framework Dependencies</div>
            </div>
          </div>
        </div>
      </section>

      {/* Evaluation Results Section */}
      <section className="section relative" aria-labelledby="eval-heading">
        <div className="container">
          <header className="text-center max-w-2xl mx-auto mb-12">
            <h2 id="eval-heading" className="mb-4">
              Honest <span className="text-primary">evaluation results</span>
            </h2>
            <p className="text-lg text-text-muted">
              Measured on a controlled test set with injected failures.
              Ground-truth labels calibrated to observed pipeline behavior.
            </p>
          </header>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Accuracy Card */}
            <div className="card">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h3 className="font-display text-2xl mb-2">Localization Accuracy</h3>
                  <p className="text-text-muted">
                    On 15 deliberately broken queries (missing context, contradictory sources,
                    ambiguous phrasing, info hidden in tables)
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-5xl font-display font-bold text-success">100%</div>
                  <div className="text-sm text-text-dim">15 / 15 queries</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm text-text-dim">
                  <strong>Caveat:</strong> 100% accuracy reflects a test set whose ground-truth labels were
                  calibrated to this specific pipeline's behavior. Results on this controlled set
                  may not generalize to arbitrary production RAG systems.
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="card text-center">
                <div className="text-3xl font-display font-bold text-primary mb-1">0.089 ms</div>
                <div className="text-text-muted">Avg tracing overhead</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-display font-bold text-primary mb-1">0.230 ms</div>
                <div className="text-text-muted">p95 tracing overhead</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-display font-bold text-primary mb-1">~0.001%</div>
                <div className="text-text-muted">Pipeline latency impact</div>
              </div>
            </div>

            {/* Failure Mode Breakdown */}
            <div className="card">
              <h3 className="font-display text-xl mb-4">Failure Mode Distribution (Test Set)</h3>
              <div className="space-y-3">
                {[
                  { mode: 'none (clean)', count: 5, color: 'success' },
                  { mode: 'rerank', count: 2, color: 'warning' },
                  { mode: 'generation', count: 7, color: 'error' },
                  { mode: 'assembly', count: 1, color: 'info' },
                ].map((item) => (
                  <div key={item.mode} className="flex items-center gap-4">
                    <span className="w-40 text-sm font-medium text-text-muted">{item.mode}</span>
                    <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(item.count / 15) * 100}%`,
                          backgroundColor: `var(--color-${item.color})`,
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono font-bold" style={{ color: `var(--color-${item.color})` }}>
                      {item.count}/15
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 text-center">
            <Link to="/debugger" className="btn btn-primary">
              Run Evaluation in Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section relative" aria-labelledby="cta-heading">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center card relative overflow-hidden">
            <div className="absolute inset-0 bg-radial-glow" />
            <div className="relative z-10 py-8 md:py-16">
              <h2 id="cta-heading" className="mb-4">
                Ready to stop guessing?
              </h2>
              <p className="text-lg text-text-muted mb-8 max-w-lg mx-auto">
                Clone the repo, run the eval, open the dashboard. See a failure localized in 30 seconds.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a
                  href="https://github.com/MaheshBoda-26/RAG_Trace_Debugger"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                  View on GitHub
                </a>
                <Link to="/debugger" className="btn btn-secondary">
                  Open Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}