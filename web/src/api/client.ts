/** Thin fetch wrapper for the RAG Trace Debugger API. */
import type {
  CorpusResponse,
  EvalResults,
  HealResponse,
  QueryRequest,
  Trace,
  TraceSummary,
} from '../types/trace';

/**
 * FastAPI's `detail` is a string for simple errors but this API raises
 * `HTTPException(detail={"error": ..., "query_id": ...})`. Passing that object
 * straight to `new Error` renders as the literal "[object Object]" in the UI,
 * so flatten it into one readable line first.
 */
function errorMessage(detail: unknown, status: number): string {
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (detail && typeof detail === 'object') {
    const record = detail as Record<string, unknown>;
    const label = typeof record.error === 'string' ? record.error : null;
    const context = Object.entries(record)
      .filter(([key, value]) => key !== 'error' && (typeof value === 'string' || typeof value === 'number'))
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(', ');
    if (label) return context ? `${label} (${context})` : label;
    try {
      return JSON.stringify(detail);
    } catch {
      /* circular or otherwise unserialisable — fall back to the status line */
    }
  }
  return `HTTP ${status}`;
}

async function readError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({ detail: res.statusText }));
  throw new Error(errorMessage(body?.detail, res.status));
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) await readError(res);
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await readError(res);
  return res.json() as Promise<T>;
}

export interface HealthResponse {
  status: string;
  gemini_enabled: boolean;
  doc_count: number;
  chunk_count: number;
  metrics: {
    uptime_seconds: number;
    total_queries_served: number;
    error_count: number;
    avg_overhead_ms: number;
  };
  circuit_breaker: {
    state: string;
    consecutive_failures: number;
  };
}

export const api = {
  health: () => getJson<HealthResponse>('/api/health'),

  listTraces: (failure?: string) =>
    getJson<TraceSummary[]>(`/api/traces${failure && failure !== 'all' ? `?failure=${failure}` : ''}`),
  getTrace: (id: string) => getJson<Trace>(`/api/traces/${id}`),
  runQuery: (req: QueryRequest) => postJson<Trace>('/api/query', req),
  healTrace: (queryId: string) =>
    postJson<HealResponse>('/api/query/heal', { query_id: queryId }),
  clearTraces: () => deleteTraces(),

  getCorpus: () => getJson<CorpusResponse>('/api/corpus'),

  getEvalQueries: () => getJson<{ queries: unknown[] }>('/api/eval/queries'),
  runEval: () => postJson<EvalResults>('/api/eval/run'),
  getEvalResults: () => getJson<EvalResults>('/api/eval/results'),
};

export async function deleteTraces(): Promise<{ deleted: number }> {
  const res = await fetch('/api/traces', { method: 'DELETE' });
  if (!res.ok) await readError(res);
  return res.json();
}