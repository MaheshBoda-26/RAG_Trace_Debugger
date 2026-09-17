import { FAILURE_COLORS, type FailureStage } from '../types/trace';

/** Machine names: the pill, the JSON record and the API agree. */
const LABELS: Record<FailureStage, string> = {
  none: 'clean',
  query_rewrite: 'query_rewrite',
  retrieval: 'retrieval',
  rerank: 'rerank',
  assembly: 'assembly',
  generation: 'generation',
};

interface FailureBadgeProps {
  stage: FailureStage;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'badge' | 'chip';
}

/**
 * The verdict pill. Colours come from the brand failure ramp (see index.css),
 * so a failure looks like part of the instrument instead of a generic alert.
 */
export function FailureBadge({ stage, size = 'sm', showIcon = true }: FailureBadgeProps) {
  const color = FAILURE_COLORS[stage] ?? FAILURE_COLORS.none;
  const label = LABELS[stage] ?? 'clean';

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[0.6875rem] gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-2',
    lg: 'px-3 py-1.5 text-sm gap-2',
  };

  return (
    <span
      className={`badge ${sizeClasses[size]}`}
      style={{ color, borderColor: 'currentColor' }}
      aria-label={label === 'clean' ? 'no failure localized' : `failure localized at ${label}`}
    >
      {showIcon && (
        <span
          className="inline-block h-1.5 w-1.5"
          style={{ backgroundColor: 'currentColor' }}
          aria-hidden="true"
        />
      )}
      <span className="whitespace-nowrap">{label}</span>
    </span>
  );
}
