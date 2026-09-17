import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { CommandPalette } from './CommandPalette';

const NAV_LINKS = [
  { path: '/', label: 'Overview' },
  { path: '/debugger', label: 'Case files' },
  { path: '/eval', label: 'Batch review' },
  { path: '/features', label: 'How it works' },
  { path: '/about', label: 'About' },
];

function Mark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* A trace with one fault spike — the product in one glyph. */}
      <rect x="2" y="2" width="28" height="28" />
      <path d="M6 21h5l2.5-10 3 15 2-5H26" />
    </svg>
  );
}

export function Layout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors ${
          isScrolled ? 'bg-bg hairline-b' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <nav className="container" aria-label="Main">
          <div className="flex h-14 items-center justify-between gap-6 md:h-16">
            <Link to="/" className="flex items-center gap-2.5" aria-label="RAG Trace Debugger — home">
              <Mark className="w-6 h-6 text-primary" />
              <span className="font-display text-[1.0625rem] font-semibold tracking-tight text-text">
                RAG Trace Debugger
              </span>
              <span className="exhibit-label hidden lg:inline text-text-dim">diagnostic</span>
            </Link>

            <div className="hidden items-center gap-7 md:flex">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
                  aria-current={isActive(link.path) ? 'page' : undefined}
                >
                  {link.label}
                  {isActive(link.path) && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute left-0 right-0 -bottom-0.5 h-px bg-primary"
                      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
                    />
                  )}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-1">
              <CommandPalette />
              <ThemeToggle />
              <button
                className="btn btn-ghost btn-sm md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24" aria-hidden="true">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div id="mobile-menu" className="hairline-t py-2 md:hidden">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link block py-2 ${isActive(link.path) ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </nav>
      </header>

      <main id="main-content" className="pt-14 md:pt-16">
        <Outlet />
      </main>

      <footer className="hairline-t">
        <div className="container py-14 md:py-16">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <Mark className="w-6 h-6 text-primary" />
                <span className="font-display text-[1.0625rem] font-semibold tracking-tight">
                  RAG Trace Debugger
                </span>
              </div>
              <p className="mt-4 max-w-sm text-sm text-text-muted">
                A trace is evidence. Localizes the stage that broke the answer — then re-runs it to
                test the fix. It never silently rewrites your pipeline.
              </p>
            </div>

            <nav aria-label="Product">
              <h2 className="exhibit-label mb-4">Surfaces</h2>
              <ul className="space-y-2 text-sm">
                <li><Link to="/debugger" className="nav-link">Case files</Link></li>
                <li><Link to="/eval" className="nav-link">Batch review</Link></li>
                <li><Link to="/corpus" className="nav-link">Corpus</Link></li>
                <li><Link to="/features" className="nav-link">How it works</Link></li>
              </ul>
            </nav>

            <nav aria-label="Resources">
              <h2 className="exhibit-label mb-4">Resources</h2>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="https://github.com/MaheshBoda-26/RAG_Trace_Debugger"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-link"
                  >
                    Source ↗
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/MaheshBoda-26/RAG_Trace_Debugger/blob/main/docs/SDK.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-link"
                  >
                    Instrumentation SDK ↗
                  </a>
                </li>
                <li>
                  <Link to="/about" className="nav-link">Method &amp; caveats</Link>
                </li>
              </ul>
            </nav>
          </div>

          {/* Specimen strip: real facts, tabular, no marketing furniture. */}
          <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 hairline-t pt-5">
            <span className="meta">5 exhibits</span>
            <span className="meta">1 JSON record / case</span>
            <span className="meta">0 framework deps</span>
            <span className="meta">runs without API keys</span>
            <span className="meta ml-auto">FastAPI · React · TypeScript</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
