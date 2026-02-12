import { useQuery } from '@tanstack/react-query';
import { getDeviceDetail } from '@/api/device';
import { MOCK_DEVICE_DETAILS, generateMockDeviceDetails, isDemoMode } from '@/mock-data';

export function useDeviceDetail(wwn: string) {
  return useQuery({
    queryKey: ['device-detail', wwn],
    queryFn: async () => {
      if (isDemoMode()) {
        return MOCK_DEVICE_DETAILS[wwn] || generateMockDeviceDetails(wwn);
      }
      return getDeviceDetail(wwn);
    },
    staleTime: 30000, // 30 seconds
  });
}
