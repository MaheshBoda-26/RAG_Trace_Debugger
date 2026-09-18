import { Link } from 'react-router-dom';

const GROUPS: {
  group: string;
  title: string;
  description: string;
  metric: string;
}[] = [
  {
    group: 'instrumentation',
    title: 'Five-stage instrumentation',
    description:
      'Query rewrite → retrieval → rerank → assembly → generation. Each exhibit records its inputs, outputs, scores, latency and timestamps into one structured event, so a case file can be read top to bottom without cross-referencing logs.',
    metric: '5 exhibits',
  },
  {
    group: 'instrumentation',
    title: 'Framework-agnostic core',
    description:
      'The collector is a plain Python module with a decorator and a context manager. LangChain and LlamaIndex adapters are thin maps onto the same five exhibits. Core dependencies: none.',
    metric: '0 framework deps',
  },
  {
    group: 'attribution',
    title: 'Deterministic localization',
    description:
      'A heuristic ranks exhibits by root-cause likelihood — not an LLM judge. Structural deficits (information that never reached the model) are checked before generation misses, because a generation miss is usually a symptom of an upstream drop.',
    metric: 'ranked heuristic',
  },
  {
    group: 'attribution',
    title: 'Intent-aware risk profiles',
    description:
      'Every query is classified into one of five intent classes with a confidence, and the case file shows which exhibits that class tends to break. The batch review stratifies accuracy by the same classes.',
    metric: '5 intent classes',
  },
  {
    group: 'repair',
    title: 'Re-test with adjusted parameters',
    description:
      'One click re-runs the failed case with bumped retrieval depth, rerank depth or context budget, re-localizes the result, and diffs the two runs stage by stage — including which needed chunks moved from dropped to kept.',
    metric: 'before / after',
  },
  {
    group: 'repair',
    title: 'Verdicts that can say “no”',
    description:
      'A re-test reports improvement only when a structural signal actually recovers. When no parameter change helps, it says the failure is not parameter-fixable instead of rounding a failure into a win.',
    metric: 'honest by default',
  },
];

const CAPTURES = [
  { stage: 'query_rewrite', captures: 'Raw query, rewritten query, expansion tokens' },
  { stage: 'retrieval', captures: 'All candidates with dense, BM25 and fused (RRF k=60) scores' },
  { stage: 'rerank', captures: 'Kept vs. dropped chunks, rerank scores, drop reason and position' },
  { stage: 'assembly', captures: 'The exact context string handed to the model, plus its length' },
  { stage: 'generation', captures: 'Raw answer, model name, token counts, temperature' },
];

const LOCALIZER = [
  { rank: 1, stage: 'retrieval', check: 'needed chunk not in the candidate set', kind: 'structural' },
  { rank: 2, stage: 'rerank', check: 'needed chunk retrieved, then dropped', kind: 'structural' },
  { rank: 3, stage: 'assembly', check: 'key term in kept chunks but missing from context', kind: 'structural' },
  { rank: 4, stage: 'generation', check: 'key term in context but absent from the answer', kind: 'misuse' },
  { rank: 5, stage: 'query_rewrite', check: 'rewrite replaced every original token', kind: 'informational' },
];

export function Features() {
  return (
    <>
      <section className="substrate pt-14 pb-10 md:pt-20 md:pb-14">
        <div className="container">
          <div className="max-w-3xl">
            <p className="exhibit-label">method</p>
            <h1 className="mt-5">
              How the instrument{' '}
              <br />
              reads a failure.
            </h1>
            <p className="mt-6 max-w-xl text-text-muted md:text-lg">
              Every claim on this page maps to a field in the trace record or a line in the localizer.
              Nothing here is a roadmap item.
            </p>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="capabilities-heading">
        <div className="container">
          <h2 id="capabilities-heading" className="sr-only">
            Capabilities
          </h2>
          <div>
            {GROUPS.map((item) => (
              <div key={item.title} className="feature-row">
                <span className="exhibit-label">{item.group}</span>
                <div>
                  <h3 className="text-text">{item.title}</h3>
                  <p className="mt-2 max-w-2xl text-sm text-text-muted">{item.description}</p>
                </div>
                <span className="meta md:text-right">{item.metric}</span>
              </div>
            ))}
            <div className="border-t border-border" />
          </div>
        </div>
      </section>

      <hr className="rule-fade" />

      <section className="section" aria-labelledby="captures-heading">
        <div className="container">
          <div className="max-w-2xl">
            <h2 id="captures-heading">What each exhibit captures</h2>
          </div>
          <div
            className="mt-8 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Captured fields, scrollable"
          >
            <table className="grid-table">
              <caption className="sr-only">Fields captured per pipeline exhibit</caption>
              <thead>
                <tr>
                  <th scope="col">exhibit</th>
                  <th scope="col">captured</th>
                </tr>
              </thead>
              <tbody>
                {CAPTURES.map((row) => (
                  <tr key={row.stage}>
                    <th scope="row" className="w-48 font-mono font-normal text-text">
                      {row.stage}
                    </th>
                    <td className="text-text-muted">{row.captures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="meta mt-4">
            One JSON record per case, keyed by case id. Read it in any editor or pipe it into analysis.
          </p>
        </div>
      </section>

      <hr className="rule-fade" />

      <section className="section" aria-labelledby="localizer-heading">
        <div className="container">
          <div className="max-w-2xl">
            <h2 id="localizer-heading">Ranking the localizer walks</h2>
            <p className="mt-5 text-text-muted">
              Structural deficits are checked before content misuse: a generation miss is usually a
              symptom of something upstream being dropped, and blaming the model there sends you
              tuning prompts for a retrieval bug.
            </p>
          </div>
          <div
            className="mt-8 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Localizer ranking, scrollable"
          >
            <table className="grid-table">
              <caption className="sr-only">Localizer ranking by root-cause likelihood</caption>
              <thead>
                <tr>
                  <th scope="col" className="num-col w-12">
                    rank
                  </th>
                  <th scope="col">blames</th>
                  <th scope="col">when</th>
                  <th scope="col">class</th>
                </tr>
              </thead>
              <tbody>
                {LOCALIZER.map((row) => (
                  <tr key={row.rank}>
                    <td className="num-col text-text-dim">{row.rank}</td>
                    <th scope="row" className="font-mono font-normal text-text">
                      {row.stage}
                    </th>
                    <td className="text-text-muted">{row.check}</td>
                    <td
                      className="font-mono text-[0.6875rem]"
                      style={{
                        color:
                          row.kind === 'structural'
                            ? 'var(--color-error)'
                            : row.kind === 'misuse'
                              ? 'var(--color-warning)'
                              : 'var(--color-text-dim)',
                      }}
                    >
                      {row.kind}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-6">
            <Link to="/debugger" className="btn btn-primary">
              Open a case file
            </Link>
            <Link to="/about" className="nav-link">
              Method, caveats and stack →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
