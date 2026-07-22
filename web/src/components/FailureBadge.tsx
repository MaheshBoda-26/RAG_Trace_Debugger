import { FAILURE_COLORS, type FailureStage } from '../types/trace';

const LABELS: Record<FailureStage, string> = {
  none: 'No failure',
  query_rewrite: 'Query Rewrite',
  retrieval: 'Retrieval',
  rerank: 'Rerank',
  assembly: 'Assembly',
  generation: 'Generation',
};

export function FailureBadge({
  stage,
  size = 'sm',
}: {
  stage: FailureStage;
  size?: 'sm' | 'md';
}) {
  const cls = FAILURE_COLORS[stage] ?? FAILURE_COLORS.none;
  const padding = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${cls} ${padding}`}
    >
      {LABELS[stage]}
    </span>
  );
}
