import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';

type Command = {
  id: string;
  label: string;
  hint: string;
  group: 'case files' | 'surfaces' | 'external';
  run: () => void;
};

/**
 * ⌘K palette. The premium detail that also makes the whole app reachable
 * without a mouse.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => {
      navigate(path);
      setOpen(false);
    };
    return [
      { id: 'debugger', label: 'Dashboard — case files', hint: '⌘1', group: 'surfaces', run: go('/debugger') },
      { id: 'eval', label: 'Batch review (eval)', hint: '⌘2', group: 'surfaces', run: go('/eval') },
      { id: 'corpus', label: 'Corpus', hint: '⌘3', group: 'surfaces', run: go('/corpus') },
      { id: 'home', label: 'Overview', hint: '', group: 'surfaces', run: go('/') },
      { id: 'features', label: 'How it works', hint: '', group: 'surfaces', run: go('/features') },
      { id: 'about', label: 'About the project', hint: '', group: 'surfaces', run: go('/about') },
      {
        id: 'theme',
        label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`,
        hint: '',
        group: 'surfaces',
        run: () => {
          toggleTheme();
          setOpen(false);
        },
      },
      {
        id: 'github',
        label: 'Source on GitHub',
        hint: '↗',
        group: 'external',
        run: () => {
          window.open('https://github.com/MaheshBoda-26/RAG_Trace_Debugger', '_blank', 'noopener');
          setOpen(false);
        },
      },
    ];
  }, [navigate, theme, toggleTheme]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.group}`.toLowerCase().includes(q));
  }, [commands, query]);

  // Global shortcuts: ⌘K / Ctrl-K to open, Esc to close, ⌘1-3 for surfaces.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (meta && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        const target = { '1': '/debugger', '2': '/eval', '3': '/corpus' }[event.key];
        if (target) navigate(target);
      }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      // Focus after the enter transition starts so the caret lands visibly.
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  function onListKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCursor((c) => (c + 1) % Math.max(results.length, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor((c) => (c - 1 + results.length) % Math.max(results.length, 1));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      results[cursor]?.run();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm hidden md:inline-flex items-center gap-2"
        aria-label="Open command palette"
      >
        <span className="exhibit-label">search</span>
        <kbd className="meta border border-border px-1.5 py-0.5">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
            style={{ backgroundColor: 'oklch(0 0 0 / 0.55)', backdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Command palette"
              initial={{ opacity: 0, scale: 0.985, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.16, ease: [0.2, 0, 0, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg border border-border bg-bg-elevated"
            >
              <div className="hairline-b">
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onListKeyDown}
                  placeholder="Jump to a surface…"
                  aria-label="Search commands"
                  className="w-full bg-transparent px-4 py-3 font-mono text-sm text-text placeholder:text-text-dim focus:outline-none"
                />
              </div>
              <ul className="max-h-72 overflow-y-auto py-1">
                {results.length === 0 && (
                  <li className="px-4 py-3 meta">No matching surface.</li>
                )}
                {results.map((command, index) => (
                  <li key={command.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(index)}
                      onClick={command.run}
                      className="flex w-full items-center justify-between gap-4 px-4 py-2 text-left text-sm transition-colors"
                      style={{
                        backgroundColor:
                          index === cursor
                            ? 'color-mix(in oklab, var(--color-text) 6%, transparent)'
                            : 'transparent',
                        color: index === cursor ? 'var(--color-text)' : 'var(--color-text-muted)',
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <span className="exhibit-label">{command.group}</span>
                        {command.label}
                      </span>
                      {command.hint && <span className="meta">{command.hint}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
