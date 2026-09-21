import { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useLocalStorage('ff_theme', 'light');
  const [prefs, setPrefs] = useLocalStorage('ff_prefs', {
    layout: 'spacious', defaultRange: 'month', landing: '/overview', extendedFeatures: true, liveRefresh: true,
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-layout', prefs.layout);
  }, [theme, prefs.layout]);

  const value = useMemo(() => ({
    theme, isDark: theme === 'dark',
    setTheme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    prefs, setPref: (k, v) => setPrefs((p) => ({ ...p, [k]: v })),
  }), [theme, prefs, setTheme, setPrefs]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
