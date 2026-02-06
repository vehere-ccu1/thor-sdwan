import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTheme } from '../theme';

const STORAGE_KEY = 'sdwan_theme_mode';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  });

  const theme = getTheme(mode);

  const setMode = useCallback((value) => {
    setModeState((prev) => {
      const next = value === 'light' || value === 'dark' ? value : prev;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch (_) {}
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.body.style.background = theme.color.background;
    document.body.style.color = theme.color.text;
  }, [theme.color.background, theme.color.text]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { mode: 'light', setMode: () => {}, theme: getTheme('light') };
  return ctx;
}
