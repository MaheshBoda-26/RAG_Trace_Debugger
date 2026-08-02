import { motion } from 'framer-motion';
import type { Feature } from '../types/feature';

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

export function FeatureCard({ feature, index }: FeatureCardProps) {
  const variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1],
        delay: index * 0.08,
      },
    },
  };

  return (
    <motion.article
      variants={variants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="card card-interactive group"
      role="listitem"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-300">
        {feature.icon}
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">{feature.title}</h3>
      <p className="text-text-muted leading-relaxed mb-4">{feature.description}</p>
      <div className="flex items-center gap-2 text-xs font-mono text-primary font-medium">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {feature.metric}
      </div>
    </motion.article>
  );
}