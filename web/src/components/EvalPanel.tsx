import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { EvalResults, FailureStage } from '../types/trace';
import { INTENT_LABELS } from '../types/trace';
import { FailureBadge } from './FailureBadge';

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function EvalPanelSkeleton() {
  return (
    <div className="border border-border bg-bg-elevated p-5" aria-busy="true">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-4 h-3 w-full" />
      <div className="skeleton mt-2 h-3 w-2/3" />
      <div className="skeleton mt-6 h-24 w-full" />
    </div>
  );
}

/** A readout row, not a card with a big number. */
function Readout({ label, value, scope }: { label: string; value: string; scope?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-t border-border py-2.5">
      <span className="exhibit-label">{label}</span>
      <span className="flex items-baseline gap-3">
        {scope && <span className="meta">{scope}</span>}
        <span className="num text-sm text-text">{value}</span>
      </span>
    </div>
  );
}

interface EvalPanelProps {
  loading?: boolean;
}

export function EvalPanel({ loading: initialLoading = false }: EvalPanelProps = {}) {
  const [results, setResults] = useState<EvalResults | null>(null);
  const [loading, setLoading] = useState(initialLoading);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLatest();
  }, []);

  async function loadLatest() {
    setLoading(true);
    setError('');
    try {
      setResults(await api.getEvalResults());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load results');
    } finally {
      setLoading(false);
    }
  }

  async function run() {
    setLoading(true);
    setError('');
    try {
      setResults(await api.runEval());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'eval failed');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !results && !error) return <EvalPanelSkeleton />;

  const stages = results ? Object.keys(results.confusion) : [];
  const predicted = results
    ? Array.from(new Set(Object.values(results.confusion).flatMap((row) => Object.keys(row))))
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">Batch review</h2>
          <p className="meta mt-1">
            {results
              ? `${results.total} labeled cases · generator: ${
                  results.gemini_enabled ? 'gemini 2.5-flash' : 'deterministic mock'
                } · run ${results.ran_at.slice(0, 16).replace('T', ' ')}`
              : 'Run the labeled batch to measure localization.'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadLatest} disabled={loading} className="btn btn-secondary btn-sm">
            load latest
          </button>
          <button onClick={run} disabled={loading} className="btn btn-primary btn-sm">
            {loading ? 'running…' : 'run batch'}
          </button>
        </div>
      </div>

      {error && (
        <p
          className="border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
          role="alert"
        >
          {error}
        </p>
      )}

      {!results && !error && !loading && (
        <p className="text-sm text-text-muted">
          No recorded run yet. “Run batch” executes every labeled case and writes the results file.
        </p>
      )}

      {results && (
        <>
          <section aria-label="Headline measurements">
            <h3 className="exhibit-label">headline</h3>
            <div className="mt-2">
              <Readout
                label="localization accuracy"
                value={`${results.correct} / ${results.total} · ${pct(results.localization_accuracy)}`}
                scope="labeled set"
              />
              {results.intent_classification_accuracy !== null && (
                <Readout
                  label="intent classification"
                  value={pct(results.intent_classification_accuracy)}
                  scope="same labeled set"
                />
              )}
              <Readout
                label="tracer bookkeeping"
                value={`avg ${results.overhead_ms.avg} ms · p95 ${results.overhead_ms.p95} · max ${results.overhead_ms.max}`}
                scope="collector itself"
              />
              <Readout
                label="stage classes covered"
                value={`${stages.length} classes`}
                scope={stages.map((s) => `${s}:${results.confusion[s][s] ?? 0}`).join(' · ')}
              />
              <div className="border-t border-border" />
            </div>
            <p className="meta mt-3 max-w-3xl">
              These labels were authored alongside the pipeline, so accuracy here measures internal
              consistency rather than generalization. Classes with a single case are anecdotes.
            </p>
          </section>

          {/* Confusion matrix — published, including the zeros. */}
          <section aria-label="Confusion matrix">
            <h3 className="exhibit-label">confusion · labeled stage × verdict</h3>
            <div
              className="mt-3 overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Confusion matrix, scrollable"
            >
              <table className="grid-table">
                <caption className="sr-only">
                  Localization confusion matrix: labeled stage against the localizer verdict
                </caption>
                <thead>
                  <tr>
                    <th scope="col">labeled ↓ / verdict →</th>
                    {predicted.map((stage) => (
                      <th key={stage} scope="col" className="num-col">
                        {stage}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stages.map((labeled) => (
                    <tr key={labeled}>
                      <th scope="row" className="font-mono font-normal text-text-muted">
                        {labeled}
                      </th>
                      {predicted.map((stage) => {
                        const count = results.confusion[labeled]?.[stage] ?? 0;
                        const diagonal = labeled === stage;
                        return (
                          <td
                            key={stage}
                            className="num-col"
                            style={{
                              color:
                                count === 0
                                  ? 'var(--color-text-dim)'
                                  : diagonal
                                    ? 'var(--color-success)'
                                    : 'var(--color-error)',
                            }}
                          >
                            {count}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Intent stratification */}
          {results.accuracy_by_intent && Object.keys(results.accuracy_by_intent).length > 0 && (
            <section aria-label="Accuracy by intent">
              <h3 className="exhibit-label">accuracy by intent class</h3>
              <div
                className="mt-3 overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label="Accuracy by intent, scrollable"
              >
                <table className="grid-table">
                  <caption className="sr-only">Localization accuracy stratified by query intent</caption>
                  <thead>
                    <tr>
                      <th scope="col">intent</th>
                      <th scope="col" className="num-col">
                        correct / total
                      </th>
                      <th scope="col" className="num-col">
                        accuracy
                      </th>
                      <th scope="col">note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(results.accuracy_by_intent)
                      .sort((a, b) => a[1].accuracy - b[1].accuracy)
                      .map(([intent, stat]) => (
                        <tr key={intent}>
                          <th scope="row" className="font-normal text-text">
                            {INTENT_LABELS[intent] ?? intent}
                          </th>
                          <td className="num-col">
                            {stat.correct}/{stat.total}
                          </td>
                          <td
                            className="num-col"
                            style={{
                              color:
                                stat.accuracy >= 0.85
                                  ? 'var(--color-success)'
                                  : 'var(--color-error)',
                            }}
                          >
                            {pct(stat.accuracy)}
                          </td>
                          <td className="text-text-dim">
                            {stat.total < 3 ? 'too few cases to read' : ''}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Per-case */}
          <section aria-label="Per-case results">
            <h3 className="exhibit-label">per case</h3>
            <div
              className="mt-3 overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Per-case results, scrollable"
            >
              <table className="grid-table">
                <caption className="sr-only">Per-case localization results</caption>
                <thead>
                  <tr>
                    <th scope="col">case</th>
                    <th scope="col">query</th>
                    <th scope="col">labeled</th>
                    <th scope="col">verdict</th>
                    <th scope="col" className="num-col">
                      tracer ms
                    </th>
                    <th scope="col">match</th>
                  </tr>
                </thead>
                <tbody>
                  {results.per_query.map((q) => (
                    <tr key={q.query_id}>
                      <th scope="row" className="font-mono font-normal text-text-dim">
                        {q.query_id}
                      </th>
                      <td className="max-w-xs truncate text-text-muted" title={q.query}>
                        {q.query}
                      </td>
                      <td>
                        <FailureBadge stage={q.ground_truth as FailureStage} size="sm" showIcon={false} />
                      </td>
                      <td>
                        <FailureBadge stage={q.indicated as FailureStage} size="sm" showIcon={false} />
                      </td>
                      <td className="num-col">{q.trace_overhead_ms.toFixed(3)}</td>
                      <td
                        className="font-mono text-[0.6875rem] uppercase tracking-wider"
                        style={{
                          color: q.correct ? 'var(--color-success)' : 'var(--color-error)',
                        }}
                      >
                        {q.correct ? 'ok' : 'miss'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
