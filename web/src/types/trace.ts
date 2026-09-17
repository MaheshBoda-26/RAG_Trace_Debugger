/**
 * Trace schema — TypeScript mirror of the Python canonical schema.
 *
 * SOURCE OF TRUTH: server/trace/events.py (pydantic models). This file is
 * hand-mirrored; if the server schema changes, update this file to match.
 * See README §"Cross-language type sharing".
 */

export type StageName =
  | 'query_rewrite'
  | 'retrieval'
  | 'rerank'
  | 'assembly'
  | 'generation';

export type FailureStage =
  | 'none'
  | 'query_rewrite'
  | 'retrieval'
  | 'rerank'
  | 'assembly'
  | 'generation';

export type StageStatus = 'ok' | 'error';

export interface Candidate {
  doc_id: string;
  chunk_id: string;
  text: string;
  dense_score: number | null;
  bm25_score: number | null;
  fused_score: number | null;
  rerank_score: number | null;
  rank: number | null;
  kept: boolean;
  dropped_at: string | null;
}

export interface StageEvent {
  stage: StageName;
  status: StageStatus;
  error: string | null;
  started_at: string;
  ended_at: string | null;
  duration_ms: number;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  candidates: Candidate[];
  meta: Record<string, unknown>;
}

export type IntentClass =
  | 'FACT_LOOKUP'
  | 'PROCEDURE'
  | 'COMPARISON'
  | 'SUMMARIZATION'
  | 'OTHER';

export type RiskLevel = 'high' | 'medium' | 'low';

export type IntentRiskProfile = Partial<Record<Exclude<StageName, 'query_rewrite'>, RiskLevel>>;

export type Framework = 'native' | 'langchain' | 'llamaindex' | 'custom';

export interface Trace {
  query_id: string;
  query: string;
  created_at: string;
  answer: string;
  final_context: string;
  indicated_failure: FailureStage;
  failure_reason: string;
  key_terms: string[];
  intent: string;
  intent_confidence: number;
  intent_risk_profile: IntentRiskProfile;
  framework: Framework;
  needed_chunk_ids: string[];
  ground_truth_failure: FailureStage | null;
  expected_answer: string | null;
  localization_correct: boolean | null;
  stages: StageEvent[];
  trace_overhead_ms: number;
  total_duration_ms: number;
}

export interface TraceSummary {
  query_id: string;
  query: string;
  created_at: string;
  indicated_failure: FailureStage;
  answer_preview: string;
  stage_count: number;
  total_duration_ms: number;
  intent: string;
  framework: Framework;
}

export interface HealAdjustment {
  failure_stage: string;
  adjusted_params: Record<string, unknown>;
  rationale: string;
  applied: boolean;
  healed_query_id: string | null;
  original_failure: string;
  healed_failure: string;
  signals_before: Record<string, boolean>;
  signals_after: Record<string, boolean>;
  improved: boolean;
}

export interface HealResponse {
  original: Trace;
  healed: Trace;
  adjustment: HealAdjustment;
}

export interface CorpusDoc {
  doc_id: string;
  chunks: {
    chunk_id: string;
    index: number;
    heading: string;
    text: string;
  }[];
}

export interface CorpusResponse {
  doc_count: number;
  chunk_count: number;
  docs: CorpusDoc[];
}

export interface EvalQueryResult {
  query_id: string;
  query: string;
  ground_truth: string;
  indicated: string;
  correct: boolean;
  answer_preview: string;
  trace_overhead_ms: number;
  total_duration_ms: number;
  failure_reason: string;
  intent: string;
}

export interface IntentStratifiedAccuracy {
  accuracy: number;
  correct: number;
  total: number;
}

export interface EvalResults {
  ran_at: string;
  localization_accuracy: number;
  correct: number;
  total: number;
  gemini_enabled: boolean;
  overhead_ms: {
    avg: number;
    max: number;
    p95: number;
  };
  per_query: EvalQueryResult[];
  confusion: Record<string, Record<string, number>>;
  accuracy_by_intent: Record<string, IntentStratifiedAccuracy>;
  intent_classification_accuracy: number | null;
}

export interface QueryRequest {
  query: string;
  query_id?: string;
  key_terms?: string[];
  needed_chunk_ids?: string[];
  retrieval_k?: number;
  rerank_k?: number;
  context_max_chars?: number;
  mock_drift?: boolean;
}

// ---- Intent display helpers -------------------------------------------------

export const INTENT_LABELS: Record<string, string> = {
  FACT_LOOKUP: 'Fact Lookup',
  PROCEDURE: 'Procedure',
  COMPARISON: 'Comparison',
  SUMMARIZATION: 'Summarization',
  OTHER: 'Other',
};

/*
 * Colour encoding is expressed as CSS custom properties, not Tailwind palettes.
 * Intent is metadata, so every intent pill uses the same neutral treatment —
 * the risk profile carries the colour encoding, which keeps the encoding
 * meaningful instead of decorative. Both themes resolve from index.css.
 */
export const INTENT_COLORS: Record<string, string> = {
  FACT_LOOKUP: 'var(--color-text-muted)',
  PROCEDURE: 'var(--color-text-muted)',
  COMPARISON: 'var(--color-text-muted)',
  SUMMARIZATION: 'var(--color-text-muted)',
  OTHER: 'var(--color-text-muted)',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  high: 'var(--color-error)',
  medium: 'var(--color-warning)',
  low: 'var(--color-success)',
};

export const FRAMEWORK_LABELS: Record<Framework, string> = {
  native: 'Native',
  langchain: 'LangChain',
  llamaindex: 'LlamaIndex',
  custom: 'Custom SDK',
};

// ---- Display helpers -------------------------------------------------------

export const STAGE_ORDER: StageName[] = [
  'query_rewrite',
  'retrieval',
  'rerank',
  'assembly',
  'generation',
];

/* Machine names, not prose. The UI, the JSON on disk and the API all use the
   same vocabulary, so there is no translation step to get wrong. */
export const STAGE_LABELS: Record<StageName, string> = {
  query_rewrite: 'query_rewrite',
  retrieval: 'retrieval',
  rerank: 'rerank',
  assembly: 'assembly',
  generation: 'generation',
};

/** The failure ramp reads copper → rust → blood, derived from the brand. */
export const FAILURE_COLORS: Record<FailureStage, string> = {
  none: 'var(--color-success)',
  query_rewrite: 'var(--color-stage-query)',
  retrieval: 'var(--color-stage-retrieval)',
  rerank: 'var(--color-stage-rerank)',
  assembly: 'var(--color-stage-assembly)',
  generation: 'var(--color-stage-generation)',
};
