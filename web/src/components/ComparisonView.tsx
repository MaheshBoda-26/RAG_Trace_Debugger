import type { HealResponse, Trace } from '../types/trace';
import { FailureBadge } from './FailureBadge';
import { STAGE_ORDER, STAGE_LABELS, type StageName } from '../types/trace';

function ParamChip({ label, value }: { label: string; value: unknown }) {
  const display = typeof value === 'boolean' ? (value ? 'on' : 'off') : String(value);
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-border bg-bg font-mono">
      <span className="text-text-dim">{label}</span>
      <span className="text-text font-medium">{display}</span>
    </span>
  );
}

function SignalPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
        ok
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
          : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700'
      }`}
    >
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={ok ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}
        />
      </svg>
      {label}
    </span>
  );
}

function SignalSummary({ signals, title }: { signals: Record<string, boolean>; title: string }) {
  const labels: Record<string, string> = {
    needed_retrieved: 'needed retrieved',
    needed_kept: 'needed kept',
    key_terms_in_context: 'key terms in context',
  };
  return (
    <div>
      <div className="text-xs font-medium text-text-dim mb-1">{title}</div>
      <div className="flex flex-wrap gap-1">
        {Object.entries(labels).map(([key, label]) => (
          <SignalPill key={key} ok={Boolean(signals[key])} label={label} />
        ))}
      </div>
    </div>
  );
}

interface StageRowProps {
  name: StageName;
  original: Trace;
  healed: Trace;
}

function StageRow({ name, original, healed }: StageRowProps) {
  const o = original.stages.find((s) => s.stage === name);
  const h = healed.stages.find((s) => s.stage === name);
  if (!o && !h) return null;

  // Difference metrics shown per stage.
  const oKept = (o?.candidates ?? []).filter((c) => c.kept).length;
  const hKept = (h?.candidates ?? []).filter((c) => c.kept).length;
  const oCand = (o?.candidates ?? []).length;
  const hCand = (h?.candidates ?? []).length;

  const oContext = typeof o?.output?.context === 'string' ? (o.output.context as string) : '';
  const hContext = typeof h?.output?.context === 'string' ? (h.output.context as string) : '';
  const oAnswer = typeof o?.output?.answer === 'string' ? (o.output.answer as string) : '';
  const hAnswer = typeof h?.output?.answer === 'string' ? (h.output.answer as string) : '';

  const diffs: { label: string; before: string; after: string; better?: 'left' | 'right' | null }[] = [];
  if (oCand !== hCand || oKept !== hKept) {
    diffs.push({
      label: 'candidates kept',
      before: `${oKept}/${oCand}`,
      after: `${hKept}/${hCand}`,
      better: hKept > oKept ? 'right' : hKept < oKept ? 'left' : null,
    });
  }
  if (oContext && hContext && oContext.length !== hContext.length) {
    diffs.push({
      label: 'context length',
      before: `${oContext.length} chars`,
      after: `${hContext.length} chars`,
      better: hContext.length > oContext.length ? 'right' : 'left',
    });
  }
  if ((oAnswer || hAnswer) && oAnswer !== hAnswer) {
    diffs.push({ label: 'answer changed', before: '—', after: 'yes', better: null });
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-bg-elevated border-b border-border">
        <span className="text-sm font-medium text-text">{STAGE_LABELS[name]}</span>
        <span className="text-xs text-text-dim font-mono tabular-nums">
          {o?.duration_ms?.toFixed(2) ?? '—'} ms → {h?.duration_ms?.toFixed(2) ?? '—'} ms
        </span>
      </div>
      {diffs.length > 0 ? (
        <div className="divide-y divide-border">
          {diffs.map((d) => (
            <div key={d.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-1.5 text-xs">
              <span
                className={`font-mono tabular-nums text-right ${
                  d.better === 'left' ? 'text-rose-600 dark:text-rose-400' : 'text-text-muted'
                }`}
              >
                {d.before}
              </span>
              <span className="text-text-dim px-2">{d.label}</span>
              <span
                className={`font-mono tabular-nums ${
                  d.better === 'right' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-text-muted'
                }`}
              >
                {d.after}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 py-1.5 text-xs text-text-dim">No change</div>
      )}
    </div>
  );
}

export function ComparisonView({ data }: { data: HealResponse }) {
  const { original, healed, adjustment } = data;
  const params = Object.entries(adjustment.adjusted_params);

  return (
    <div className="space-y-4" role="region" aria-label="Before/after comparison">
      {/* Verdict banner */}
      <div
        className={`border rounded-lg p-4 ${
          adjustment.improved
            ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
            : 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <svg
            className={`w-5 h-5 ${adjustment.improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={adjustment.improved ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' : 'M12 9v2m0 4h.01'}
            />
          </svg>
          <span className="font-medium text-sm text-text">
            {adjustment.improved
              ? 'Healed trace shows improvement'
              : 'Re-run complete — signals unchanged (failure may not be parameter-fixable)'}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-text-muted">{adjustment.rationale}</p>
      </div>

      {/* Changed params */}
      {params.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-text-muted">Applied:</span>
          {params.map(([k, v]) => (
            <ParamChip key={k} label={k} value={v} />
          ))}
        </div>
      )}
      {params.length === 0 && (
        <p className="text-xs text-text-dim">No parameter changes suggested for this failure stage.</p>
      )}

      {/* Signals before/after */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 bg-bg-elevated space-y-2">
          <SignalSummary signals={adjustment.signals_before} title="Before (original)" />
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <FailureBadge stage={adjustment.original_failure as never} size="sm" />
            <span className="font-mono text-text-dim">{original.query_id}</span>
          </div>
        </div>
        <div className="border border-border rounded-lg p-3 bg-bg-elevated space-y-2">
          <SignalSummary signals={adjustment.signals_after} title="After (healed)" />
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <FailureBadge stage={adjustment.healed_failure as never} size="sm" />
            <span className="font-mono text-text-dim">{healed.query_id}</span>
          </div>
        </div>
      </div>

      {/* Per-stage diffs */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-text-muted">Stage-by-stage diff</h4>
        {STAGE_ORDER.map((name) => (
          <StageRow key={name} name={name} original={original} healed={healed} />
        ))}
      </div>

      {/* Answers side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-border rounded-lg p-3 bg-bg-elevated">
          <div className="text-xs font-medium text-text-dim mb-1">Original answer</div>
          <div className="text-xs font-mono whitespace-pre-wrap break-words text-text-muted max-h-40 overflow-y-auto">
            {original.answer || '(none)'}
          </div>
        </div>
        <div className="border border-border rounded-lg p-3 bg-bg-elevated">
          <div className="text-xs font-medium text-text-dim mb-1">Healed answer</div>
          <div className="text-xs font-mono whitespace-pre-wrap break-words text-text-muted max-h-40 overflow-y-auto">
            {healed.answer || '(none)'}
          </div>
        </div>
      </div>
    </div>
  );
}
