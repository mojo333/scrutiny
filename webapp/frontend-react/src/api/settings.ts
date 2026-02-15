import { api } from './client';
import type { AppConfig } from '@/types/settings';

// Re-export types for convenience
export type { AppConfig } from '@/types/settings';

interface GetSettingsResponse {
  success: boolean;
  settings: AppConfig;
  version?: string;
}

/**
 * Get application settings
 */
export async function getSettings(): Promise<AppConfig> {
  const { data } = await api.get<GetSettingsResponse>('/settings');
  return { ...data.settings, version: data.version || '' };
}

/**
 * Save application settings
 */
export async function saveSettings(settings: Partial<AppConfig>): Promise<{ success: boolean }> {
  // In demo mode, save to localStorage
  const isDemoMode = import.meta.env.VITE_APP_DEMO_MODE === 'true';
  if (isDemoMode) {
    const { saveDemoConfig } = await import('@/hooks/useAppConfig');
    saveDemoConfig(settings);
    return { success: true };
  }

  const { data } = await api.post<{ success: boolean }>('/settings', settings);
  return data;
}
