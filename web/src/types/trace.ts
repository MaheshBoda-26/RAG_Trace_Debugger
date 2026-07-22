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

export interface Trace {
  query_id: string;
  query: string;
  created_at: string;
  answer: string;
  final_context: string;
  indicated_failure: FailureStage;
  failure_reason: string;
  key_terms: string[];
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
}

export interface QueryRequest {
  query: string;
  key_terms?: string[];
  needed_chunk_ids?: string[];
  retrieval_k?: number;
  rerank_k?: number;
  context_max_chars?: number;
  mock_drift?: boolean;
}

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
