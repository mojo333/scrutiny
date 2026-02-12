import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getZFSPoolsSummary,
  getZFSPoolDetails,
  archiveZFSPool,
  unarchiveZFSPool,
  muteZFSPool,
  unmuteZFSPool,
  updateZFSPoolLabel,
  deleteZFSPool,
} from '@/api/zfs';
import {
  isDemoMode,
  getDemoZFSPools,
  generateMockZFSPoolDetails,
  demoArchiveZFSPool,
  demoUnarchiveZFSPool,
  demoMuteZFSPool,
  demoUnmuteZFSPool,
  demoSetZFSPoolLabel,
  demoDeleteZFSPool,
} from '@/mock-data';

export function useZFSPoolsSummary() {
  return useQuery({
    queryKey: ['zfs', 'summary'],
    queryFn: async () => {
      if (isDemoMode()) {
        return getDemoZFSPools();
      }
      return getZFSPoolsSummary();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useZFSPoolDetails(guid: string) {
  return useQuery({
    queryKey: ['zfs', 'pool', guid],
    queryFn: async () => {
      if (isDemoMode()) {
        return generateMockZFSPoolDetails(guid);
      }
      return getZFSPoolDetails(guid);
    },
    enabled: !!guid,
    staleTime: 1000 * 60 * 5,
  });
}

export function useArchiveZFSPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ guid, archive }: { guid: string; archive: boolean }) => {
      if (isDemoMode()) {
        if (archive) {
          demoArchiveZFSPool(guid);
        } else {
          demoUnarchiveZFSPool(guid);
        }
        return;
      }
      if (archive) {
        await archiveZFSPool(guid);
      } else {
        await unarchiveZFSPool(guid);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zfs'] });
    },
  });
}

export function useMuteZFSPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ guid, mute }: { guid: string; mute: boolean }) => {
      if (isDemoMode()) {
        if (mute) {
          demoMuteZFSPool(guid);
        } else {
          demoUnmuteZFSPool(guid);
        }
        return;
      }
      if (mute) {
        await muteZFSPool(guid);
      } else {
        await unmuteZFSPool(guid);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zfs'] });
    },
  });
}

export function useUpdateZFSPoolLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ guid, label }: { guid: string; label: string }) => {
      if (isDemoMode()) {
        demoSetZFSPoolLabel(guid, label);
        return;
      }
      await updateZFSPoolLabel(guid, label);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zfs'] });
    },
  });
}

export function useDeleteZFSPool() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (guid: string) => {
      if (isDemoMode()) {
        demoDeleteZFSPool(guid);
        return;
      }
      await deleteZFSPool(guid);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zfs'] });
    },
  });
}
