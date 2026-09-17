import { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { EvalResults, FailureStage } from '../types/trace';
import { INTENT_COLORS, INTENT_LABELS } from '../types/trace';
import { FailureBadge } from './FailureBadge';

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function StatSkeleton() {
  return (
    <div className="rounded-lg p-3 border border-border animate-pulse">
      <div className="h-3 w-3/4 bg-border rounded mb-2" />
      <div className="h-8 w-1/2 bg-border rounded" />
    </div>
  );
}

function EvalPanelSkeleton() {
  return (
    <div className="border border-border rounded-lg p-4 bg-bg-elevated space-y-4 animate-pulse">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="h-5 w-24 bg-border rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-border rounded" />
          <div className="h-7 w-16 bg-border rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <StatSkeleton key={i} />)}
      </div>
      <div className="h-5 w-1/3 bg-border rounded" />
      <div className="space-y-3">
        <div className="h-4 w-1/4 bg-border rounded" />
        <div className="h-12 w-full bg-border rounded" />
        <div className="h-12 w-full bg-border rounded" />
        <div className="h-12 w-full bg-border rounded" />
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg p-3 border transition-colors ${
        highlight
          ? 'border-primary bg-bg'
          : 'border-border bg-bg-elevated hover:border-text-dim'
      }`}
    >
      <div className="text-xs text-text-dim">{label}</div>
      <div className={`text-lg font-semibold ${highlight ? 'text-text' : 'text-text-muted'}`}>
        {value}
      </div>
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
      const r = await api.getEvalResults();
      setResults(r);
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
      const r = await api.runEval();
      setResults(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'eval failed');
    } finally {
      setLoading(false);
    }
  }

  if (loading && !results && !error) {
    return <EvalPanelSkeleton />;
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-bg-elevated space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-text">Evaluation</h3>
        <div className="flex gap-2">
          <button
            onClick={loadLatest}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded border border-border text-text-muted hover:bg-bg disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-bg"
          >
            {loading ? 'Loading…' : 'Load latest'}
          </button>
          <button
            onClick={run}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded bg-primary text-white hover:bg-primary-hover disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-bg"
          >
            {loading ? 'Running…' : 'Run eval'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2" role="alert">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      {!results && !error && !loading && (
        <div className="text-center py-8">
          <svg className="w-12 h-12 mx-auto text-text-dim mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-text-dim max-w-md mx-auto">
            Click "Run eval" to execute the labeled batch and measure localization accuracy.
          </p>
        </div>
      )}

      {results && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="region" aria-label="Evaluation metrics">
            <Stat label="Localization accuracy" value={pct(results.localization_accuracy)} highlight />
            <Stat label="Correct / Total" value={`${results.correct}/${results.total}`} />
            <Stat label="Avg overhead" value={`${results.overhead_ms.avg} ms`} />
            <Stat label="p95 overhead" value={`${results.overhead_ms.p95} ms`} />
          </div>

          <div className="flex items-center gap-2 text-xs text-text-dim p-2 bg-bg border border-border rounded">
            <span>Generator:</span>
            <span
              className={`font-medium ${
                results.gemini_enabled
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {results.gemini_enabled ? 'Gemini 2.5-flash' : 'deterministic mock'}
            </span>
            {results.intent_classification_accuracy !== null &&
              results.intent_classification_accuracy !== undefined && (
                <>
                  <span className="text-border">·</span>
                  <span>
                    Intent accuracy:{' '}
                    <span className="font-medium text-text-muted">
                      {(results.intent_classification_accuracy * 100).toFixed(1)}%
                    </span>
                  </span>
                </>
              )}
            <span className="text-border">·</span>
            <span className="font-mono">{results.ran_at}</span>
          </div>

          {results.accuracy_by_intent && Object.keys(results.accuracy_by_intent).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-text-muted mb-2">
                Localization accuracy by query intent
              </h4>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs" role="table" aria-label="Accuracy per intent class">
                  <thead>
                    <tr className="text-left text-text-dim border-b border-border bg-bg">
                      <th className="py-2 px-3 font-medium">Intent</th>
                      <th className="py-2 px-3 font-medium">Correct / Total</th>
                      <th className="py-2 px-3 font-medium">Accuracy</th>
                      <th className="py-2 px-3 font-medium w-1/3">Weakest classes (left)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(results.accuracy_by_intent)
                      .sort((a, b) => a[1].accuracy - b[1].accuracy)
                      .map(([intent, stat]) => (
                        <tr key={intent} className="border-b border-border hover:bg-bg">
                          <td className="py-2 px-3">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${
                                INTENT_COLORS[intent] ?? INTENT_COLORS.OTHER
                              }`}
                            >
                              {INTENT_LABELS[intent] ?? intent}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono text-text-muted">
                            {stat.correct}/{stat.total}
                          </td>
                          <td
                            className={`py-2 px-3 font-medium tabular-nums ${
                              stat.accuracy >= 0.85
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {pct(stat.accuracy)}
                          </td>
                          <td className="py-2 px-3">
                            {stat.accuracy < 0.85 && (
                              <span className="text-text-dim">below 85% target</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold text-text-muted mb-2">Per-query results</h4>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs" role="table">
                <thead>
                  <tr className="text-left text-text-dim border-b border-border bg-bg">
                    <th className="py-2 px-3 font-medium">ID</th>
                    <th className="py-2 px-3 font-medium">Query</th>
                    <th className="py-2 px-3 font-medium">Ground truth</th>
                    <th className="py-2 px-3 font-medium">Indicated</th>
                    <th className="py-2 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.per_query.map((q) => (
                    <tr key={q.query_id} className="border-b border-border hover:bg-bg">
                      <td className="py-2 px-3 font-mono text-text-dim">{q.query_id}</td>
                      <td className="py-2 px-3 text-text-muted max-w-xs truncate" title={q.query}>
                        {q.query}
                      </td>
                      <td className="py-2 px-3">
                        <FailureBadge stage={q.ground_truth as FailureStage} size="sm" variant="chip" />
                      </td>
                      <td className="py-2 px-3">
                        <FailureBadge stage={q.indicated as FailureStage} size="sm" variant="chip" />
                      </td>
                      <td className="py-2 px-3 text-center">
                        {q.correct ? (
                          <span className="inline-flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="hidden sm:inline">Correct</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="hidden sm:inline">Incorrect</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
