import { useState, useEffect, useCallback } from 'react';
import { api, deleteTraces } from './api/client';
import type { FailureStage, Trace, TraceSummary } from './types/trace';
import { QueryList } from './components/QueryList';
import { TraceTimeline } from './components/TraceTimeline';
import { EvalPanel } from './components/EvalPanel';

type Tab = 'debugger' | 'eval' | 'corpus';

export function DashboardApp({ initialTab = 'debugger' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
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
    api.health().then(setHealth).catch(() => { });
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
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-border bg-bg-elevated">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">RAG Trace Debugger</h1>
            {health && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full border ${health.gemini_enabled
                    ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10'
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
                className={`text-sm px-3 py-1 rounded-md transition-colors capitalize ${tab === t
                    ? 'bg-primary text-white font-medium'
                    : 'text-text-muted hover:text-text hover:bg-bg-elevated'
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
              <form onSubmit={runQuery} className="border border-border rounded-lg p-3 bg-bg-elevated space-y-2">
                <label className="block text-xs font-medium text-text-muted">
                  Run a query
                </label>
                <textarea
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Ask something about Northwind SaaS…"
                  rows={2}
                  className="w-full text-sm rounded border border-border bg-bg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-text placeholder:text-text-dim"
                />
                <input
                  value={queryTerms}
                  onChange={(e) => setQueryTerms(e.target.value)}
                  placeholder="key terms (comma-separated, optional)"
                  className="w-full text-xs rounded border border-border bg-bg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary text-text placeholder:text-text-dim"
                />
                <button
                  type="submit"
                  disabled={running}
                  className="w-full text-sm px-3 py-1.5 rounded bg-primary text-white hover:bg-primary-hover disabled:opacity-50 font-medium transition-colors"
                >
                  {running ? 'Running…' : 'Run query'}
                </button>
              </form>

              <div className="border border-border rounded-lg bg-bg-elevated overflow-hidden h-[60vh]">
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
                className="w-full text-xs text-text-dim hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
              >
                Clear all traces
              </button>
            </aside>

            {/* Main pane */}
            <section>
              {trace ? (
                <div>
                  <div className="mb-3">
                    <div className="font-mono text-xs text-text-dim mb-0.5">{trace.query_id}</div>
                    <h2 className="text-base font-medium text-text">{trace.query}</h2>
                  </div>
                  <TraceTimeline trace={trace} />
                </div>
              ) : (
                <div className="border border-dashed border-border rounded-lg p-12 text-center text-text-dim">
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

      <footer className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-text-dim">
        RAG Trace Debugger · diagnostic tool, not a fix-it tool · localizes failure, does not auto-resolve
      </footer>
    </div>
  );
}

function CorpusView() {
  const [corpus, setCorpus] = useState<{ doc_count: number; chunk_count: number; docs: any[] } | null>(null);

  useEffect(() => {
    api.getCorpus().then(setCorpus).catch(() => { });
  }, []);

  if (!corpus) return <p className="text-sm text-text-dim">Loading corpus…</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-muted">
        {corpus.doc_count} docs · {corpus.chunk_count} chunks
      </p>
      {corpus.docs.map((doc) => (
        <div key={doc.doc_id} className="border border-border rounded-lg p-3 bg-bg-elevated">
          <h3 className="text-sm font-mono font-medium text-text mb-2">{doc.doc_id}</h3>
          <div className="space-y-2">
            {doc.chunks.map((c: any) => (
              <div key={c.chunk_id} className="text-xs">
                <div className="font-mono text-text-dim mb-0.5">{c.chunk_id}</div>
                <pre className="whitespace-pre-wrap font-mono text-text-muted bg-bg border border-border rounded p-2">
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