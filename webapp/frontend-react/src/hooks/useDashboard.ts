import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary, getDashboardTempHistory } from '@/api/dashboard';
import { isDemoMode, getDemoDevices } from '@/mock-data';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      if (isDemoMode()) {
        return getDemoDevices();
      }
      return getDashboardSummary();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useDashboardSummaryTemp(durationKey?: string) {
  return useQuery({
    queryKey: ['dashboard', 'summary', 'temp', durationKey],
    queryFn: async () => {
      if (!durationKey) throw new Error('Duration key required');
      return getDashboardTempHistory(durationKey);
    },
    enabled: !!durationKey,
    staleTime: 1000 * 60 * 5,
  });
}
