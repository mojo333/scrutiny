import humanizeDuration from 'humanize-duration';

export function formatDeviceHours(
  hoursOfRunTime: number | null,
  unit: string,
  humanizeConfig: object = {}
): string {
  if (hoursOfRunTime === null) {
    return 'Unknown';
  }
  if (unit === 'device_hours') {
    return `${hoursOfRunTime} hours`;
  }
  return humanizeDuration(hoursOfRunTime * 60 * 60 * 1000, humanizeConfig);
}
