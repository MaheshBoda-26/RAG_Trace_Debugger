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

export const INTENT_COLORS: Record<string, string> = {
  FACT_LOOKUP:
    'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700',
  PROCEDURE:
    'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700',
  COMPARISON:
    'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700',
  SUMMARIZATION:
    'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-900/40 dark:text-fuchsia-300 dark:border-fuchsia-700',
  OTHER:
    'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-400',
  low: 'bg-emerald-500',
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

export const STAGE_LABELS: Record<StageName, string> = {
  query_rewrite: 'Query Rewrite',
  retrieval: 'Retrieval',
  rerank: 'Rerank',
  assembly: 'Context Assembly',
  generation: 'Generation',
};

export const FAILURE_COLORS: Record<FailureStage, string> = {
  none: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  query_rewrite: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700',
  retrieval: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  rerank: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700',
  assembly: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700',
  generation: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700',
};
