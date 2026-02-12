import { api } from './client';
import type { DeviceSummaryModel } from '@/models/device-summary-model';
import type { DeviceSummaryResponseWrapper } from '@/models/device-summary-response-wrapper';
import type { DeviceSummaryTempResponseWrapper } from '@/models/device-summary-temp-response-wrapper';
import type { SmartTemperatureModel } from '@/models/measurements/smart-temperature-model';

/**
 * Get dashboard summary (all devices)
 */
export async function getDashboardSummary(): Promise<{ [key: string]: DeviceSummaryModel }> {
  const { data } = await api.get<DeviceSummaryResponseWrapper>('/summary');
  return data.data.summary;
}

/**
 * Get temperature history for all devices
 */
export async function getDashboardTempHistory(
  durationKey: string
): Promise<{ [key: string]: SmartTemperatureModel[] }> {
  const { data } = await api.get<DeviceSummaryTempResponseWrapper>(`/summary/temp?duration_key=${durationKey}`);
  return data.data.temp_history;
}
