import { useState } from 'react';
import {
  INTENT_LABELS,
  RISK_COLORS,
  STAGE_ORDER,
  type IntentRiskProfile,
  type RiskLevel,
  type StageEvent,
  type StageName,
  type Trace,
} from '../types/trace';
import { api } from '../api/client';
import type { HealResponse } from '../types/trace';
import { StageCard } from './StageCard';
import { FailureBadge } from './FailureBadge';

const RISK_STAGE_ORDER: (keyof IntentRiskProfile)[] = [
  'retrieval',
  'rerank',
  'assembly',
  'generation',
];
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];

function IntentReadout({ intent, confidence }: { intent: string; confidence: number }) {
  if (!intent) return null;
  return (
    <span className="badge badge-dim" style={{ color: 'var(--color-text-muted)' }}>
      intent {INTENT_LABELS[intent] ?? intent} · {Math.round(confidence * 100)}%
    </span>
  );
}

function RiskBars({ profile }: { profile: IntentRiskProfile }) {
  if (!profile || Object.keys(profile).length === 0) return null;
  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2"
      aria-label="Stage risk profile for this intent class"
    >
      <span className="exhibit-label">intent risk</span>
      {RISK_STAGE_ORDER.map((stage) => {
        const level = profile[stage];
        if (!level) return null;
        const filled = RISK_LEVELS.indexOf(level) + 1;
        return (
          <span key={stage} className="flex items-center gap-2">
            <span className="meta">{stage}</span>
            <span
              className="flex gap-0.5"
              role="img"
              aria-label={`${stage}: ${level} risk`}
              title={`${stage}: ${level} risk`}
            >
              {RISK_LEVELS.map((_, index) => (
                <span
                  key={index}
                  className="block h-0.5 w-3"
                  style={{
                    backgroundColor:
                      index < filled ? RISK_COLORS[level] : 'var(--color-border)',
                  }}
                />
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}

function TimelineSkeleton({ stages = 5 }: { stages?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading case file">
      <div className="border border-border bg-bg-elevated p-4">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton mt-3 h-3 w-2/3" />
      </div>
      {Array.from({ length: stages }, (_, index) => (
        <div key={index} className="border-t border-border pt-4">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton mt-3 h-16 w-full" />
        </div>
      ))}
    </div>
  );
}

interface TraceTimelineProps {
  trace: Trace;
  loading?: boolean;
  onHealed?: (response: HealResponse) => void;
}

export function TraceTimeline({ trace, loading = false, onHealed }: TraceTimelineProps) {
  const [reTesting, setReTesting] = useState(false);
  const [healError, setHealError] = useState('');

  const byStage = new Map<StageName, StageEvent>();
  for (const stage of trace.stages) byStage.set(stage.stage, stage);

  const indicated = trace.indicated_failure;
  // Re-testing re-runs the built-in pipeline, so it only applies to native
  // traces — SDK traces replay another framework's pipeline.
  const canReTest = indicated !== 'none' && (trace.framework ?? 'native') === 'native';

  async function handleReTest() {
    setReTesting(true);
    setHealError('');
    try {
      const response = await api.healTrace(trace.query_id);
      onHealed?.(response);
    } catch (error) {
      setHealError(error instanceof Error ? error.message : 're-test failed');
    } finally {
      setReTesting(false);
    }
  }

  if (loading) return <TimelineSkeleton stages={trace.stages.length || 5} />;

  return (
    <div className="space-y-4" role="region" aria-label="Case file">
      {/* Verdict */}
      <div className="border border-border bg-bg-elevated p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h3 className="exhibit-label">verdict</h3>
          <FailureBadge stage={indicated} size="md" />
          <IntentReadout intent={trace.intent} confidence={trace.intent_confidence} />
          <span className="meta num ml-auto">
            {trace.total_duration_ms.toFixed(2)} ms total · tracer {trace.trace_overhead_ms.toFixed(3)} ms
          </span>
        </div>

        <p className="mt-3 max-w-3xl text-sm text-text-muted">
          {trace.failure_reason || 'No failure reason provided.'}
        </p>

        <RiskBars profile={trace.intent_risk_profile} />

        {canReTest && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 hairline-t pt-4">
            <button type="button" onClick={handleReTest} disabled={reTesting} className="btn btn-retest">
              {reTesting ? 'Re-running with adjusted parameters…' : 'Re-test this case'}
            </button>
            <span className="text-xs text-text-dim max-w-md">
              Re-runs the query with auto-adjusted parameters and diffs the result stage by stage.
            </span>
          </div>
        )}

        {healError && (
          <p className="mt-3 border border-error px-2 py-1.5 text-xs text-error" role="alert">
            {healError}
          </p>
        )}

        {trace.ground_truth_failure && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 hairline-t pt-4">
            <span className="exhibit-label">labeled stage</span>
            <FailureBadge stage={trace.ground_truth_failure} size="sm" />
            {trace.localization_correct !== null && (
              <span
                className="meta"
                style={{
                  color: trace.localization_correct
                    ? 'var(--color-success)'
                    : 'var(--color-error)',
                }}
              >
                {trace.localization_correct ? 'verdict matched' : 'verdict mismatched'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Exhibits */}
      <ol className="border-b border-border" role="list" aria-label="Pipeline exhibits">
        {STAGE_ORDER.map((name, index) => {
          const stage = byStage.get(name);
          if (!stage) return null;
          const isIndicated = indicated === name;
          return (
            <li key={name} className="exhibit-row" data-verdict={isIndicated ? 'true' : undefined}>
              <div className="exhibit-rail">
                <span
                  className="num text-xs"
                  style={{ color: isIndicated ? 'var(--color-error)' : 'var(--color-text-dim)' }}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="mt-2 w-px flex-1 bg-border" aria-hidden="true" />
              </div>
              <div className="exhibit-body">
                {isIndicated && (
                  <div className="mb-2">
                    <span className="stamp stamp-bad">blamed</span>
                  </div>
                )}
                <StageCard stage={stage} />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
