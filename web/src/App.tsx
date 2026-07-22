import { useCallback, useEffect, useState } from 'react';
import { api, deleteTraces } from './api/client';
import type { FailureStage, Trace, TraceSummary } from './types/trace';
import { QueryList } from './components/QueryList';
import { TraceTimeline } from './components/TraceTimeline';
import { EvalPanel } from './components/EvalPanel';

type Tab = 'debugger' | 'eval' | 'corpus';

export default function App() {
  const [tab, setTab] = useState<Tab>('debugger');
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [trace, setTrace] = useState<Trace | null>(null);
  const [filter, setFilter] = useState<FailureStage | 'all'>('all');
  const [health, setHealth] = useState<{ gemini_enabled: boolean } | null>(null);

  const [queryText, setQueryText] = useState('');
  const [queryTerms, setQueryTerms] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const loadTraces = useCallback(async () => {
    try {
      const list = await api.listTraces(filter === 'all' ? undefined : filter);
      setTraces(list);
      if (list.length && !selectedId) {
        setSelectedId(list[0].query_id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load traces');
    }
  }, [filter, selectedId]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    loadTraces();
  }, [loadTraces]);

  useEffect(() => {
    if (!selectedId) {
      setTrace(null);
      return;
    }
    api
      .getTrace(selectedId)
      .then(setTrace)
      .catch((e) => setError(e instanceof Error ? e.message : 'failed to load trace'));
  }, [selectedId]);

  async function runQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!queryText.trim()) return;
    setRunning(true);
    setError('');
    try {
      const key_terms = queryTerms
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const t = await api.runQuery({ query: queryText, key_terms });
      setTrace(t);
      setSelectedId(t.query_id);
      await loadTraces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'query failed');
    } finally {
      setRunning(false);
    }
  }

  async function onClear() {
    if (!confirm('Delete all stored traces?')) return;
    await deleteTraces();
    setTraces([]);
    setSelectedId(null);
    setTrace(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">RAG Trace Debugger</h1>
            {health && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${
                  health.gemini_enabled
                    ? 'border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300'
                    : 'border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300'
                }`}
              >
                {health.gemini_enabled ? 'Gemini live' : 'mock fallback'}
              </span>
            )}
          </div>
          <nav className="flex gap-1">
            {(['debugger', 'eval', 'corpus'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-sm px-3 py-1 rounded-md transition-colors capitalize ${
                  tab === t
                    ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {t === 'debugger' ? 'Debugger' : t === 'eval' ? 'Evaluation' : 'Corpus'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4">
        {error && (
          <div className="mb-4 text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded p-2">
            {error}
          </div>
        )}

        {tab === 'debugger' && (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
            {/* Left rail */}
            <aside className="space-y-3">
              <form onSubmit={runQuery} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-900 space-y-2">
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Run a query
                </label>
                <textarea
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Ask something about Northwind SaaS…"
                  rows={2}
                  className="w-full text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <input
                  value={queryTerms}
                  onChange={(e) => setQueryTerms(e.target.value)}
                  placeholder="key terms (comma-separated, optional)"
                  className="w-full text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
                <button
                  type="submit"
                  disabled={running}
                  className="w-full text-sm px-3 py-1.5 rounded bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 disabled:opacity-50"
                >
                  {running ? 'Running…' : 'Run query'}
                </button>
              </form>

              <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden h-[60vh]">
                <QueryList
                  traces={traces}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  filter={filter}
                  onFilter={setFilter}
                />
              </div>

              <button
                onClick={onClear}
                className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
              >
                Clear all traces
              </button>
            </aside>

            {/* Main pane */}
            <section>
              {trace ? (
                <div>
                  <div className="mb-3">
                    <div className="font-mono text-xs text-slate-400 mb-0.5">{trace.query_id}</div>
                    <h2 className="text-base font-medium text-slate-800 dark:text-slate-100">{trace.query}</h2>
                  </div>
                  <TraceTimeline trace={trace} />
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-12 text-center text-slate-500 dark:text-slate-400">
                  Select a traced query or run a new one to see its stage-by-stage timeline.
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'eval' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <EvalPanel />
          </div>
        )}

        {tab === 'corpus' && <CorpusView />}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
        RAG Trace Debugger · diagnostic tool, not a fix-it tool · localizes failure, does not auto-resolve
      </footer>
    </div>
  );
}

function CorpusView() {
  const [corpus, setCorpus] = useState<{ doc_count: number; chunk_count: number; docs: any[] } | null>(null);

  useEffect(() => {
    api.getCorpus().then(setCorpus).catch(() => {});
  }, []);

  if (!corpus) return <p className="text-sm text-slate-500">Loading corpus…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {corpus.doc_count} docs · {corpus.chunk_count} chunks
      </p>
      {corpus.docs.map((doc) => (
        <div key={doc.doc_id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-900">
          <h3 className="text-sm font-mono font-medium text-slate-800 dark:text-slate-100 mb-2">{doc.doc_id}</h3>
          <div className="space-y-2">
            {doc.chunks.map((c: any) => (
              <div key={c.chunk_id} className="text-xs">
                <div className="font-mono text-slate-400 mb-0.5">{c.chunk_id}</div>
                <pre className="whitespace-pre-wrap font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded p-2">
                  {c.text}
                </pre>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
