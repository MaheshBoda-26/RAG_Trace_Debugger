import { FAILURE_COLORS, type FailureStage } from '../types/trace';

const LABELS: Record<FailureStage, string> = {
  none: 'No failure',
  query_rewrite: 'Query Rewrite',
  retrieval: 'Retrieval',
  rerank: 'Rerank',
  assembly: 'Assembly',
  generation: 'Generation',
};

const ICONS: Record<FailureStage, React.ReactNode> = {
  none: <span className="w-1.5 h-1.5 rounded-full bg-current" />,
  query_rewrite: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  retrieval: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  rerank: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h13M3 12h13M3 16h13" />
    </svg>
  ),
  assembly: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  generation: (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

interface FailureBadgeProps {
  stage: FailureStage;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  variant?: 'badge' | 'chip';
}

export function FailureBadge({
  stage,
  size = 'sm',
  showIcon = true,
  variant = 'badge'
}: FailureBadgeProps) {
  const cls = FAILURE_COLORS[stage] ?? FAILURE_COLORS.none;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  const variantStyles = {
    badge: 'inline-flex items-center rounded-full border font-medium',
    chip: 'inline-flex items-center rounded-lg border font-medium',
  };

  return (
    <span
      className={`${variantStyles[variant]} ${cls} ${sizeClasses[size]}`}
      aria-label={LABELS[stage]}
    >
      {showIcon && ICONS[stage]}
      <span className="whitespace-nowrap">{LABELS[stage]}</span>
    </span>
  );
}
