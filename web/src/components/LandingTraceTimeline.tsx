import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from 'framer-motion';
import type { AnimationPlaybackControls } from 'framer-motion';

/**
 * "The run" — the signature interaction.
 *
 * A recorded case executes once in true pipeline order (~3.4s), the failing
 * exhibit is stamped, and the others desaturate so attention lands on the
 * fault. It then stops and rests: no looping, because infinite ambient motion
 * is noise. The visitor can grab the playhead and scrub the run by hand — that
 * turns a decorative mock into a toy you can actually explore.
 */

type Exhibit = {
  id: string;
  name: string;
  latency: number;
  readout: string;
  verdict: 'ok' | 'fail';
  note: string;
};

const CASE = {
  id: 'case 12',
  question: 'What is the refund policy for enterprise?',
  totalMs: 1935,
  verdict: 'rerank',
  reason: 'Needed chunk “pricing#0” was retrieved, then dropped during rerank.',
};

const EXHIBITS: Exhibit[] = [
  {
    id: 'query_rewrite',
    name: 'query_rewrite',
    latency: 12,
    readout: '4 tokens → 8 terms',
    verdict: 'ok',
    note: 'Rewritten query expanded toward the policy docs.',
  },
  {
    id: 'retrieval',
    name: 'retrieval',
    latency: 45,
    readout: '12 candidates · RRF 0.781',
    verdict: 'ok',
    note: 'The chunk that answers the question is in the candidate set.',
  },
  {
    id: 'rerank',
    name: 'rerank',
    latency: 23,
    readout: '5 kept / 7 dropped',
    verdict: 'fail',
    note: 'pricing#0 ranked 8th and was cut before assembly.',
  },
  {
    id: 'assembly',
    name: 'assembly',
    latency: 8,
    readout: '5 chunks · 588 chars',
    verdict: 'ok',
    note: 'Context assembled cleanly — from the wrong five chunks.',
  },
  {
    id: 'generation',
    name: 'generation',
    latency: 1847,
    readout: 'gemini-2.5-flash · 287 tok',
    verdict: 'ok',
    note: 'Answered fluently, without the fact that was dropped upstream.',
  },
];

const RUN_KEY = 'rtd-hero-run';
const RUN_MS = 3400;

