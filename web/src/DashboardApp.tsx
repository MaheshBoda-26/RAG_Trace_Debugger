import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api, deleteTraces } from './api/client';
import type { FailureStage, Framework, HealResponse, Trace, TraceSummary } from './types/trace';
import { QueryList } from './components/QueryList';
import { TraceTimeline } from './components/TraceTimeline';
import { ComparisonView } from './components/ComparisonView';
import { EvalPanel } from './components/EvalPanel';

type Tab = 'debugger' | 'eval' | 'corpus';

const TABS: { id: Tab; label: string; title: string; path: string }[] = [
  { id: 'debugger', label: 'case files', title: 'Case files', path: '/debugger' },
  { id: 'eval', label: 'batch review', title: 'Batch review', path: '/eval' },
  { id: 'corpus', label: 'corpus', title: 'Corpus', path: '/corpus' },
];

type Health = {
  gemini_enabled: boolean;
  metrics?: {
    uptime_seconds: number;
    total_queries_served: number;
    error_count: number;
    avg_overhead_ms: number;
  };
  circuit_breaker?: { state: string; consecutive_failures: number };
};

function HealthPill({ health }: { health: Health | null }) {
  if (!health) return null;
  const live = health.gemini_enabled;
  const breaker = health.circuit_breaker;
  return (
    <span className="flex items-center gap-2">
      <span
        className="badge"
        style={{ color: live ? 'var(--color-success)' : 'var(--color-warning)' }}
      >
        <span
          className="inline-block h-1.5 w-1.5"
          style={{ backgroundColor: 'currentColor' }}
          aria-hidden="true"
        />
        {live ? 'gemini live' : 'mock generator'}
      </span>
      {breaker && breaker.state !== 'closed' && (
        <span className="badge badge-error">breaker {breaker.state}</span>
      )}
    </span>
  );
}

