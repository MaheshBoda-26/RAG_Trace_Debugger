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

export function QueryList({
  traces,
  selectedId,
  onSelect,
  filter,
  onFilter,
}: {
  traces: TraceSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: FailureStage | 'all';
  onFilter: (f: FailureStage | 'all') => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Traced Queries ({traces.length})
        </h2>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilter(f.value)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                filter === f.value
                  ? 'bg-slate-800 text-white border-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {traces.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400">
            No traces yet. Run the eval or submit a query.
          </p>
        ) : (
          <ul>
            {traces.map((t) => (
              <li key={t.query_id}>
                <button
                  onClick={() => onSelect(t.query_id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                    selectedId === t.query_id ? 'bg-slate-100 dark:bg-slate-800' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-400">{t.query_id}</span>
                    <FailureBadge stage={t.indicated_failure} />
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{t.query}</p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Re-export for convenience
export { FAILURE_COLORS };
