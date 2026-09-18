import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'rtd-theme';
const THEME_COLOR: Record<Theme, string> = { dark: '#131211', light: '#f7f5f1' };

/** Reads the theme the inline boot script already resolved (defaults to dark). */
function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

/**
 * One theme for the whole document. The toggle and the ⌘K palette both render
 * this state, so it lives in a module-level store rather than in per-hook
 * useState — otherwise the two copies drift and the palette offers to switch to
 * the theme that is already active.
 */
let currentTheme: Theme = readTheme();
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): Theme {
  return currentTheme;
}

/** Applies + remembers an explicit choice. Dark remains the default. */
function applyTheme(theme: Theme): void {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* private mode — the choice just won't persist */
  }
  listeners.forEach((listener) => listener());
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toggleTheme = useCallback(() => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, toggleTheme };
}
