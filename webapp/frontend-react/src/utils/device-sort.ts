import type { DeviceSummaryModel } from '@/models/device-summary-model';
import { deviceTitleForType } from './device-title';

function statusCompareFn(a: DeviceSummaryModel, b: DeviceSummaryModel): number {
  function deviceStatus(deviceSummary: DeviceSummaryModel): number {
    if (!deviceSummary.smart) {
      return 0;
    } else if (deviceSummary.device.device_status === 0) {
      return 1;
    } else {
      return deviceSummary.device.device_status * -1; // will return range from -1, -2, -3
    }
  }

  const left = deviceStatus(a);
  const right = deviceStatus(b);

  return left - right;
}

function titleCompareFn(dashboardDisplay: string) {
  return function (a: DeviceSummaryModel, b: DeviceSummaryModel) {
    const left =
      deviceTitleForType(a.device, dashboardDisplay) ||
      deviceTitleForType(a.device, 'name');
    const right =
      deviceTitleForType(b.device, dashboardDisplay) ||
      deviceTitleForType(b.device, 'name');

    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  };
}

function ageCompareFn(a: DeviceSummaryModel, b: DeviceSummaryModel): number {
  const left = a.smart?.power_on_hours || 0;
  const right = b.smart?.power_on_hours || 0;

  return left - right;
}

export function sortDevices(
  deviceSummaries: DeviceSummaryModel[],
  sortBy = 'status',
  dashboardDisplay = 'name'
): DeviceSummaryModel[] {
  let compareFn: (a: DeviceSummaryModel, b: DeviceSummaryModel) => number;

  switch (sortBy) {
    case 'status':
      compareFn = statusCompareFn;
      break;
    case 'title':
      compareFn = titleCompareFn(dashboardDisplay);
      break;
    case 'age':
      compareFn = ageCompareFn;
      break;
    default:
      compareFn = statusCompareFn;
  }

  // failed, unknown/empty, passed
  return [...deviceSummaries].sort(compareFn);
}
