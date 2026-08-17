import { STAGE_ORDER, type StageEvent, type StageName, type Trace } from '../types/trace';
import { StageCard } from './StageCard';
import { FailureBadge } from './FailureBadge';

interface TimelineSkeletonProps {
  stages?: number;
}

function TimelineSkeleton({ stages = 5 }: TimelineSkeletonProps) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading trace timeline">
      {/* Failure banner skeleton */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900 animate-pulse">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-4 w-48 ml-auto bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
        <div className="mt-2 h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>

      {/* Stage timeline skeleton */}
      {Array.from({ length: stages }, (_, i) => (
        <div key={i} className="relative pl-6">
          <div className="absolute left-0 top-3 w-2.5 h-2.5 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900" />
          <div className="absolute left-[4.5px] top-6 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
          <StageCard
            stage={{
              stage: STAGE_ORDER[i % STAGE_ORDER.length] as StageName,
              status: 'ok',
              error: null,
              started_at: '',
              ended_at: null,
              duration_ms: 0,
              input: {},
              output: {},
              candidates: [],
              meta: {},
            }}
            loading
          />
        </div>
      ))}
    </div>
  );
}

export function TraceTimeline({ trace, loading = false }: { trace: Trace; loading?: boolean }) {
  const byStage = new Map<StageName, StageEvent>();
  for (const s of trace.stages) byStage.set(s.stage, s);

  const indicated = trace.indicated_failure;

  if (loading) {
    return <TimelineSkeleton stages={trace.stages.length || 5} />;
  }

  return (
    <div className="space-y-3" role="region" aria-label="Trace timeline">
      {/* Failure banner (FR7) */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-900 transition-colors">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Indicated failure</h3>
          <FailureBadge stage={indicated} size="md" />
          <span className="text-xs text-slate-400 ml-auto tabular-nums font-mono">
            total {trace.total_duration_ms.toFixed(2)} ms · overhead {trace.trace_overhead_ms.toFixed(3)} ms
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{trace.failure_reason || 'No failure reason provided'}</p>

        {trace.ground_truth_failure && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Ground truth:</span>
            <FailureBadge stage={trace.ground_truth_failure} size="sm" />
            {trace.localization_correct !== null && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium ${trace.localization_correct
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                  }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trace.localization_correct ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'} />
                </svg>
                {trace.localization_correct ? 'Correct localization' : 'Incorrect localization'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stage timeline (FR6) */}
      {STAGE_ORDER.map((name) => {
        const stage = byStage.get(name);
        if (!stage) return null;
        const isIndicated = trace.indicated_failure === name;
        return (
          <div
            key={name}
            className={`relative pl-6 transition-all duration-200 ${isIndicated ? 'ring-2 ring-rose-300 dark:ring-rose-700 rounded-lg' : ''
              }`}
          >
            {/* timeline dot + connector */}
            <div className="absolute left-0 top-3 w-2.5 h-2.5 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 z-10" />
            <div className="absolute left-[4.5px] top-6 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
            {isIndicated && (
              <div className="absolute -left-0.5 top-0 bottom-0 w-1 rounded-full bg-rose-400 dark:bg-rose-600" />
            )}
            <StageCard stage={stage} />
          </div>
        );
      })}
    </div>
  );
}
