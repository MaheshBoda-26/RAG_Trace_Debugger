import { useState } from 'react';
import { api } from '../api/client';
import type { EvalResults, FailureStage } from '../types/trace';
import { FailureBadge } from './FailureBadge';

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function EvalPanel() {
  const [results, setResults] = useState<EvalResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadLatest() {
    try {
      setError('');
      const r = await api.getEvalResults();
      setResults(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load results');
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

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Evaluation</h3>
        <div className="flex gap-2">
          <button
            onClick={loadLatest}
            className="text-xs px-3 py-1 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Load latest
          </button>
          <button
            onClick={run}
            disabled={loading}
            className="text-xs px-3 py-1 rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
          >
            {loading ? 'Running…' : 'Run eval'}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}

      {!results && !error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Click “Run eval” to execute the labeled batch and measure localization accuracy.
        </p>
      )}

      {results && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Localization accuracy" value={pct(results.localization_accuracy)} highlight />
            <Stat label="Correct / Total" value={`${results.correct}/${results.total}`} />
            <Stat label="Avg overhead" value={`${results.overhead_ms.avg} ms`} />
            <Stat label="p95 overhead" value={`${results.overhead_ms.p95} ms`} />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
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
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Per-query results</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-1.5 pr-3 font-medium">ID</th>
                    <th className="py-1.5 pr-3 font-medium">Query</th>
                    <th className="py-1.5 pr-3 font-medium">Ground truth</th>
                    <th className="py-1.5 pr-3 font-medium">Indicated</th>
                    <th className="py-1.5 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.per_query.map((q) => (
                    <tr key={q.query_id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3 font-mono text-slate-400">{q.query_id}</td>
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300 max-w-xs truncate">
                        {q.query}
                      </td>
                      <td className="py-1.5 pr-3">
                        <FailureBadge stage={q.ground_truth as FailureStage} />
                      </td>
                      <td className="py-1.5 pr-3">
                        <FailureBadge stage={q.indicated as FailureStage} />
                      </td>
                      <td className="py-1.5">
                        {q.correct ? (
                          <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                        ) : (
                          <span className="text-rose-600 dark:text-rose-400">✗</span>
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

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg p-3 border ${
        highlight
          ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/60'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-lg font-semibold ${highlight ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
        {value}
      </div>
    </div>
  );
}
