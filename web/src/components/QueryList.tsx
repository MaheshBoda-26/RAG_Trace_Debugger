import {
  FRAMEWORK_LABELS,
  type FailureStage,
  type Framework,
  type TraceSummary,
} from '../types/trace';
import { FailureBadge } from './FailureBadge';

const FILTERS: { label: string; value: FailureStage | 'all' }[] = [
  { label: 'all', value: 'all' },
  { label: 'clean', value: 'none' },
  { label: 'retrieval', value: 'retrieval' },
  { label: 'rerank', value: 'rerank' },
  { label: 'assembly', value: 'assembly' },
  { label: 'generation', value: 'generation' },
];

const FRAMEWORK_FILTERS: { label: string; value: Framework | 'all' }[] = [
  { label: 'all', value: 'all' },
  { label: 'native', value: 'native' },
  { label: 'langchain', value: 'langchain' },
  { label: 'llamaindex', value: 'llamaindex' },
  { label: 'custom sdk', value: 'custom' },
];

/** Framework is metadata, not a verdict — one glyph per origin, no colour. */
function FrameworkMark({ framework }: { framework: Framework }) {
  const label = FRAMEWORK_LABELS[framework];
  const paths: Record<Framework, string> = {
    native: 'M4 7h16M4 12h16M4 17h10',
    langchain: 'M9 15l3-3 3 3M9 9l3 3 3-3',
    llamaindex: 'M6 6h12v12H6zM10 6v12',
    custom: 'M8 9l-3 3 3 3M16 9l3 3-3 3',
  };
  return (
    <span
      className="inline-flex items-center gap-1 text-text-dim"
      title={label}
      aria-label={label}
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={paths[framework]} />
      </svg>
    </span>
  );
}

function CaseRowSkeleton() {
  return (
    <div className="p-3">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton mt-2 h-3 w-full" />
      <div className="skeleton mt-2 h-3 w-2/3" />
    </div>
  );
}

function QueryListSkeleton() {
  return (
    <div aria-busy="true">
      {[...Array(5)].map((_, index) => (
        <CaseRowSkeleton key={index} />
      ))}
    </div>
  );
}

interface QueryListProps {
  traces: TraceSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: FailureStage | 'all';
  onFilter: (f: FailureStage | 'all') => void;
  frameworkFilter: Framework | 'all';
  onFrameworkFilter: (f: Framework | 'all') => void;
  loading?: boolean;
}

export function QueryList({
  traces,
  selectedId,
  onSelect,
  filter,
  onFilter,
  frameworkFilter,
  onFrameworkFilter,
  loading = false,
}: QueryListProps) {
  if (loading) return <QueryListSkeleton />;

  // Chips are the densest controls in the app: desktop keeps them hairline-thin,
  // but a thumb gets a taller row to land on.
  const chip = (active: boolean) =>
    `border px-2.5 py-2 font-mono text-[0.6875rem] transition-colors md:px-2 md:py-0.5 ${
      active
        ? 'border-primary text-primary'
        : 'border-border text-text-dim hover:text-text'
    }`;

  return (
    <div className="flex h-[52vh] flex-col">
      <div className="hairline-b px-3 pb-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by failure stage">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => onFilter(item.value)}
              className={chip(filter === item.value)}
              aria-pressed={filter === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Filter by framework">
          {FRAMEWORK_FILTERS.map((item) => (
            <button
              key={item.value}
              onClick={() => onFrameworkFilter(item.value)}
              className={chip(frameworkFilter === item.value)}
              aria-pressed={frameworkFilter === item.value}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {traces.length === 0 ? (
          <div className="p-5">
            <p className="text-sm text-text-muted">No case files match.</p>
            <p className="meta mt-1">Run the batch review, or submit a query above.</p>
          </div>
        ) : (
          <ul aria-label="Case files">
            {traces.map((trace) => {
              const selected = selectedId === trace.query_id;
              const failed = trace.indicated_failure !== 'none';
              return (
                <li key={trace.query_id} className="border-b border-border">
                  <button
                    onClick={() => onSelect(trace.query_id)}
                    className="relative w-full px-3 py-2.5 text-left transition-colors"
                    style={{
                      backgroundColor: selected
                        ? 'color-mix(in oklab, var(--color-text) 5%, transparent)'
                        : 'transparent',
                    }}
                    aria-current={selected ? 'true' : undefined}
                  >
                    {/* Status as a 2px left rail, not a coloured pill. */}
                    <span
                      className="absolute bottom-0 left-0 top-0 w-px"
                      style={{
                        backgroundColor: failed ? 'var(--color-error)' : 'var(--color-success)',
                        opacity: selected ? 1 : 0.45,
                      }}
                      aria-hidden="true"
                    />
                    <span className="flex items-center justify-between gap-2">
                      <span className="meta truncate">{trace.query_id}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <FrameworkMark framework={trace.framework ?? 'native'} />
                        <FailureBadge stage={trace.indicated_failure} size="sm" showIcon={false} />
                      </span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-text-muted">
                      {trace.query}
                    </span>
                    <span className="meta mt-1 flex items-center gap-2">
                      <span className="num">{trace.stage_count} exhibits</span>
                      <span aria-hidden="true">·</span>
                      <span className="num">{trace.total_duration_ms.toFixed(0)} ms</span>
                      {trace.intent && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{trace.intent.toLowerCase()}</span>
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
