import { useQuery } from '@tanstack/react-query';
import { getSettings, type AppConfig } from '@/api/settings';
import { MOCK_APP_CONFIG } from '@/mock-data';

export type { AppConfig };

const DEMO_CONFIG_KEY = 'scrutiny_demo_config';

function getDemoConfig(): AppConfig {
  const stored = localStorage.getItem(DEMO_CONFIG_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { ...MOCK_APP_CONFIG, ...parsed };
    } catch {
      return MOCK_APP_CONFIG;
    }
  }
  return MOCK_APP_CONFIG;
}

export function saveDemoConfig(config: Partial<AppConfig>) {
  const current = getDemoConfig();
  const updated = { ...current, ...config };
  localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(updated));
}

export function useAppConfig() {
  const isDemoMode = import.meta.env.VITE_APP_DEMO_MODE === 'true';

  return useQuery<AppConfig>({
    queryKey: ['app-config'],
    queryFn: async () => {
      if (isDemoMode) {
        return getDemoConfig();
      }
      return getSettings();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
