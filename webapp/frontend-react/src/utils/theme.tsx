import { useEffect, useCallback } from 'react';
import { useAppConfig } from '@/hooks/useAppConfig';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: config } = useAppConfig();

  const applyTheme = useCallback((configTheme: string | undefined) => {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let theme: 'dark' | 'light' = 'dark';

    if (configTheme === 'system' || !configTheme) {
      theme = systemPrefersDark ? 'dark' : 'light';
    } else {
      theme = configTheme as 'dark' | 'light';
    }

    // Apply theme
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, []);

  // Apply theme when config changes
  useEffect(() => {
    applyTheme(config?.theme);
  }, [config?.theme, applyTheme]);

  // Listen for system theme changes when using 'system' theme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      // Only react to system changes if theme is set to 'system'
      if (config?.theme === 'system' || !config?.theme) {
        applyTheme(config?.theme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [config?.theme, applyTheme]);

  return <>{children}</>;
}
