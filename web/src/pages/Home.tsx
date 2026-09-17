import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { LandingTraceTimeline } from '../components/LandingTraceTimeline';
import { ExhibitStack } from '../components/ExhibitStack';

/* ------------------------------------------------------------------------- *
 * Measured numbers, copied from the recorded eval run
 * (server/data/eval/results.json, 2026-09-17, mock generator — no API key).
 * Each one is presented with its scope attached, because a number without a
 * scope is marketing.
 * ------------------------------------------------------------------------- */
const MEASUREMENTS = [
  {
    label: 'localization accuracy',
    value: '15 / 15',
    scope: 'one labeled set, one pipeline',
    note: 'Every case: the localizer’s verdict matched the labeled stage.',
  },
  {
    label: 'intent classification',
    value: '15 / 15',
    scope: 'same set — 14 of 15 are one class',
    note: 'A thin stratification: only 2 of 5 intent classes appear in the set.',
  },
  {
    label: 'tracer bookkeeping',
    value: '0.053 ms',
    scope: 'avg per case, in-process (p95 0.114, max 0.259)',
    note: 'This measures the collector itself — not an end-to-end latency A/B.',
  },
  {
    label: 'failure modes covered',
    value: '4 / 5',
    scope: 'none 7 · generation 6 · rerank 1 · assembly 1',
    note: 'Rerank and assembly rest on a single case each. Treat them as anecdotes.',
  },
];

const CAPABILITIES = [
  {
    group: 'instrumentation',
    title: 'Five-stage instrumentation',
    description:
      'Query rewrite → retrieval → rerank → assembly → generation. Each exhibit records its inputs, outputs, scores and latency into one structured event.',
    metric: '5 exhibits',
  },
  {
    group: 'instrumentation',
    title: 'Framework-agnostic core',
    description:
      'A plain Python collector with drop-in LangChain and LlamaIndex adapters. The core has no framework dependencies, and traces are JSON files you can read.',
    metric: '0 framework deps',
  },
  {
    group: 'attribution',
    title: 'Deterministic localization',
    description:
      'Structural deficits are checked before generation misses, because a generation miss is usually a symptom of something upstream being dropped.',
    metric: 'not an LLM judge',
  },
  {
    group: 'attribution',
    title: 'Intent-aware risk profiles',
    description:
      'Every query is classified, and the case file shows which exhibits that intent class tends to break — so you know where to look before you read a single stage.',
    metric: '5 intent classes',
  },
  {
    group: 'repair',
    title: 'Re-test with adjusted parameters',
    description:
      'One click re-runs the failed case with bumped retrieval depth, rerank depth or context budget, then shows a stage-by-stage diff of exactly what changed.',
    metric: 'before / after',
  },
  {
    group: 'repair',
    title: 'Verdicts that can say “no”',
    description:
      'A re-test that does not recover the missing signal reports that it was not parameter-fixable — instead of rounding a failure into a win.',
    metric: 'honest by default',
  },
];

