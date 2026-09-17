import type { FailureStage, HealResponse, Trace } from '../types/trace';
import { FailureBadge } from './FailureBadge';
import { STAGE_ORDER, STAGE_LABELS, type StageName } from '../types/trace';

const signalLabel: Record<string, string> = {
  needed_retrieved: 'needed chunk retrieved',
  needed_kept: 'needed chunk kept',
  key_terms_in_context: 'key terms in context',
};

/** The adjusted parameter, with a single sweep marking the changed value. */
function ParamChip({ label, value, index }: { label: string; value: unknown; index: number }) {
  const display = typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value);
  return (
    <span className="inline-flex items-baseline gap-2 border border-border px-2 py-0.5">
      <span className="exhibit-label">{label}</span>
      <span className="meta num relative text-text">
        {display}
        <span
          className="sweep-in absolute -bottom-0.5 left-0 right-0 h-px bg-primary"
          style={{ animationDelay: `${index * 80}ms` }}
          aria-hidden="true"
        />
      </span>
    </span>
  );
}

function SignalPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="badge" style={{ color: ok ? 'var(--color-success)' : 'var(--color-error)' }}>
      <span
        className="inline-block h-1.5 w-1.5"
        style={{ backgroundColor: 'currentColor' }}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

function SignalSummary({
  signals,
  title,
  trace,
  failure,
}: {
  signals: Record<string, boolean>;
  title: string;
  trace: Trace;
  failure: string;
}) {
  return (
    <div className="border border-border bg-bg-elevated p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="exhibit-label">{title}</span>
        <span className="meta">{trace.query_id}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {Object.entries(signalLabel).map(([key, label]) => (
          <SignalPill key={key} ok={Boolean(signals[key])} label={label} />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 hairline-t pt-3">
        <span className="exhibit-label">verdict</span>
        <FailureBadge stage={failure as FailureStage} size="sm" />
      </div>
    </div>
  );
}

function StageRow({ name, original, healed }: { name: StageName; original: Trace; healed: Trace }) {
  const before = original.stages.find((stage) => stage.stage === name);
  const after = healed.stages.find((stage) => stage.stage === name);
  if (!before && !after) return null;

  const beforeKept = (before?.candidates ?? []).filter((c) => c.kept).length;
  const afterKept = (after?.candidates ?? []).filter((c) => c.kept).length;
  const beforeCandidates = (before?.candidates ?? []).length;
  const afterCandidates = (after?.candidates ?? []).length;

  const beforeContext = typeof before?.output?.context === 'string' ? before.output.context : '';
  const afterContext = typeof after?.output?.context === 'string' ? after.output.context : '';
  const beforeAnswer = typeof before?.output?.answer === 'string' ? before.output.answer : '';
  const afterAnswer = typeof after?.output?.answer === 'string' ? after.output.answer : '';

  const diffs: {
    label: string;
    before: string;
    after: string;
    better?: 'before' | 'after' | null;
  }[] = [];

  if (beforeCandidates !== afterCandidates || beforeKept !== afterKept) {
    diffs.push({
      label: 'candidates kept',
      before: `${beforeKept}/${beforeCandidates}`,
      after: `${afterKept}/${afterCandidates}`,
      better: afterKept > beforeKept ? 'after' : afterKept < beforeKept ? 'before' : null,
    });
  }
  if (beforeContext && afterContext && beforeContext.length !== afterContext.length) {
    diffs.push({
      label: 'context length',
      before: `${beforeContext.length} chars`,
      after: `${afterContext.length} chars`,
      better: afterContext.length > beforeContext.length ? 'after' : 'before',
    });
  }
  if ((beforeAnswer || afterAnswer) && beforeAnswer !== afterAnswer) {
    diffs.push({ label: 'answer', before: 'changed', after: 'changed', better: null });
  }

  return (
    <div className="border-t border-border">
      <div className="flex items-baseline justify-between gap-4 py-2">
        <span className="font-mono text-xs text-text">{STAGE_LABELS[name]}</span>
        <span className="meta num">
          {before?.duration_ms?.toFixed(2) ?? '—'} ms → {after?.duration_ms?.toFixed(2) ?? '—'} ms
        </span>
      </div>
      {diffs.length > 0 ? (
        <div className="pb-3">
          {diffs.map((diff) => (
            <div
              key={diff.label}
              className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3 py-0.5 text-xs"
            >
              <span
                className="num text-right"
                style={{
                  color: diff.better === 'before' ? 'var(--color-success)' : 'var(--color-text-dim)',
                }}
              >
                {diff.before}
              </span>
              <span className="exhibit-label">{diff.label}</span>
              <span
                className="num"
                style={{
                  color: diff.better === 'after' ? 'var(--color-success)' : 'var(--color-text-dim)',
                  fontWeight: diff.better === 'after' ? 500 : 400,
                }}
              >
                {diff.after}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="pb-3 meta">no change</div>
      )}
    </div>
  );
}

export function ComparisonView({ data }: { data: HealResponse }) {
  const { original, healed, adjustment } = data;
  const params = Object.entries(adjustment.adjusted_params);

  return (
    <div className="space-y-5" role="region" aria-label="Re-test result">
      {/* Verdict */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className={adjustment.improved ? 'stamp stamp-ok' : 'stamp stamp-warn'}>
          {adjustment.improved ? 'improved' : 'unchanged'}
        </span>
        <p className="max-w-2xl text-sm text-text-muted">{adjustment.rationale}</p>
      </div>

      {/* Applied parameters */}
      {params.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="exhibit-label">applied</span>
          {params.map(([key, value], index) => (
            <ParamChip key={key} label={key} value={value} index={index} />
          ))}
        </div>
      ) : (
        <p className="meta">No parameter change suggested for this failure stage.</p>
      )}

      {/* Signals, joined by a diff rail */}
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-0">
        <SignalSummary
          signals={adjustment.signals_before}
          title="before"
          trace={original}
          failure={adjustment.original_failure}
        />
        <div className="hidden w-px bg-border md:mx-5 md:block" aria-hidden="true" />
        <SignalSummary
          signals={adjustment.signals_after}
          title="after"
          trace={healed}
          failure={adjustment.healed_failure}
        />
      </div>

      {/* Stage-by-stage diff */}
      <div>
        <h4 className="exhibit-label">stage-by-stage</h4>
        <div className="mt-3">
          {STAGE_ORDER.map((name) => (
            <StageRow key={name} name={name} original={original} healed={healed} />
          ))}
          <div className="border-t border-border" />
        </div>
      </div>

      {/* Answers */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-border bg-bg-elevated p-4">
          <div className="exhibit-label">answer · before</div>
          <div
            className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs text-text-muted"
            tabIndex={0}
            role="region"
            aria-label="Answer before, scrollable"
          >
            {original.answer || '(none)'}
          </div>
        </div>
        <div className="border border-border bg-bg-elevated p-4">
          <div className="exhibit-label">answer · after</div>
          <div
            className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs text-text-muted"
            tabIndex={0}
            role="region"
            aria-label="Answer after, scrollable"
          >
            {healed.answer || '(none)'}
          </div>
        </div>
      </div>
    </div>
  );
}
