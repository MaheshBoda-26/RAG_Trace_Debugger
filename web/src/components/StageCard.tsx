import type { StageEvent } from '../types/trace';
import { STAGE_LABELS } from '../types/trace';
import { ChunkTable } from './ChunkTable';

function JsonView({ data }: { data: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) return null;
  return (
    <pre className="mt-2 text-xs bg-slate-50 dark:bg-slate-800/60 rounded p-2 overflow-x-auto text-slate-600 dark:text-slate-300">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

function TextBlock({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="mt-2">
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-slate-50 dark:bg-slate-800/60 rounded p-2 text-slate-700 dark:text-slate-300 max-h-64 overflow-y-auto">
        {text}
      </pre>
    </div>
  );
}

export function StageCard({ stage }: { stage: StageEvent }) {
  const label = STAGE_LABELS[stage.stage] ?? stage.stage;
  const hasCandidates = stage.candidates.length > 0;
  const context = typeof stage.output.context === 'string' ? stage.output.context : '';
  const answer = typeof stage.output.answer === 'string' ? stage.output.answer : '';
  const rewritten = typeof stage.output.rewritten === 'string' ? stage.output.rewritten : '';

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-slate-800 dark:text-slate-100">{label}</span>
          {stage.status === 'error' && (
            <span className="text-xs text-rose-600 dark:text-rose-400">error</span>
          )}
        </div>
        <span className="text-xs text-slate-400 tabular-nums">{stage.duration_ms.toFixed(2)} ms</span>
      </div>

      {stage.error && (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{stage.error}</p>
      )}

      {/* Stage-specific outputs */}
      {stage.input && Object.keys(stage.input).length > 0 && (
        <JsonView data={stage.input} />
      )}
      {rewritten && (
        <div className="mt-2">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Rewritten query</div>
          <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{rewritten}</p>
        </div>
      )}
      {hasCandidates && <ChunkTable candidates={stage.candidates} />}
      {context && <TextBlock label="Final context (FR4)" text={context} />}
      {answer && <TextBlock label="Generated answer (FR5)" text={answer} />}
    </div>
  );
}
