import { api } from './client';
import type { DeviceDetailsResponseWrapper } from '@/models/device-details-response-wrapper';
import { isDemoMode, demoMuteDevice, demoUnmuteDevice, demoArchiveDevice, demoUnarchiveDevice, demoDeleteDevice, demoSetDeviceLabel } from '@/mock-data';

/**
 * Get device details including SMART data
 */
export async function getDeviceDetail(wwn: string): Promise<DeviceDetailsResponseWrapper> {
  const { data } = await api.get<DeviceDetailsResponseWrapper>(`/device/${wwn}/details`);
  return data;
}

/**
 * Mute device notifications
 */
export async function muteDevice(wwn: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoMuteDevice(wwn);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${wwn}/mute`, {});
  return data;
}

/**
 * Unmute device notifications
 */
export async function unmuteDevice(wwn: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoUnmuteDevice(wwn);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${wwn}/unmute`, {});
  return data;
}

/**
 * Set custom device label
 */
export async function setDeviceLabel(wwn: string, label: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoSetDeviceLabel(wwn, label);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${wwn}/label`, { label });
  return data;
}

/**
 * Archive device
 */
export async function archiveDevice(wwn: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoArchiveDevice(wwn);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${wwn}/archive`, {});
  return data;
}

/**
 * Unarchive device
 */
export async function unarchiveDevice(wwn: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoUnarchiveDevice(wwn);
    return { success: true };
  }
  const { data } = await api.post<{ success: boolean }>(`/device/${wwn}/unarchive`, {});
  return data;
}

/**
 * Delete device
 */
export async function deleteDevice(wwn: string): Promise<{ success: boolean }> {
  if (isDemoMode()) {
    demoDeleteDevice(wwn);
    return { success: true };
  }
  const { data } = await api.delete<{ success: boolean }>(`/device/${wwn}`);
  return data;
}
