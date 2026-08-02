# Product

## Register

product

## Users

AI/ML engineers, backend engineers, and support engineers maintaining RAG-based systems in production. They currently rely on manual re-running of queries and guesswork to diagnose bad answers. They work in technical contexts — terminals, dashboards, logs — and value precision, speed, and honesty over polish.

## Product Purpose

RAG Trace Debugger is a diagnostic layer that wraps an existing RAG pipeline without altering its core architecture. It lets engineers select any traced query and see the full chain of what happened at every stage (query rewrite → retrieval → rerank → assembly → generation) — immediately identifying which stage caused a bad answer.

**Core value**: Localizes failure. It does not auto-fix. It narrows down *where* a failure happened; it does not correct retrieval, reranking, or generation.

**Success**: Engineers reduce root-cause localization time from minutes/hours of guesswork to seconds of visual inspection.

## Brand Personality

**Three words**: Precise, Honest, Technical

**Voice**: Direct, unembellished, confident without hype. No marketing fluff. Speaks like a senior engineer to peers.

**Emotional goals**: 
- Confidence — "I can see exactly what happened"
- Trust — "The tool shows me the raw truth, not a polished narrative"
- Efficiency — "I found the bug in 30 seconds instead of 3 hours"

## Anti-references

- **Generic SaaS landing pages**: Purple gradients, "AI-powered" badges, hero-metric templates (big number + small label), identical card grids with icon+heading+text
- **Over-animated dashboards**: Motion for motion's sake, staggered entrance animations on every section, bounce/elastic easings
- **Marketing speak**: "Revolutionize", "Seamless", "Unlock the power of", "Next-generation"
- **Default framework aesthetics**: Untouched ShadCN/Tailwind defaults, Inter font everywhere, safe gray/blue palettes
- **Glassmorphism as decoration**: Blurs and glass cards used without purpose

## Design Principles

1. **Show, don't tell** — The landing page demonstrates the tool's capability visually. Code snippets, real trace data, actual UI screenshots over marketing illustrations.
2. **Practice what you preach** — The landing page itself uses the same technical aesthetic as the dashboard. Consistency builds trust.
3. **Precision over polish** — Exact numbers, real metrics, honest caveats. "100% accuracy on controlled test set (calibrated to this pipeline)" not "Industry-leading accuracy".
3. **Respect the engineer's time** — Scannable, information-dense, no fluff. Every element earns its pixels.
4. **Dark-mode-first, light-mode-complete** — Engineers live in dark mode. Design for it primarily; light mode is a first-class citizen, not an afterthought.

## Accessibility & Inclusion

- WCAG AA contrast minimum (4.5:1 body, 3:1 large text)
- `prefers-reduced-motion` respected — all animations have instant fallbacks
- Semantic HTML throughout
- Keyboard navigation on all interactive elements
- Focus states visible and intentional
- Color is never the sole status indicator (icons + text + color)