export function LandingTraceTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<AnimationPlaybackControls | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  const reducedMotion = useReducedMotion();

  const [progress, setProgress] = useState(0);
  const [settled, setSettled] = useState(false); // verdict stamped
  const [scrubbed, setScrubbed] = useState(false);

  const lit = Math.round(progress * EXHIBITS.length);
  const failIndex = EXHIBITS.findIndex((e) => e.verdict === 'fail');

  // Rest state: already watched this session, or reduced motion is requested.
  useEffect(() => {
    if (reducedMotion) {
      setProgress(1);
      setSettled(true);
      return;
    }
    try {
      if (sessionStorage.getItem(RUN_KEY) === '1') {
        setProgress(1);
        setSettled(true);
      }
    } catch {
      /* sessionStorage unavailable — the run simply plays again */
    }
  }, [reducedMotion]);

  // Play the run once, when it first comes into view.
  useEffect(() => {
    if (!inView || scrubbed) return;
    if (reducedMotion) return;
    let alreadyRan = false;
    try {
      alreadyRan = sessionStorage.getItem(RUN_KEY) === '1';
    } catch {
      alreadyRan = false;
    }
    if (alreadyRan) return;

    const controls = animate(0, 1, {
      duration: RUN_MS / 1000,
      ease: [0.2, 0, 0, 1],
      onUpdate: setProgress,
      onComplete: () => {
        setSettled(true);
        try {
          sessionStorage.setItem(RUN_KEY, '1');
        } catch {
          /* ignore */
        }
      },
    });
    controlsRef.current = controls;
    return () => controls.stop();
  }, [inView, reducedMotion, scrubbed]);

  function onScrub(value: number) {
    controlsRef.current?.stop();
    setScrubbed(true);
    setProgress(value);
    setSettled(value >= 1);
  }

  return (
    <section aria-labelledby="hero-run-heading" className="relative">
      <div ref={ref}>
        {/* Case header */}
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 hairline-b pb-3">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h3 id="hero-run-heading" className="exhibit-label text-text-muted">
              recorded case
            </h3>
            <span className="meta">{CASE.id}</span>
            <span className="text-sm text-text-muted">“{CASE.question}”</span>
          </div>
          <span className="meta num">{CASE.totalMs} ms total</span>
        </div>

        {/* Playhead rail */}
        <div className="relative mt-5">
          <div className="h-px w-full bg-border" />
          <div
            className="absolute left-0 top-0 h-px bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Exhibits */}
        <ol
          className="trace-timeline mt-4"
          role="list"
          aria-label="Pipeline exhibits for the recorded case"
        >
          {EXHIBITS.map((exhibit, index) => {
            const isLit = index < lit;
            const isActive = !settled && index === lit - 1;
            const isVerdict = settled && index === failIndex;
            const isDimmed = settled && index !== failIndex;

            return (
              <li
                key={exhibit.id}
                className={`trace-stage ${isActive || isVerdict ? 'active' : ''} ${
                  isDimmed ? 'dimmed' : ''
                }`}
                aria-current={isActive ? 'step' : undefined}
                style={{
                  borderColor: isVerdict
                    ? 'var(--color-error)'
                    : isLit
                      ? 'var(--color-primary)'
                      : 'var(--color-border)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="exhibit-label">{String(index + 1).padStart(2, '0')}</span>
                  {isVerdict ? (
                    <span className="stage-retrieval exhibit-label">verdict</span>
                  ) : (
                    isLit && <span className="exhibit-label text-primary">done</span>
                  )}
                </div>

                <h4 className="trace-stage-name mt-3">{exhibit.name}</h4>
                <div className="trace-stage-metric">{exhibit.readout}</div>
                <div className="flex items-center justify-between">
                  <span className="meta num">{exhibit.latency} ms</span>
                  {exhibit.verdict === 'fail' && settled ? (
                    <span className="badge badge-error">dropped</span>
                  ) : isLit ? (
                    <span className="badge badge-dim">ok</span>
                  ) : (
                    <span className="meta">—</span>
                  )}
                </div>

                {/* The single copper sweep marks the faulty exhibit. */}
                {isVerdict && (
                  <span className="sweep-in absolute bottom-0 left-0 right-0 h-px bg-primary" />
                )}
              </li>
            );
          })}
        </ol>

        {/* Scrub control — the mock becomes an instrument. */}
        <div className="mt-3 flex items-center gap-4">
          <label htmlFor="run-scrub" className="exhibit-label shrink-0">
            playhead
          </label>
          <input
            id="run-scrub"
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={(e) => onScrub(Number(e.target.value) / 1000)}
            className="h-1 w-full max-w-xs cursor-ew-resize appearance-none bg-border accent-primary"
            aria-label="Scrub through the recorded run"
            aria-valuetext={`${lit} of ${EXHIBITS.length} exhibits complete`}
          />
          <span className="meta num shrink-0">
            {String(lit).padStart(2, '0')}/{EXHIBITS.length}
          </span>
        </div>

        {/* Verdict */}
        <div className="mt-6 min-h-[6.5rem]">
          <AnimatePresence mode="wait">
            {settled ? (
              <motion.div
                key="verdict"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="flex flex-col gap-4 border border-border bg-bg-elevated p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="stamp stamp-bad">verdict · {CASE.verdict}</span>
                  <p className="text-sm text-text-muted max-w-xl">{CASE.reason}</p>
                </div>
                <motion.a
                  href="/debugger"
                  className="btn btn-retest whitespace-nowrap"
                  initial={{ opacity: 0.85 }}
                  animate={{ scale: [1, 1.035, 1], opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.25, ease: [0.2, 0, 0, 1] }}
                >
                  Re-test this case
                </motion.a>
              </motion.div>
            ) : (
              <motion.p
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="meta py-4"
              >
                running exhibits…
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <p className="meta mt-2">
          Recorded run — the live form below executes the real pipeline.
        </p>
      </div>
    </section>
  );
}
