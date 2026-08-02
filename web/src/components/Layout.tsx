import { Link, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function Layout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/features', label: 'Features' },
    { path: '/about', label: 'About' },
  ];

  return (
    <div className="min-h-screen bg-bg text-text font-body">
      {/* Background effects */}
      <div className="fixed inset-0 -z-10 bg-radial-glow" />
      <div className="fixed inset-0 -z-10 bg-grid" />
      <div className="fixed inset-0 -z-10 bg-noise" />

      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-bg/95 backdrop-blur-sm border-b border-border'
            : 'bg-transparent'
        }`}
      >
        <nav className="container" aria-label="Main navigation">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2" aria-label="RAG-ger Home">
              <svg
                className="w-8 h-8 text-primary"
                viewBox="0 0 32 32"
                fill="none"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" />
                <path d="M8 16h16M16 8v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="font-display font-bold text-xl md:text-2xl tracking-tight">
                RAG-ger
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/debugger" className="btn btn-primary">
                Open Dashboard
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden btn btn-ghost"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden py-4 border-t border-border animate-slide-in-right">
              <div className="flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`nav-link px-2 ${location.pathname === link.path ? 'active' : ''}`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link to="/debugger" className="btn btn-primary mt-2">
                  Open Dashboard
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main id="main-content" className="pt-16 md:pt-20">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-elevated/50">
        <div className="container py-12 md:py-16">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4" aria-label="RAG-ger Home">
                <svg className="w-8 h-8 text-primary" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                  <rect x="2" y="2" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="2" />
                  <path d="M8 16h16M16 8v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span className="font-display font-bold text-xl tracking-tight">RAG-ger</span>
              </Link>
              <p className="text-text-muted max-w-xs text-base leading-relaxed">
                Diagnostic layer for RAG pipelines. Localizes failure — doesn't auto-fix.
                See exactly which stage broke your answer.
              </p>
            </div>

            <nav aria-label="Product links">
              <h4 className="font-display font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="nav-link">Features</Link></li>
                <li><Link to="/about" className="nav-link">About</Link></li>
                <li><Link to="/debugger" className="nav-link">Dashboard</Link></li>
              </ul>
            </nav>

            <nav aria-label="Resources">
              <h4 className="font-display font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="https://github.com/MaheshBoda-26/RAG_Trace_Debugger" target="_blank" rel="noopener noreferrer" className="nav-link">
                    GitHub
                  </a>
                </li>
                <li>
                  <a href="#" className="nav-link">Documentation</a>
                </li>
                <li>
                  <a href="#" className="nav-link">API Reference</a>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-text-dim text-sm">
              RAG-ger · Diagnostic tool, not a fix-it tool · Localizes failure, does not auto-resolve
            </p>
            <div className="flex items-center gap-6 text-sm text-text-dim">
              <span>Built with FastAPI + React + TypeScript</span>
              <a href="#" className="nav-link">Privacy</a>
              <a href="#" className="nav-link">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}