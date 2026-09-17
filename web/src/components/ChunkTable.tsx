import type { Candidate } from '../types/trace';

function fmt(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return value.toFixed(4);
}

interface ChunkTableProps {
  candidates: Candidate[];
  loading?: boolean;
}

/**
 * The candidate grid. Every number that a reader compares is right-aligned and
 * tabular; the fused score carries a 2px bar so rank is legible at a glance.
 */
export function ChunkTable({ candidates, loading = false }: ChunkTableProps) {
  if (loading) {
    return (
      <div aria-busy="true" className="py-2">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="skeleton my-1.5 h-4 w-full" />
        ))}
      </div>
    );
  }

  if (!candidates.length) {
    return <p className="py-3 meta">No candidates captured for this exhibit.</p>;
  }

  // Kept first (by rank), then dropped by rank.
  const sorted = [...candidates].sort((a, b) => {
    if (a.kept !== b.kept) return a.kept ? -1 : 1;
    return (a.rank ?? 999) - (b.rank ?? 999);
  });
  const maxFused = Math.max(...sorted.map((c) => c.fused_score ?? 0), 0.0001);

  return (
    // Scrollable regions need keyboard access (axe: scrollable-region-focusable).
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Candidate scores, scrollable">
      <table className="grid-table">
        <caption className="sr-only">
          Retrieved candidates with dense, BM25, fused and rerank scores
        </caption>
        <thead>
          <tr>
            <th scope="col" className="num-col w-10">
              #
            </th>
            <th scope="col">chunk</th>
            <th scope="col" className="num-col">
              dense
            </th>
            <th scope="col" className="num-col">
              bm25
            </th>
            <th scope="col" className="num-col">
              fused
            </th>
            <th scope="col" className="num-col">
              rerank
            </th>
            <th scope="col">status</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((candidate) => {
            const dropped = !candidate.kept;
            return (
              <tr key={candidate.chunk_id}>
                <td className="num-col text-text-dim">{candidate.rank ?? '—'}</td>
                <td className="max-w-xs truncate font-mono text-text-muted" title={candidate.chunk_id}>
                  {candidate.chunk_id}
                </td>
                <td className="num-col text-text-dim">{fmt(candidate.dense_score)}</td>
                <td className="num-col text-text-dim">{fmt(candidate.bm25_score)}</td>
                <td className="num-col text-text">
                  {fmt(candidate.fused_score)}
                  <span
                    className="micro-bar mt-1 block"
                    style={{
                      width: `${Math.max(2, ((candidate.fused_score ?? 0) / maxFused) * 100)}%`,
                      backgroundColor: dropped ? 'var(--color-text-dim)' : 'var(--color-primary)',
                      opacity: dropped ? 0.5 : 1,
                    }}
                    aria-hidden="true"
                  />
                </td>
                <td className="num-col text-text-dim">{fmt(candidate.rerank_score)}</td>
                <td
                  className="font-mono text-[0.6875rem]"
                  style={{ color: dropped ? 'var(--color-error)' : 'var(--color-success)' }}
                >
                  {dropped ? `dropped${candidate.dropped_at ? ` @ ${candidate.dropped_at}` : ''}` : 'kept'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
