import { api } from './client';
import type { DeviceDetailsResponseWrapper } from '@/models/device-details-response-wrapper';
import { isDemoMode, demoMuteDevice, demoUnmuteDevice, demoArchiveDevice, demoUnarchiveDevice, demoDeleteDevice, demoSetDeviceLabel } from '@/mock-data';

/**
 * Get device details including SMART data
 */
export async function getDeviceDetail(scrutinyUuid: string): Promise<DeviceDetailsResponseWrapper> {
  const { data } = await api.get<DeviceDetailsResponseWrapper>(`/device/${scrutinyUuid}/details`);
  return data;
}

/**
 * Mute device notifications
 */
export async function muteDevice(scrutinyUuid: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoMuteDevice(scrutinyUuid);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${scrutinyUuid}/mute`, {});
  return data;
}

/**
 * Unmute device notifications
 */
export async function unmuteDevice(scrutinyUuid: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoUnmuteDevice(scrutinyUuid);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${scrutinyUuid}/unmute`, {});
  return data;
}

/**
 * Set custom device label
 */
export async function setDeviceLabel(scrutinyUuid: string, label: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoSetDeviceLabel(scrutinyUuid, label);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${scrutinyUuid}/label`, { label });
  return data;
}

/**
 * Archive device
 */
export async function archiveDevice(scrutinyUuid: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoArchiveDevice(scrutinyUuid);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${scrutinyUuid}/archive`, {});
  return data;
}

/**
 * Unarchive device
 */
export async function unarchiveDevice(scrutinyUuid: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoUnarchiveDevice(scrutinyUuid);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${scrutinyUuid}/unarchive`, {});
  return data;
}

/**
 * Delete device
 */
export async function deleteDevice(scrutinyUuid: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoDeleteDevice(scrutinyUuid);
    return { success: true };
  }
  const { data } = await api.delete<{ success: boolean }>(`/device/${scrutinyUuid}`);
  return data;
}
