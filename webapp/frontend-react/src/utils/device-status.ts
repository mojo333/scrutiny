import type { DeviceModel } from '@/models/device-model';
import { DeviceStatus, MetricsStatusThreshold, type MetricsStatusThresholdValue } from '@/constants';

const DEVICE_STATUS_NAMES: { [key: number]: string } = {
  [DeviceStatus.Passed]: 'passed',
  [DeviceStatus.FailedSmart]: 'failed',
  [DeviceStatus.FailedScrutiny]: 'failed',
  [DeviceStatus.FailedBoth]: 'failed',
};

const DEVICE_STATUS_NAMES_WITH_REASON: { [key: number]: string } = {
  [DeviceStatus.Passed]: 'passed',
  [DeviceStatus.FailedSmart]: 'failed: smart',
  [DeviceStatus.FailedScrutiny]: 'failed: scrutiny',
  [DeviceStatus.FailedBoth]: 'failed: both',
};

export function deviceStatusForModelWithThreshold(
  deviceModel: DeviceModel,
  hasSmartResults: boolean = true,
  threshold: MetricsStatusThresholdValue = MetricsStatusThreshold.Both,
  includeReason: boolean = false
): string {
  // no smart data, so treat the device status as unknown
  if (!hasSmartResults) {
    return 'unknown';
  }

  let statusNameLookup = DEVICE_STATUS_NAMES;
  if (includeReason) {
    statusNameLookup = DEVICE_STATUS_NAMES_WITH_REASON;
  }

  // determine the device status, by comparing it against the allowed threshold
  const deviceStatus = deviceModel.device_status & threshold;
  return statusNameLookup[deviceStatus];
}