function LiveDemo() {
  const [query, setQuery] = useState('What is the audit-log export API rate limit?');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    query_id: string;
    answer: string;
    indicated_failure: string;
    intent: string;
    intent_confidence: number;
  } | null>(null);
  const navigate = useNavigate();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    setRunning(true);
    setError('');
    try {
      const trace = await api.runQuery({ query });
      setResult({
        query_id: trace.query_id,
        answer: trace.answer,
        indicated_failure: trace.indicated_failure,
        intent: trace.intent,
        intent_confidence: trace.intent_confidence,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'query failed (is the API server running?)');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_1.1fr] md:gap-16">
      <div>
        <h2>Open a case file</h2>
        <p className="mt-4 max-w-md text-text-muted">
          This runs the real pipeline and stores a trace. The verdict below is computed by the same
          localizer the dashboard uses — nothing here is mocked.
        </p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="live-query" className="sr-only">
            Query
          </label>
          <input
            id="live-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ask about Northwind SaaS…"
            className="field flex-1 text-sm"
          />
          <button type="submit" disabled={running} className="btn btn-primary whitespace-nowrap">
            {running ? 'Tracing…' : 'Run traced case'}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="border border-border bg-bg-elevated p-5">
        <div className="flex items-center justify-between">
          <span className="exhibit-label">verdict</span>
          <span className="meta">{result ? result.query_id : 'awaiting input'}</span>
        </div>
        <div className="mt-5 min-h-[7.5rem]">
          {!result && !running && (
            <p className="text-sm text-text-dim">
              Run a case to see its intent, its verdict, and the answer the pipeline produced.
            </p>
          )}
          {running && <div className="skeleton h-24 w-full" aria-hidden="true" />}
          {result && !running && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="badge badge-primary">
                  intent {result.intent || 'unknown'}
                  {result.intent ? ` · ${Math.round(result.intent_confidence * 100)}%` : ''}
                </span>
                {result.indicated_failure === 'none' ? (
                  <span className="stamp stamp-ok">verdict · clean</span>
                ) : (
                  <span className="stamp stamp-bad">verdict · {result.indicated_failure}</span>
                )}
              </div>
              <p className="mt-4 text-sm text-text-muted">{result.answer}</p>
              <button
                type="button"
                onClick={() => navigate('/debugger')}
                className="nav-link mt-4 inline-block"
              >
                Open the full case file →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function Home() {
  return (
    <>
      {/* Hero — the whole claim is six words. Everything else is data. */}
      <section className="hero substrate pb-12 pt-14 md:pb-16 md:pt-20">
        <div className="container">
          <div className="max-w-3xl">
            <p className="exhibit-label">diagnostic layer for RAG pipelines</p>
            <h1 className="mt-5">
              See which stage
              <br />
              broke your answer.
            </h1>
            <p className="mt-6 max-w-xl text-text-muted md:text-lg">
              A trace is evidence: every stage recorded, one verdict, then a re-test.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Link to="/debugger" className="btn btn-primary">
                Open a case file
              </Link>
              <Link to="/features" className="nav-link">
                How it works →
              </Link>
            </div>
          </div>

          {/* Specimen strip: facts about the instrument, not praise about it. */}
          <dl className="mt-12 flex flex-wrap gap-x-9 gap-y-3 border-t border-border pt-4">
            {[
              ['exhibits / case', '5'],
              ['labeled cases', '15'],
              ['stored as', '1 JSON file'],
              ['framework deps', '0'],
              ['api key', 'not required'],
            ].map(([term, value]) => (
              <div key={term} className="flex items-baseline gap-2">
                <dt className="exhibit-label">{term}</dt>
                <dd className="meta num text-text-muted">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-14">
            <LandingTraceTimeline />
          </div>
        </div>
      </section>

      {/* Scroll-linked narrative: what each exhibit proves. */}
      <section className="section" aria-labelledby="contents-heading">
        <div className="container">
          <div className="max-w-2xl">
            <p className="exhibit-label">what a case file contains</p>
            <h2 id="contents-heading" className="mt-4">
              Every stage keeps a receipt.
            </h2>
            <p className="mt-5 text-text-muted">
              Five exhibits per case. The signature column is what a failure at that stage looks like
              in the trace — the pattern the localizer matches against.
            </p>
          </div>
          <ExhibitStack />
        </div>
      </section>

      <hr className="rule-fade" />

      {/* Live demo */}
      <section className="section" aria-labelledby="demo-heading">
        <div className="container">
          <LiveDemo />
        </div>
      </section>

      <hr className="rule-fade" />

      {/* Evidence — including what has not been measured. */}
      <section className="section" aria-labelledby="evidence-heading">
        <div className="container">
          <div className="max-w-2xl">
            <p className="exhibit-label">recorded eval run · 2026-09-17 · mock generator</p>
            <h2 id="evidence-heading" className="mt-4">
              What we measured — and what we haven’t.
            </h2>
          </div>

          <div
            className="mt-10 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Recorded measurements, scrollable"
          >
            <table className="grid-table">
              <caption className="sr-only">
                Recorded measurement results with scope and caveats
              </caption>
              <thead>
                <tr>
                  <th scope="col">measurement</th>
                  <th scope="col" className="num-col">
                    value
                  </th>
                  <th scope="col">scope</th>
                  <th scope="col">note</th>
                </tr>
              </thead>
              <tbody>
                {MEASUREMENTS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="font-normal text-text">
                      {row.label}
                    </th>
                    <td className="num-col text-text">{row.value}</td>
                    <td className="text-text-dim">{row.scope}</td>
                    <td className="text-text-muted">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid gap-8 border-t border-border pt-6 md:grid-cols-[1fr_1fr]">
            <p className="text-sm text-text-muted">
              <span className="exhibit-label mr-2">disclosure</span>
              The labels in this set were authored alongside the pipeline, so 15/15 measures internal
              consistency rather than generalization. The measurement that would settle it —
              agreement with an independent annotator (κ) on a larger set — is not taken yet. We would
              rather show you the gap than round it away.
            </p>
            <p className="text-sm text-text-muted">
              <span className="exhibit-label mr-2">method</span>
              Localization and overhead both come from{' '}
              <code className="code-inline">python -m server.eval.runner</code>, which writes{' '}
              <code className="code-inline">server/data/eval/results.json</code>. The dashboard shows
              the same numbers, stratified by intent class.
            </p>
          </div>
        </div>
      </section>

      <hr className="rule-fade" />

      {/* Capabilities — editorial rows in three groups, not a card grid. */}
      <section className="section" aria-labelledby="capabilities-heading">
        <div className="container">
          <div className="max-w-2xl">
            <h2 id="capabilities-heading">What it does</h2>
          </div>
          <div className="mt-10">
            {CAPABILITIES.map((item) => (
              <div key={item.title} className="feature-row">
                <span className="exhibit-label">{item.group}</span>
                <div>
                  <h3 className="text-text">{item.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-text-muted">{item.description}</p>
                </div>
                <span className="meta md:text-right">{item.metric}</span>
              </div>
            ))}
            <div className="border-t border-border" />
          </div>

          <div className="mt-8">
            <Link to="/features" className="nav-link">
              Full method — instrumentation, adapters, localizer ranking →
            </Link>
          </div>
        </div>
      </section>

      {/* One closing action, not three. */}
      <section className="section-sm" aria-labelledby="start-heading">
        <div className="container">
          <div className="flex flex-col justify-between gap-6 border-t border-border pt-8 md:flex-row md:items-center">
            <div>
              <h2 id="start-heading">Run it yourself.</h2>
              <p className="mt-2 text-sm text-text-muted">
                Two processes, no API keys, and a labeled set to check the verdicts against.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link to="/debugger" className="btn btn-primary">
                Open a case file
              </Link>
              <a
                href="https://github.com/MaheshBoda-26/RAG_Trace_Debugger"
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
              >
                Source ↗
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
