import { useRef, useState } from 'react';
import { useMotionValueEvent, useReducedMotion, useScroll } from 'framer-motion';

/**
 * Scroll-linked narrative. The pipeline advances 1:1 with scroll position —
 * scrolling *is* the explanation, and the diagram never animates on its own.
 * This is the page's only scroll-driven motion.
 */

type Exhibit = {
  name: string;
  captures: string;
  reveals: string;
};

const EXHIBITS: Exhibit[] = [
  {
    name: 'query_rewrite',
    captures: 'Raw query, rewritten query, expansion tokens.',
    reveals: 'Rewrite replaced every original term.',
  },
  {
    name: 'retrieval',
    captures: 'Every candidate with dense, BM25 and fused (RRF) scores.',
    reveals: 'The chunk holding the answer was never retrieved.',
  },
  {
    name: 'rerank',
    captures: 'Kept vs. dropped chunks, scores, and drop reason.',
    reveals: 'Retrieved — then cut before it reached the model.',
  },
  {
    name: 'assembly',
    captures: 'The exact context string handed to the model.',
    reveals: 'A required term was truncated out of the context.',
  },
  {
    name: 'generation',
    captures: 'Raw answer, model name, token counts.',
    reveals: 'The answer ignored context it was given.',
  },
];

export function ExhibitStack() {
  const ref = useRef<HTMLOListElement>(null);
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(-1);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.8', 'end 0.55'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    if (reducedMotion) return;
    const index = Math.floor(value * EXHIBITS.length);
    setActive(Math.min(EXHIBITS.length - 1, Math.max(0, index)));
  });

  return (
    <ol ref={ref} className="mt-10" role="list">
      {EXHIBITS.map((exhibit, index) => {
        const isActive = index === active;
        return (
          <li
            key={exhibit.name}
            className="grid grid-cols-[3rem_1fr] border-t border-border transition-colors duration-300 md:grid-cols-[4rem_11rem_1fr_1fr] md:items-baseline md:gap-x-6"
            style={{
              backgroundColor: isActive
                ? 'color-mix(in oklab, var(--color-text) 3%, transparent)'
                : 'transparent',
            }}
          >
            <span
              className="num py-5 pl-1 text-sm transition-colors duration-300"
              style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-dim)' }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3
              className="py-5 font-mono text-sm transition-colors duration-300"
              style={{ color: isActive ? 'var(--color-text)' : 'var(--color-text-muted)' }}
            >
              {exhibit.name}
            </h3>
            <p className="col-start-2 py-0 pb-2 text-sm text-text-muted md:col-start-auto md:py-5 md:pr-6">
              {exhibit.captures}
            </p>
            <p className="col-start-2 pb-5 text-sm md:col-start-auto md:py-5">
              <span className="exhibit-label mr-2">signature</span>
              <span style={{ color: isActive ? 'var(--color-error)' : 'var(--color-text-dim)' }}>
                {exhibit.reveals}
              </span>
            </p>
          </li>
        );
      })}
      <li className="border-t border-border" />
    </ol>
  );
}
