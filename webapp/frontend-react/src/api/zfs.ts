import { api } from './client';
import type { ZFSPoolModel } from '@/models/zfs-pool-model';
import type { ZFSPoolDetailsResponseWrapper } from '@/models/zfs-pool-summary-model';

/**
 * Get ZFS pools summary
 */
export async function getZFSPoolsSummary(): Promise<{ [key: string]: ZFSPoolModel }> {
  const { data } = await api.get<any>('/zfs/summary');
  return data.data.pools || {};
}

/**
 * Get ZFS pool details
 */
export async function getZFSPoolDetails(guid: string) {
  const { data } = await api.get<ZFSPoolDetailsResponseWrapper>(`/zfs/pool/${guid}/details`);
  return data.data;
}

/**
 * Archive a ZFS pool
 */
export async function archiveZFSPool(guid: string) {
  await api.post(`/zfs/pool/${guid}/archive`);
}

/**
 * Unarchive a ZFS pool
 */
export async function unarchiveZFSPool(guid: string) {
  await api.post(`/zfs/pool/${guid}/unarchive`);
}

/**
 * Mute a ZFS pool
 */
export async function muteZFSPool(guid: string) {
  await api.post(`/zfs/pool/${guid}/mute`);
}

/**
 * Unmute a ZFS pool
 */
export async function unmuteZFSPool(guid: string) {
  await api.post(`/zfs/pool/${guid}/unmute`);
}

/**
 * Update ZFS pool label
 */
export async function updateZFSPoolLabel(guid: string, label: string) {
  await api.post(`/zfs/pool/${guid}/label`, { label });
}

/**
 * Delete a ZFS pool
 */
export async function deleteZFSPool(guid: string) {
  await api.delete(`/zfs/pool/${guid}`);
}
