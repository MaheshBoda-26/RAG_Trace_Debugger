import type { StageEvent } from '../types/trace';
import { STAGE_LABELS } from '../types/trace';
import { ChunkTable } from './ChunkTable';

interface JsonViewProps {
  data: Record<string, unknown>;
}

function JsonView({ data }: JsonViewProps) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <details className="mt-2 group">
      <summary className="text-xs font-medium text-text-dim cursor-pointer flex items-center gap-1.5 hover:text-text-muted">
        <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        Input data
      </summary>
      <pre className="mt-2 text-xs bg-bg border border-border rounded p-2 overflow-x-auto text-text-muted max-h-48 overflow-y-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

interface TextBlockProps {
  label: string;
  text: string;
}

function TextBlock({ label, text }: TextBlockProps) {
  if (!text) return null;
  return (
    <div className="mt-2">
      <div className="text-xs font-medium text-text-dim mb-1">{label}</div>
      <div className="text-xs font-mono whitespace-pre-wrap break-words bg-bg rounded p-2 text-text-muted max-h-64 overflow-y-auto border border-border">
        {text}
      </div>
    </div>
  );
}

interface StageCardSkeletonProps {
  label: string;
}

function StageCardSkeleton({ label: _label }: StageCardSkeletonProps) {
  return (
    <div className="border border-border rounded-lg p-3 bg-bg-elevated animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-5 w-24 bg-border rounded" />
        </div>
        <div className="h-4 w-20 bg-border rounded" />
      </div>
      <div className="mt-3 space-y-3">
        <div className="h-4 w-1/4 bg-border rounded" />
        <div className="h-4 w-1/3 bg-border rounded" />
        <div className="h-20 w-full bg-border rounded" />
      </div>
    </div>
  );
}

interface StageCardProps {
  stage: StageEvent;
  loading?: boolean;
}

export function StageCard({ stage, loading = false }: StageCardProps) {
  const label = STAGE_LABELS[stage.stage] ?? stage.stage;
  const hasCandidates = stage.candidates.length > 0;
  const context = typeof stage.output.context === 'string' ? stage.output.context : '';
  const answer = typeof stage.output.answer === 'string' ? stage.output.answer : '';
  const rewritten = typeof stage.output.rewritten === 'string' ? stage.output.rewritten : '';

  if (loading) {
    return <StageCardSkeleton label={label} />;
  }

  return (
    <div className="border border-border rounded-lg p-3 bg-bg-elevated transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-text">{label}</span>
          {stage.status === 'error' && (
            <span className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 font-medium">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Error
            </span>
          )}
        </div>
        <span className="text-xs text-text-dim tabular-nums font-mono">{stage.duration_ms.toFixed(2)} ms</span>
      </div>

      {stage.error && (
        <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-xs text-rose-700 dark:text-rose-300" role="alert">
          <div className="font-medium mb-0.5">Error:</div>
          <div>{stage.error}</div>
        </div>
      )}

      {/* Stage-specific outputs */}
      {stage.input && Object.keys(stage.input).length > 0 && (
        <JsonView data={stage.input} />
      )}
      {rewritten && (
        <div className="mt-2">
          <div className="text-xs font-medium text-text-dim mb-1">Rewritten query</div>
          <div className="text-sm font-mono text-text-muted bg-bg rounded p-2 border border-border">
            {rewritten}
          </div>
        </div>
      )}
      {hasCandidates && <ChunkTable candidates={stage.candidates} />}
      {context && <TextBlock label="Final context (FR4)" text={context} />}
      {answer && <TextBlock label="Generated answer (FR5)" text={answer} />}
    </div>
  );
}
