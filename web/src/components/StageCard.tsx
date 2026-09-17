import type { StageEvent } from '../types/trace';
import { STAGE_LABELS } from '../types/trace';
import { ChunkTable } from './ChunkTable';

interface JsonViewProps {
  data: Record<string, unknown>;
  stageName: string;
}

function JsonView({ data, stageName }: JsonViewProps) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <details className="group mt-2">
      <summary className="exhibit-label flex cursor-pointer items-center gap-1.5 hover:text-text-muted">
        <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        input
      </summary>
      <pre
        className="code-block mt-2 max-h-48 overflow-y-auto"
        tabIndex={0}
        role="region"
        aria-label={`${stageName} input, scrollable`}
      >
        {JSON.stringify(data, null, 2)}
      </pre>
    </details>
  );
}

interface TextBlockProps {
  label: string;
  text: string;
  stageName: string;
}

function TextBlock({ label, text, stageName }: TextBlockProps) {
  if (!text) return null;
  return (
    <div className="mt-3">
      <div className="exhibit-label mb-1">{label}</div>
      <div
        className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words border border-border bg-transparent p-2 font-mono text-xs text-text-muted"
        tabIndex={0}
        role="region"
        aria-label={`${stageName} ${label}, scrollable`}
      >
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
    <div className="border border-border bg-bg-elevated p-3" aria-busy="true">
      <div className="flex items-center justify-between">
        <div className="skeleton h-4 w-24" />
        <div className="skeleton h-3 w-16" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="skeleton h-3 w-1/4" />
        <div className="skeleton h-16 w-full" />
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
    <div className="border border-border bg-bg-elevated p-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h4 className="font-mono text-sm font-medium text-text">{label}</h4>
          {stage.status === 'error' && (
            <span className="badge badge-error">error</span>
          )}
        </div>
        <span className="meta num">{stage.duration_ms.toFixed(2)} ms</span>
      </div>

      {stage.error && (
        <p
          className="mt-2 border px-2 py-1.5 text-xs"
          style={{ borderColor: 'var(--color-error)', color: 'var(--color-error)' }}
          role="alert"
        >
          {stage.error}
        </p>
      )}

      {/* Stage-specific outputs */}
      {stage.input && Object.keys(stage.input).length > 0 && (
        <JsonView data={stage.input} stageName={stage.stage} />
      )}
      {rewritten && (
        <div className="mt-3">
          <div className="exhibit-label mb-1">rewritten query</div>
          <div className="border border-border p-2 font-mono text-xs text-text-muted">
            {rewritten}
          </div>
        </div>
      )}
      {hasCandidates && (
        <div className="mt-3">
          <ChunkTable candidates={stage.candidates} label={`${stage.stage} candidates`} />
        </div>
      )}
      {context && (
        <TextBlock label="assembled context" text={context} stageName={stage.stage} />
      )}
      {answer && <TextBlock label="answer" text={answer} stageName={stage.stage} />}
    </div>
  );
}
