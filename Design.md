# Design System — RAG Trace Debugger Landing Page

## Design Direction

**Aesthetic**: Bold/Editorial — Technical Brutalism

**DFII Score**: 11/15 (Strong — Proceed with discipline)

**Differentiation Anchor**: The landing page renders actual trace data and pipeline stages as the hero visual — not abstract illustrations. The "hero" is a live, interactive trace timeline that visitors can scrub through. This demonstrates the product by *being* the product.

---

## Color Palette (OKLCH)

### Brand Colors

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-primary` | `0.58 0.22 258` | `#2563EB` | Primary actions, links, focus rings, active states |
| `--color-primary-hover` | `0.52 0.24 258` | `#1D4ED8` | Hover on primary buttons |
| `--color-primary-light` | `0.92 0.05 258` | `#DBEAFE` | Subtle backgrounds, badges |
| `--color-secondary` | `0.55 0.20 285` | `#7C3AED` | Accent highlights, secondary CTAs |
| `--color-accent-cyan` | `0.72 0.15 195` | `#06B6D4` | Code highlights, terminal accents |
| `--color-accent-orange` | `0.72 0.18 50` | `#F97316` | Warning states, key metrics |

### Semantic Colors

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-success` | `0.65 0.18 142` | `#22C55E` | Success badges, "clean" traces |
| `--color-warning` | `0.78 0.16 85` | `#F59E0B` | Warning badges, partial traces |
| `--color-error` | `0.62 0.22 25` | `#EF4444` | Error badges, failure stages |
| `--color-info` | `0.65 0.19 220` | `#0EA5E9` | Info badges, running states |

### Neutral — Dark Mode (Primary)

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-bg` | `0.09 0.01 258` | `#0A0F1A` | Page background |
| `--color-bg-elevated` | `0.12 0.01 258` | `#111827` | Cards, panels |
| `--color-surface` | `0.16 0.02 258` | `#1E293B` | Inputs, code blocks |
| `--color-border` | `0.25 0.02 258` | `#334155` | Borders, dividers |
| `--color-text` | `0.97 0.01 258` | `#F8FAFC` | Primary text |
| `--color-text-muted` | `0.70 0.02 258` | `#CBD5E1` | Secondary text |
| `--color-text-dim` | `0.50 0.02 258` | `#64748B` | Captions, disabled |

### Neutral — Light Mode

| Token | OKLCH | Hex | Usage |
|-------|-------|-----|-------|
| `--color-bg` | `1.00 0 0` | `#FFFFFF` | Page background |
| `--color-bg-elevated` | `0.98 0.005 258` | `#F8FAFC` | Cards, panels |
| `--color-surface` | `1.00 0 0` | `#FFFFFF` | Inputs, code blocks |
| `--color-border` | `0.88 0.01 258` | `#E2E8F0` | Borders, dividers |
| `--color-text` | `0.12 0.02 258` | `#0F172A` | Primary text |
| `--color-text-muted` | `0.42 0.03 258` | `#475569` | Secondary text |
| `--color-text-dim` | `0.55 0.03 258` | `#64748B` | Captions, disabled |

---

## Typography

### Font Stack

```css
/* Display — Expressive, technical personality */
--font-display: "Space Grotesk", "JetBrains Mono", ui-monospace, monospace;

/* Body — Readable, precise, code-adjacent */
--font-body: "IBM Plex Sans", system-ui, -apple-system, sans-serif;

/* Mono — Code, trace IDs, metrics */
--font-mono: "JetBrains Mono", "Fira Code", ui-monospace, monospace;
```

**Rationale**: Space Grotesk has geometric precision with distinctive letterforms (especially numbers) — feels technical but not generic. IBM Plex Sans pairs beautifully with monospace, excellent readability at small sizes. JetBrains Mono is the developer standard for code.

### Type Scale

| Element | Size | Weight | Line Height | Font |
|---------|------|--------|-------------|------|
| Hero H1 | `clamp(3rem, 8vw, 6rem)` | 700 | 1.05 | Display |
| Section H2 | `clamp(2rem, 4vw, 3rem)` | 700 | 1.15 | Display |
| Sub H3 | `clamp(1.5rem, 2.5vw, 2rem)` | 600 | 1.3 | Display |
| Body Large | `1.125rem` | 400 | 1.7 | Body |
| Body | `1rem` | 400 | 1.65 | Body |
| Small | `0.875rem` | 400 | 1.6 | Body |
| Caption | `0.75rem` | 400 | 1.5 | Mono |
| Code | `0.875rem` | 400 | 1.6 | Mono |

