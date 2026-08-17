import { FAILURE_COLORS, type FailureStage, type TraceSummary } from '../types/trace';
import { FailureBadge } from './FailureBadge';

const FILTERS: { label: string; value: FailureStage | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'No failure', value: 'none' },
  { label: 'Retrieval', value: 'retrieval' },
  { label: 'Rerank', value: 'rerank' },
  { label: 'Assembly', value: 'assembly' },
  { label: 'Generation', value: 'generation' },
];

function QueryListSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border animate-pulse">
        <div className="h-5 w-32 bg-border rounded mb-2" />
        <div className="flex flex-wrap gap-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-6 w-20 bg-border rounded-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul>
          {[...Array(6)].map((_, i) => (
            <li key={i}>
              <div className="w-full px-3 py-2.5 border-b border-border animate-pulse">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="h-4 w-20 bg-border rounded" />
                  <div className="h-6 w-24 bg-border rounded-full" />
                </div>
                <div className="h-4 w-full bg-border rounded" />
                <div className="mt-1 h-4 w-3/4 bg-border rounded" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface QueryListProps {
  traces: TraceSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: FailureStage | 'all';
  onFilter: (f: FailureStage | 'all') => void;
  loading?: boolean;
}

export function QueryList({
  traces,
  selectedId,
  onSelect,
  filter,
  onFilter,
  loading = false,
}: QueryListProps) {
  if (loading) {
    return <QueryListSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-text mb-2">
          Traced Queries ({traces.length})
        </h2>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by failure stage">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-bg ${
                filter === f.value
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-transparent text-text-muted border-border hover:bg-bg-elevated hover:text-text'
              }`}
              aria-pressed={filter === f.value}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {traces.length === 0 ? (
          <div className="p-4 text-center">
            <svg className="w-12 h-12 mx-auto text-text-dim mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm text-text-dim">
              No traces yet. Run the eval or submit a query.
            </p>
          </div>
        ) : (
          <ul role="listbox" aria-label="Traced queries">
            {traces.map((t) => (
              <li key={t.query_id}>
                <button
                  onClick={() => onSelect(t.query_id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border hover:bg-bg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset ${
                    selectedId === t.query_id
                      ? 'bg-bg ring-1 ring-primary/30'
                      : ''
                  }`}
                  role="option"
                  aria-selected={selectedId === t.query_id}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs text-text-dim truncate max-w-[120px]">{t.query_id}</span>
                    <FailureBadge stage={t.indicated_failure} size="sm" />
                  </div>
                  <p className="text-sm text-text-muted line-clamp-2">{t.query}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-text-dim">
                    <span className="font-mono tabular-nums">{t.stage_count} stages</span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">{t.total_duration_ms.toFixed(0)} ms</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export { FAILURE_COLORS };
