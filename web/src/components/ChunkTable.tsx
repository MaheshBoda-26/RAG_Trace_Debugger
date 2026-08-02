import type { Candidate } from '../types/trace';

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return n.toFixed(4);
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 animate-pulse">
      <td className="py-1.5 pr-3"><div className="h-4 w-8 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="py-1.5 pr-3"><div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="py-1.5 pr-3"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="py-1.5 pr-3"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="py-1.5 pr-3"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="py-1.5 pr-3"><div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded" /></td>
      <td className="py-1.5"><div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" /></td>
    </tr>
  );
}

interface ChunkTableProps {
  candidates: Candidate[];
  loading?: boolean;
}

export function ChunkTable({ candidates, loading = false }: ChunkTableProps) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs" role="table">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="py-1.5 pr-3 font-medium">#</th>
              <th className="py-1.5 pr-3 font-medium">Chunk</th>
              <th className="py-1.5 pr-3 font-medium">Dense</th>
              <th className="py-1.5 pr-3 font-medium">BM25</th>
              <th className="py-1.5 pr-3 font-medium">Fused</th>
              <th className="py-1.5 pr-3 font-medium">Rerank</th>
              <th className="py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    );
  }

  if (!candidates.length) {
    return (
      <div className="py-4 text-center">
        <svg className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No candidates found.
        </p>
      </div>
    );
  }

  // Sort: kept first (by rank), then dropped (by rank)
  const sortedCandidates = [...candidates].sort((a, b) => {
    if (a.kept !== b.kept) return a.kept ? -1 : 1;
    const ar = a.rank ?? 999;
    const br = b.rank ?? 999;
    return ar - br;
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs" role="table">
        <thead>
          <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10">
            <th className="py-1.5 pr-3 font-medium">#</th>
            <th className="py-1.5 pr-3 font-medium">Chunk</th>
            <th className="py-1.5 pr-3 font-medium">Dense</th>
            <th className="py-1.5 pr-3 font-medium">BM25</th>
            <th className="py-1.5 pr-3 font-medium">Fused</th>
            <th className="py-1.5 pr-3 font-medium">Rerank</th>
            <th className="py-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedCandidates.map((c) => {
            const dropped = !c.kept;
            return (
              <tr
                key={c.chunk_id}
                className={`border-b border-slate-100 dark:border-slate-800 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                  dropped ? 'opacity-60' : ''
                }`}
              >
                <td className="py-1.5 pr-3 text-slate-400 tabular-nums font-mono">
                  {c.rank ?? '—'}
                </td>
                <td className="py-1.5 pr-3 font-mono text-slate-700 dark:text-slate-300 max-w-xs truncate" title={c.chunk_id}>
                  {c.chunk_id}
                </td>
                <td className="py-1.5 pr-3 tabular-nums text-slate-600 dark:text-slate-300">{fmt(c.dense_score)}</td>
                <td className="py-1.5 pr-3 tabular-nums text-slate-600 dark:text-slate-300">{fmt(c.bm25_score)}</td>
                <td className="py-1.5 pr-3 tabular-nums font-medium text-slate-800 dark:text-slate-100">{fmt(c.fused_score)}</td>
                <td className="py-1.5 pr-3 tabular-nums text-slate-600 dark:text-slate-300">{fmt(c.rerank_score)}</td>
                <td className="py-1.5">
                  {dropped ? (
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      dropped{c.dropped_at ? ` @ ${c.dropped_at}` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      kept
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
