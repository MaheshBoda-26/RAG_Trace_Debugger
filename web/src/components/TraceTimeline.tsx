import { useState } from 'react';
import {
  INTENT_COLORS,
  INTENT_LABELS,
  RISK_COLORS,
  STAGE_ORDER,
  type FailureStage,
  type IntentRiskProfile,
  type StageEvent,
  type StageName,
  type Trace,
} from '../types/trace';
import { api } from '../api/client';
import type { HealResponse } from '../types/trace';
import { StageCard } from './StageCard';
import { FailureBadge } from './FailureBadge';

const RISK_STAGE_ORDER: (keyof IntentRiskProfile)[] = ['retrieval', 'rerank', 'assembly', 'generation'];

function IntentBadge({ intent, confidence }: { intent: string; confidence: number }) {
  if (!intent) return null;
  const label = INTENT_LABELS[intent] ?? intent;
  const cls = INTENT_COLORS[intent] ?? INTENT_COLORS.OTHER;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium px-2 py-0.5 text-xs ${cls}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
      </svg>
      Intent: {label} ({Math.round(confidence * 100)}%)
    </span>
  );
}

function RiskBars({ profile }: { profile: IntentRiskProfile }) {
  if (!profile || Object.keys(profile).length === 0) return null;
  return (
    <div className="mt-2 flex items-center gap-3 flex-wrap" aria-label="Stage risk profile for this intent">
      <span className="text-xs font-medium text-text-muted">Stage risk (intent):</span>
      {RISK_STAGE_ORDER.map((stage) => {
        const level = profile[stage];
        if (!level) return null;
        return (
          <span key={stage} className="inline-flex items-center gap-1.5 text-xs text-text-dim">
            <span className="w-10 text-right">{stage}</span>
            <span className="flex gap-0.5" title={`${stage}: ${level}`}>
              {(['low', 'medium', 'high'] as const).map((lvl) => (
                <span
                  key={lvl}
                  className={`w-2.5 h-2.5 rounded-sm ${
                    level === lvl ? RISK_COLORS[lvl] : 'bg-border'
                  }`}
                />
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}

interface TimelineSkeletonProps {
  stages?: number;
}

function TimelineSkeleton({ stages = 5 }: TimelineSkeletonProps) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading trace timeline">
      {/* Failure banner skeleton */}
      <div className="border border-border rounded-lg p-4 bg-bg-elevated animate-pulse">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-5 w-32 bg-border rounded" />
          <div className="h-6 w-24 bg-border rounded-full" />
          <div className="h-4 w-48 ml-auto bg-border rounded" />
        </div>
        <div className="mt-2 h-4 w-3/4 bg-border rounded" />
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 flex-wrap">
          <div className="h-4 w-20 bg-border rounded" />
          <div className="h-6 w-20 bg-border rounded-full" />
          <div className="h-4 w-32 bg-border rounded" />
        </div>
      </div>

      {/* Stage timeline skeleton */}
      {Array.from({ length: stages }, (_, i) => (
        <div key={i} className="relative pl-6">
          <div className="absolute left-0 top-3 w-2.5 h-2.5 rounded-full border-2 border-border bg-bg" />
          <div className="absolute left-[4.5px] top-6 bottom-0 w-px bg-border" />
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

interface TraceTimelineProps {
  trace: Trace;
  loading?: boolean;
  onHealed?: (response: HealResponse) => void;
}

export function TraceTimeline({ trace, loading = false, onHealed }: TraceTimelineProps) {
  const [healing, setHealing] = useState(false);
  const [healError, setHealError] = useState('');

  const byStage = new Map<StageName, StageEvent>();
  for (const s of trace.stages) byStage.set(s.stage, s);

  const indicated = trace.indicated_failure;
  // Self-healing re-runs the built-in pipeline; it only makes sense for
  // native traces (SDK traces replay other frameworks' pipelines).
  const canHeal = indicated !== 'none' && (trace.framework ?? 'native') === 'native';

  async function handleHeal() {
    setHealing(true);
    setHealError('');
    try {
      const response = await api.healTrace(trace.query_id);
      onHealed?.(response);
    } catch (e) {
      setHealError(e instanceof Error ? e.message : 'heal failed');
    } finally {
      setHealing(false);
    }
  }

  if (loading) {
    return <TimelineSkeleton stages={trace.stages.length || 5} />;
  }

  return (
    <div className="space-y-3" role="region" aria-label="Trace timeline">
      {/* Failure banner (FR7) + self-healing (Phase 1) */}
      <div className="border border-border rounded-lg p-4 bg-bg-elevated transition-colors">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-sm font-semibold text-text">Indicated failure</h3>
          <FailureBadge stage={indicated} size="md" />
          <IntentBadge intent={trace.intent} confidence={trace.intent_confidence} />
          <span className="text-xs text-text-dim ml-auto tabular-nums font-mono">
            total {trace.total_duration_ms.toFixed(2)} ms · overhead {trace.trace_overhead_ms.toFixed(3)} ms
          </span>
        </div>
        <p className="mt-2 text-sm text-text-muted">{trace.failure_reason || 'No failure reason provided'}</p>

        <RiskBars profile={trace.intent_risk_profile} />

        {canHeal && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 flex-wrap">
            <button
              onClick={handleHeal}
              disabled={healing}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-primary text-white hover:bg-primary-hover disabled:opacity-50 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-bg"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {healing ? 'Re-running with adjusted params…' : 'Heal this trace'}
            </button>
            <span className="text-xs text-text-dim">
              Re-runs the query with auto-adjusted parameters and shows a before/after diff.
            </span>
          </div>
        )}
        {healError && (
          <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-xs text-rose-700 dark:text-rose-300" role="alert">
            {healError}
          </div>
        )}

        {trace.ground_truth_failure && (
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 flex-wrap">
            <span className="text-xs font-medium text-text-muted">Ground truth:</span>
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
            <div className="absolute left-0 top-3 w-2.5 h-2.5 rounded-full border-2 border-border bg-bg z-10" />
            <div className="absolute left-[4.5px] top-6 bottom-0 w-px bg-border" />
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
