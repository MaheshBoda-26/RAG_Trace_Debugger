import type { Candidate } from '../types/trace';

function fmt(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return n.toFixed(4);
}

export function ChunkTable({ candidates }: { candidates: Candidate[] }) {
  if (!candidates.length) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">No candidates.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
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
          {candidates.map((c) => {
            const dropped = !c.kept;
            return (
              <tr
                key={c.chunk_id}
                className={`border-b border-slate-100 dark:border-slate-800 ${
                  dropped ? 'opacity-50' : ''
                }`}
              >
                <td className="py-1.5 pr-3 text-slate-400">{c.rank ?? '—'}</td>
                <td className="py-1.5 pr-3 font-mono text-slate-700 dark:text-slate-300">
                  {c.chunk_id}
                </td>
                <td className="py-1.5 pr-3 tabular-nums">{fmt(c.dense_score)}</td>
                <td className="py-1.5 pr-3 tabular-nums">{fmt(c.bm25_score)}</td>
                <td className="py-1.5 pr-3 tabular-nums font-medium">{fmt(c.fused_score)}</td>
                <td className="py-1.5 pr-3 tabular-nums">{fmt(c.rerank_score)}</td>
                <td className="py-1.5">
                  {dropped ? (
                    <span className="text-rose-600 dark:text-rose-400">
                      dropped{c.dropped_at ? ` @ ${c.dropped_at}` : ''}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">kept</span>
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