### Text Wrap

- `h1, h2, h3` → `text-wrap: balance`
- `p, li` → `text-wrap: pretty`

---

## Spacing System (8px Grid)

| Token | Value |
|-------|-------|
| `--space-xs` | `4px` |
| `--space-sm` | `8px` |
| `--space-md` | `16px` |
| `--space-lg` | `24px` |
| `--space-xl` | `32px` |
| `--space-2xl` | `48px` |
| `--space-3xl` | `64px` |
| `--space-4xl` | `96px` |

**Section rhythm**: `py-4xl` (96px) between major sections, `py-3xl` (64px) between sub-sections.

---

## Layout

| Property | Value |
|----------|-------|
| Max content width | `1280px` (`max-w-7xl`) |
| Container padding | `px-6 md:px-12 lg:px-16` |
| Grid gap | `24px` (`gap-6`) |
| Border radius | `12px` (`rounded-xl`) — cards, buttons |
| Border radius (sm) | `8px` (`rounded-lg`) — inputs, badges |
| Border radius (pill) | `9999px` — tags, pills |

---

## Elevation

| Level | Shadow | Usage |
|-------|--------|-------|
| 1 (Card) | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Cards, panels |
| 2 (Elevated) | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` | Dropdowns, hover cards |
| 3 (Modal) | `0 20px 25px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.04)` | Modals, drawers |
| 4 (Floating) | `0 25px 50px rgba(0,0,0,0.25)` | Tooltips, popovers |

**Dark mode**: shadows use `rgba(0,0,0,0.3-0.5)` for depth.

---

## Motion Philosophy

**Principle**: Motion serves comprehension, not decoration.

- **One strong entrance**: Hero trace timeline animates in on scroll/viewport entry
- **Meaningful hover**: Interactive trace stages lift + glow on hover (shows "this is clickable")
- **Staggered reveal**: Pipeline stages cascade in (0.08s stagger) — mirrors the pipeline flow
- **Reduced motion**: All animations disable to instant (`0ms`) when `prefers-reduced-motion: reduce`
- **Duration**: 200-300ms for micro-interactions, 600-800ms for entrance sequences
- **Easing**: `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) — snappy, premium feel

**No**: bounce, elastic, infinite loops, parallax, decorative particle systems.

---

## Component Patterns

### Buttons

```css
/* Primary — Filled brand blue */
.btn-primary {
  @apply bg-primary text-white px-6 py-3 rounded-xl font-medium
         transition-colors duration-200
         hover:bg-primary-hover active:bg-primary/90
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg
         disabled:opacity-50 disabled:cursor-not-allowed;
}

/* Secondary — Outlined */
.btn-secondary {
  @apply border-2 border-border bg-transparent text-text px-6 py-3 rounded-xl font-medium
         transition-colors duration-200
         hover:bg-surface hover:border-primary hover:text-primary
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg;
}

/* Ghost — Minimal */
.btn-ghost {
  @apply bg-transparent text-text-muted px-4 py-2 rounded-lg font-medium
         transition-colors duration-150
         hover:text-text hover:bg-surface
         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2;
}
```

### Cards

```css
.card {
  @apply bg-bg-elevated border border-border rounded-xl p-6 md:p-8
         transition-all duration-200
         hover:border-primary/50 hover:shadow-[0_4px_20px_rgba(37,99,235,0.1)];
}

.card-interactive {
  @apply cursor-pointer;
}
```

### Code Blocks

```css
.code-block {
  @apply bg-surface border border-border rounded-xl p-4 md:p-6
         font-mono text-sm leading-relaxed overflow-x-auto
         text-text;
}

.code-inline {
  @apply bg-surface px-1.5 py-0.5 rounded font-mono text-sm text-primary;
}
```

### Badges (Stage Status)

```css
.badge {
  @apply inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium;
}

.badge-success { @apply bg-success/15 text-success border border-success/30; }
.badge-warning { @apply bg-warning/15 text-warning border border-warning/30; }
.badge-error { @apply bg-error/15 text-error border border-error/30; }
.badge-running { @apply bg-info/15 text-info border border-info/30 animate-pulse-subtle; }
.badge-unknown { @apply bg-text-dim/15 text-text-dim border border-border; }
```

