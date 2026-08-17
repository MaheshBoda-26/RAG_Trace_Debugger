/** Thin fetch wrapper for the RAG Trace Debugger API. */
import type {
  CorpusResponse,
  EvalResults,
  QueryRequest,
  Trace,
  TraceSummary,
} from '../types/trace';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => getJson<{ status: string; gemini_enabled: boolean; doc_count: number; chunk_count: number }>('/api/health'),

  listTraces: (failure?: string) =>
    getJson<TraceSummary[]>(`/api/traces${failure && failure !== 'all' ? `?failure=${failure}` : ''}`),
  getTrace: (id: string) => getJson<Trace>(`/api/traces/${id}`),
  runQuery: (req: QueryRequest) => postJson<Trace>('/api/query', req),
  clearTraces: () => postJson<{ deleted: number }>('/api/traces', {}), // DELETE

  getCorpus: () => getJson<CorpusResponse>('/api/corpus'),

  getEvalQueries: () => getJson<{ queries: unknown[] }>('/api/eval/queries'),
  runEval: () => postJson<EvalResults>('/api/eval/run'),
  getEvalResults: () => getJson<EvalResults>('/api/eval/results'),
};

export async function deleteTraces(): Promise<{ deleted: number }> {
  const res = await fetch('/api/traces', { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}