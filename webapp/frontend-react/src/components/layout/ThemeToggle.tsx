import { useAppConfig } from '@/hooks/useAppConfig';
import { saveSettings } from '@/api/settings';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { data: config } = useAppConfig();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-config'] });
    },
  });

  const currentTheme = config?.theme || 'dark';

  // Cycle through: dark -> light -> system -> dark
  const getNextTheme = () => {
    if (currentTheme === 'dark') return 'light';
    if (currentTheme === 'light') return 'system';
    return 'dark';
  };

  const handleToggle = () => {
    const nextTheme = getNextTheme();
    saveMutation.mutate({ theme: nextTheme });
  };

  // Determine which icon to show based on current theme
  const getIcon = () => {
    if (currentTheme === 'light') {
      // Sun icon - currently in light mode
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
    } else if (currentTheme === 'system') {
      // Computer/monitor icon - currently in system mode
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    } else {
      // Moon icon - currently in dark mode
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      );
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="theme-toggle-btn"
      title={`Current theme: ${currentTheme}. Click to switch to ${getNextTheme()}`}
    >
      {getIcon()}
    </Button>
  );
}