export function DashboardApp({ initialTab = 'debugger' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // The three routes reuse this component, so React keeps its state across a
  // navigation (e.g. /eval -> /debugger). Without this the tab would stay on
  // whichever surface the visitor came from.
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);
  const [traces, setTraces] = useState<TraceSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('case'));
  const [trace, setTrace] = useState<Trace | null>(null);
  const [filter, setFilter] = useState<FailureStage | 'all'>('all');
  const [frameworkFilter, setFrameworkFilter] = useState<Framework | 'all'>('all');
  const [caseQuery, setCaseQuery] = useState('');
  const [health, setHealth] = useState<Health | null>(null);
  const [healData, setHealData] = useState<HealResponse | null>(null);

  const [queryText, setQueryText] = useState('');
  const [queryTerms, setQueryTerms] = useState('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const casePanelRef = useRef<HTMLElement | null>(null);

  const loadTraces = useCallback(async () => {
    try {
      const list = await api.listTraces(filter === 'all' ? undefined : filter);
      setTraces(list);
      setSelectedId((current) => current ?? list[0]?.query_id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'failed to load case files');
    }
  }, [filter]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => {});
  }, []);

  useEffect(() => {
    loadTraces();
  }, [loadTraces]);

  useEffect(() => {
    if (!selectedId) {
      setTrace(null);
      setHealData(null);
      return;
    }
    api
      .getTrace(selectedId)
      .then((loaded) => {
        setTrace(loaded);
        setHealData(null);
        // The previous failure is history once a case file loads cleanly.
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'failed to load case file'));
  }, [selectedId]);

  // On a phone the case index sits *above* the case file, so opening a case can
  // leave the record itself below the fold. 'nearest' scrolls only when the
  // panel is out of view — on desktop, where it is already beside the list, this
  // does nothing.
  useEffect(() => {
    if (!selectedId) return;
    const panel = casePanelRef.current;
    if (!panel) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    panel.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [selectedId]);

  // Client-side framework and text filtering (the API filters by stage only).
  const visibleTraces = traces
    .filter((t) => (frameworkFilter === 'all' ? true : (t.framework ?? 'native') === frameworkFilter))
    .filter((t) => {
      const needle = caseQuery.trim().toLowerCase();
      if (!needle) return true;
      return `${t.query_id} ${t.query}`.toLowerCase().includes(needle);
    });

  const selectCase = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSearchParams({ case: id }, { replace: true });
    },
    [setSearchParams],
  );

  const moveSelection = useCallback(
    (delta: number) => {
      if (visibleTraces.length === 0) return;
      const index = visibleTraces.findIndex((t) => t.query_id === selectedId);
      const next = visibleTraces[Math.min(visibleTraces.length - 1, Math.max(0, index + delta))];
      // Same path as a click, so the deep link always names the case on screen.
      if (next) selectCase(next.query_id);
    },
    [visibleTraces, selectedId, selectCase],
  );

  // Keyboard-first: j/k walk the case list, / focuses search, Esc leaves search.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (typing) {
        if (event.key === 'Escape') target?.blur();
        return;
      }
      if (tab !== 'debugger' || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'j') {
        event.preventDefault();
        moveSelection(1);
      } else if (event.key === 'k') {
        event.preventDefault();
        moveSelection(-1);
      } else if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moveSelection, tab]);

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
      const created = await api.runQuery({ query: queryText, key_terms });
      setTrace(created);
      // Through selectCase, not setSelectedId: the URL is the source of truth,
      // so a freshly run case must take over ?case= like any clicked case.
      selectCase(created.query_id);
      setCaseQuery('');
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
    setHealData(null);
    // Drop the deep link too — pointing at a case file that no longer exists
    // would fail on the next reload.
    setSearchParams({}, { replace: true });
  }

  // The in-page tabs are routes, not local state: the URL stays the source of
  // truth so the back button, refresh, and the header's active link all agree.
  function selectTab(next: Tab) {
    setTab(next);
    const target = TABS.find((item) => item.id === next)?.path ?? '/debugger';
    navigate(next === 'debugger' && selectedId ? `${target}?case=${encodeURIComponent(selectedId)}` : target);
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="sticky top-14 z-30 hairline-b bg-bg/95 backdrop-blur md:top-16">
        <div className="container flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-base font-semibold tracking-tight">
              {TABS.find((item) => item.id === tab)?.title ?? 'Case files'}
            </h1>
            <HealthPill health={health} />
          </div>

          <nav className="flex items-center gap-6" role="tablist" aria-label="Surfaces">
            {TABS.map((item) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={tab === item.id}
                onClick={() => selectTab(item.id)}
                className={`nav-link relative before:absolute before:-inset-x-2 before:-inset-y-2 before:content-[''] ${
                  tab === item.id ? 'active' : ''
                }`}
              >
                {item.label}
                {tab === item.id && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute left-0 right-0 -bottom-0.5 h-px bg-primary"
                    transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Not a <main>: Layout already owns the document's main landmark. */}
      <div className="container py-5">
        {error && (
          <p
            className="mb-4 border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
            role="alert"
          >
            {error}
          </p>
        )}

        {tab === 'debugger' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-4">
              <form onSubmit={runQuery} className="border border-border bg-bg-elevated p-3">
                <label htmlFor="case-query" className="exhibit-label block">
                  run a case
                </label>
                <textarea
                  id="case-query"
                  value={queryText}
                  onChange={(e) => setQueryText(e.target.value)}
                  placeholder="Ask something about Northwind SaaS…"
                  rows={2}
                  className="field mt-2"
                />
                <label htmlFor="case-terms" className="exhibit-label mt-3 block">
                  key terms · optional
                </label>
                <input
                  id="case-terms"
                  value={queryTerms}
                  onChange={(e) => setQueryTerms(e.target.value)}
                  placeholder="comma-separated"
                  className="field mt-2"
                />
                <button type="submit" disabled={running} className="btn btn-primary mt-3 w-full">
                  {running ? 'tracing…' : 'run traced case'}
                </button>
              </form>

              <div className="border border-border bg-bg-elevated">
                <div className="hairline-b p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <label htmlFor="case-search" className="exhibit-label">
                      case index
                    </label>
                    <span className="meta num">{visibleTraces.length}</span>
                  </div>
                  <input
                    id="case-search"
                    ref={searchRef}
                    value={caseQuery}
                    onChange={(e) => setCaseQuery(e.target.value)}
                    placeholder="filter cases…  /"
                    className="field mt-2"
                  />
                </div>
                <QueryList
                  traces={visibleTraces}
                  selectedId={selectedId}
                  onSelect={selectCase}
                  filter={filter}
                  onFilter={setFilter}
                  frameworkFilter={frameworkFilter}
                  onFrameworkFilter={setFrameworkFilter}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="meta">
                  <kbd>j</kbd>/<kbd>k</kbd> navigate · <kbd>/</kbd> search · <kbd>⌘K</kbd> surfaces
                </span>
                <button onClick={onClear} className="btn btn-ghost btn-sm">
                  clear
                </button>
              </div>
            </aside>

            <section
              ref={casePanelRef}
              role="tabpanel"
              aria-label="Selected case file"
              className="scroll-mt-40 lg:scroll-mt-36"
            >
              {trace ? (
                <div>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-between gap-4">
                      <span className="meta">{trace.query_id}</span>
                      <span className="exhibit-label">
                        {trace.framework ?? 'native'} · {trace.stages.length} exhibits
                      </span>
                    </div>
                    <h2 className="mt-1 text-text">{trace.query}</h2>
                  </div>

                  {healData && (
                    <div className="mb-6 border border-border bg-bg-elevated p-4" role="region" aria-label="Re-test result">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <h3 className="exhibit-label">re-test record</h3>
                        <button
                          onClick={() => setHealData(null)}
                          className="btn btn-ghost btn-sm"
                        >
                          close
                        </button>
                      </div>
                      <ComparisonView data={healData} />
                    </div>
                  )}

                  <TraceTimeline
                    trace={trace}
                    onHealed={(response) => {
                      setHealData(response);
                      loadTraces();
                    }}
                  />
                </div>
              ) : (
                <div className="border border-dashed border-border p-16 text-center">
                  <p className="text-sm text-text-muted">
                    No case selected. Run a query or pick one from the index.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'eval' && (
          <div role="tabpanel" aria-label="Batch review" className="mx-auto max-w-5xl">
            <EvalPanel />
          </div>
        )}

        {tab === 'corpus' && (
          <div role="tabpanel" aria-label="Corpus">
            <CorpusView />
          </div>
        )}
      </div>

      <footer className="container py-6">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 hairline-t pt-4">
          <span className="meta">
            localizes failure — proposes parameter fixes, never rewrites your pipeline
          </span>
          {health?.metrics && (
            <span className="meta num ml-auto">
              uptime {Math.round(health.metrics.uptime_seconds)}s · {health.metrics.total_queries_served} cases ·{' '}
              {health.metrics.error_count} errors · avg tracer {health.metrics.avg_overhead_ms} ms
            </span>
          )}
        </div>
      </footer>
    </div>
  );
}

function CorpusView() {
  const [corpus, setCorpus] = useState<{ doc_count: number; chunk_count: number; docs: any[] } | null>(
    null,
  );

  useEffect(() => {
    api.getCorpus().then(setCorpus).catch(() => {});
  }, []);

  if (!corpus) return <p className="meta">loading corpus…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-6 hairline-b pb-3">
        <span className="exhibit-label">corpus</span>
        <span className="meta num">{corpus.doc_count} docs</span>
        <span className="meta num">{corpus.chunk_count} chunks</span>
      </div>
      {corpus.docs.map((doc) => (
        <section key={doc.doc_id}>
          <h2 className="font-mono text-sm text-text">{doc.doc_id}</h2>
          <div className="mt-2 space-y-2">
            {doc.chunks.map((chunk: any) => (
              <div key={chunk.chunk_id} className="border-t border-border pt-2">
                <div className="meta">{chunk.chunk_id}</div>
                <pre className="mt-1 whitespace-pre-wrap font-mono text-xs text-text-muted">
                  {chunk.text}
                </pre>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