---

## Background Effects (Dark Mode)

### Subtle Grid Pattern

```css
.bg-grid {
  background-image: 
    linear-gradient(rgba(51, 65, 85, 0.3) 1px, transparent 1px),
    linear-gradient(90deg, rgba(51, 65, 85, 0.3) 1px, transparent 1px);
  background-size: 64px 64px;
}
```

### Radial Glow (Hero)

```css
.bg-radial-glow {
  background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(37, 99, 235, 0.12) 0%, transparent 70%);
}
```

### Noise Texture (Overlay)

```css
.bg-noise::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,<svg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'><filter id='noise'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23noise)'/></svg>");
  pointer-events: none;
}
```

---

## Interactive Trace Timeline (Hero Component)

The centerpiece of the landing page — a horizontally scrollable, interactive visualization of a real RAG trace.

### Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Query: "What is the refund policy for enterprise?"             │
├────────┬──────────┬────────┬──────────┬───────────┬────────────┤
│ Rewrite│ Retrieval│ Rerank │ Assembly │ Generation│ Localizer  │
│  ✓     │   12 ch  │  5 kept│  3.2k tk │  1.8s     │  Rerank    │
│  12ms  │  45ms    │  23ms  │  8ms     │           │  (0.94)    │
└────────┴──────────┴────────┴──────────┴───────────┴────────────┘
         ▲          ▲        ▲          ▲          ▲
         │          │        │          │          │
      hover      hover    hover     hover      hover
      shows     shows    shows     shows      shows
      details   details  details   details    details
```

### Interaction States

- **Default**: Stage cards at rest, subtle border glow for "current" stage
- **Hover**: Card lifts (`translateY(-4px)`), border glows primary, tooltip expands with stage details
- **Click/Select**: Card locks open, detail panel slides in from right
- **Scroll**: Horizontal scroll with snap-to-stage, progress indicator

### Animation

- **Entrance**: Stages cascade in left-to-right (stagger 80ms, duration 500ms, ease-out-expo)
- **Hover**: 150ms ease-out-expo
- **Panel slide**: 250ms ease-out-expo

---

## Anti-Patterns (Do Not Use)

- ❌ Gradient text (`background-clip: text`)
- ❌ Glassmorphism cards (`backdrop-blur` as default)
- ❌ Hero metric template (big number + label + stats)
- ❌ Identical icon+heading+text card grids
- ❌ Numbered section markers (01/02/03) on every section
- ❌ Tiny uppercase tracked eyebrows above every heading
- ❌ Emoji icons anywhere
- ❌ Purple/pink SaaS gradients
- ❌ Bounce/elastic easings
- ❌ Infinite ambient animations

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Mobile | `< 640px` | Stacked sections, hidden trace timeline (show screenshot instead) |
| Tablet | `640-1024px` | Condensed trace timeline, 2-col feature grid |
| Desktop | `1024-1440px` | Full trace timeline, 3-col feature grid |
| Large | `> 1440px` | Max-width container, generous whitespace |

---

## Accessibility Checklist

- [ ] All interactive elements: `focus-visible` rings (2px, primary, offset 2px)
- [ ] Color contrast: 4.5:1 body, 3:1 large text (both themes)
- [ ] `prefers-reduced-motion`: all transitions → 0ms, animations → instant
- [ ] Semantic HTML: `<header>`, `<main>`, `<section>`, `<footer>`, `<nav>`
- [ ] ARIA labels on icon-only buttons
- [ ] Alt text on all images (including trace timeline screenshot fallback)
- [ ] Keyboard navigation: Tab order matches visual order
- [ ] Form inputs: associated `<label>` elements
- [ ] Status never conveyed by color alone (icon + text + color)

---

## Differentiation Callout

> **This avoids generic UI by:**
> 1. Using an **actual interactive trace timeline as the hero** instead of an abstract illustration or screenshot — visitors use the product before signing up
> 2. **Space Grotesk + IBM Plex Sans + JetBrains Mono** instead of Inter/Roboto — technical personality without looking like every other dev tool
> 3. **Dark-mode-primary with honest light mode** instead of light-mode-default with token dark mode — matches how engineers actually work
> 4. **Real metrics with caveats** ("100% on calibrated test set") instead of marketing claims ("Industry-leading 99.9% accuracy")
> 5. **Code as content** — API snippets, trace JSON, pipeline diagrams are the visual language, not decorative illustrations