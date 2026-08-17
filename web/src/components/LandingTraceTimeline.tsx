import { motion, AnimatePresence } from 'framer-motion';
import { useState, Fragment } from 'react';

interface TraceStage {
  name: string;
  icon: string;
  status: 'success' | 'warning' | 'error' | 'info';
  latency: number;
  details: Record<string, string | number | boolean>;
}

const demoStages: TraceStage[] = [
  {
    name: 'Query Rewrite',
    icon: 'rewrite',
    status: 'success',
    latency: 12,
    details: {
      input: 'What is the refund policy for enterprise?',
      output: 'refund policy enterprise SaaS subscription terms',
    },
  },
  {
    name: 'Retrieval',
    icon: 'database',
    status: 'success',
    latency: 45,
    details: {
      candidates: 12,
      denseScore: 0.847,
      bm25Score: 0.723,
      fusedScore: 0.781,
    },
  },
  {
    name: 'Rerank',
    icon: 'filter',
    status: 'error',
    latency: 23,
    details: {
      kept: 5,
      dropped: 7,
      reason: 'Needed chunk dropped at position 8',
    },
  },
  {
    name: 'Assembly',
    icon: 'file-text',
    status: 'warning',
    latency: 8,
    details: {
      contextTokens: 3247,
      truncation: true,
      keptChunks: 5,
    },
  },
  {
    name: 'Generation',
    icon: 'brain',
    status: 'success',
    latency: 1847,
    details: {
      model: 'gemini-2.5-flash',
      tokens: 287,
      temperature: 0.1,
    },
  },
  {
    name: 'Localizer',
    icon: 'alert-triangle',
    status: 'error',
    latency: 2,
    details: {
      indicatedFailure: 'rerank',
      confidence: 0.94,
      reason: 'Needed chunk retrieved but dropped during rerank',
    },
  },
];

const stageIcons: Record<string, React.ReactNode> = {
  rewrite: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M21 10H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1z" />
      <path d="M3 14h14a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h14" />
      <path d="M14 4v6M10 14v6" />
    </svg>
  ),
  database: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 7.33 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 7.33 3 9 3s9-1.34 9-3" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  'file-text': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  brain: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 5a3 3 0 1 0-3 3c0 1.5-.5 3-2 4v1c7 0 7-6 7-6a3 3 0 1 0-6 0z" />
      <path d="M9 17a2 2 0 0 1-2-2c0-1.5.5-3 2-4v-1" />
      <path d="M15 17a2 2 0 0 0 2-2c0-1.5-.5-3-2-4v-1" />
    </svg>
  ),
  'alert-triangle': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

const statusConfig = {
  success: { className: 'badge-success', label: 'OK', icon: 'check' },
  warning: { className: 'badge-warning', label: 'WARN', icon: 'alert' },
  error: { className: 'badge-error', label: 'FAIL', icon: 'x' },
  info: { className: 'badge-info', label: 'RUN', icon: 'loader' },
};

const statusIcons = {
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3"><polyline points="20 6 9 17 4 12" /></svg>,
  alert: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  loader: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 animate-spin"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>,
};

export function LandingTraceTimeline() {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5,
        ease: [0.16, 1, 0.3, 1],
      },
    },
  };

  const connectorVariants = {
    hidden: { opacity: 0, scaleX: 0 },
    visible: {
      opacity: 1,
      scaleX: 1,
      transition: {
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
        delay: 0.3,
      },
    },
  };

  return (
    <section aria-label="Interactive trace timeline" className="relative">
      <div className="max-w-7xl mx-auto">
        {/* Timeline Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display text-lg font-semibold">Live Trace: <code className="code-inline">q_7f2a9e4...</code></h3>
            <p className="text-sm text-text-muted mt-1">Query: "What is the refund policy for enterprise?"</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-text-dim">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" />
              Total: 1937ms
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-error" />
              Failure: Rerank
            </span>
          </div>
        </div>

        {/* Timeline */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="trace-timeline"
          role="list"
          aria-label="Pipeline stages"
        >
          {demoStages.map((stage, index) => (
            <Fragment key={stage.name}>
              <motion.article
                variants={itemVariants}
                className={`trace-stage ${selectedIndex === index ? 'active' : ''}`}
                role="listitem"
                onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedIndex(selectedIndex === index ? null : index);
                  }
                }}
              >
                <div
                  className="trace-stage-icon"
                  style={{
                    backgroundColor: `var(--color-${statusConfig[stage.status].className.replace('badge-', '')}/15)`,
                    color: `var(--color-${statusConfig[stage.status].className.replace('badge-', '')})`,
                  }}
                >
                  {stageIcons[stage.icon]}
                </div>

                <h4 className="trace-stage-name">{stage.name}</h4>

                <div className="trace-stage-metric font-mono">
                  {stage.latency}ms
                </div>

                <div className="trace-stage-status">
                  <span
                    className={`badge ${statusConfig[stage.status].className}`}
                  >
                    {statusIcons[statusConfig[stage.status].icon as keyof typeof statusIcons]}
                    {statusConfig[stage.status].label}
                  </span>
                </div>

                {/* Detail Tooltip on Select */}
                <AnimatePresence>
                  {selectedIndex === index && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 z-20
                        bg-surface border border-border rounded-xl p-3 shadow-lg
                        animate-fade-in-up"
                      role="tooltip"
                    >
                      <div className="font-mono text-xs text-text-muted mb-2">
                        {stage.name} Details
                      </div>
                      <dl className="space-y-1.5 text-sm">
                        {Object.entries(stage.details).map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-4">
                            <dt className="text-text-dim capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                            <dd className="font-mono text-text text-right max-w-[60%] truncate">
                              {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.article>

              {index < demoStages.length - 1 && (
                <motion.div variants={connectorVariants} className="trace-connector">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
              )}
            </Fragment>
          ))}
        </motion.div>

        {/* Scroll Indicator */}
        <div className="flex justify-center mt-4">
          <motion.div
            animate={{ x: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1 text-text-dim"
            aria-hidden="true"
          >
            <span className="text-xs">Scroll to explore</span>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </motion.div>
        </div>

        {/* Selected Stage Detail Panel */}
        <AnimatePresence>
          {selectedIndex !== null && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 card relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: `var(--color-${statusConfig[demoStages[selectedIndex].status].className.replace('badge-', '')}/15)`,
                      color: `var(--color-${statusConfig[demoStages[selectedIndex].status].className.replace('badge-', '')})`,
                    }}
                  >
                    {stageIcons[demoStages[selectedIndex].icon]}
                  </div>
                  <div>
                    <h4 className="font-display text-lg font-semibold">{demoStages[selectedIndex].name}</h4>
                    <span className={`badge ${statusConfig[demoStages[selectedIndex].status].className}`}>
                      {statusIcons[statusConfig[demoStages[selectedIndex].status].icon as keyof typeof statusIcons]}
                      {statusConfig[demoStages[selectedIndex].status].label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIndex(null)}
                  className="btn btn-ghost text-text-dim hover:text-error"
                  aria-label="Close details"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(demoStages[selectedIndex].details).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <dt className="text-xs font-medium text-text-dim uppercase tracking-wider">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </dt>
                    <dd className="font-mono text-sm text-text break-all">
                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
                    </dd>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}