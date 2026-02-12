import type { DeviceModel } from '@/models/device-model';

export function deviceTitleForType(device: DeviceModel, titleType: string): string {
  const titleParts: string[] = [];

  switch (titleType) {
    case 'name':
      titleParts.push(`/dev/${device.device_name}`);
      if (device.device_type && device.device_type !== 'scsi' && device.device_type !== 'ata') {
        titleParts.push(device.device_type);
      }
      titleParts.push(device.model_name);
      break;

    case 'serial_number':
    case 'serial_id':  // Keep for backwards compatibility
      if (!device.device_serial_id) return '';
      titleParts.push(`/by-id/${device.device_serial_id}`);
      break;

    case 'uuid':
      if (!device.device_uuid) return '';
      titleParts.push(`/by-uuid/${device.device_uuid}`);
      break;

    case 'label':
      if (device.label) {
        titleParts.push(device.label);
      } else if (device.device_label) {
        titleParts.push(`/by-label/${device.device_label}`);
      }
      break;
  }

  return titleParts.join(' - ');
}

export function deviceTitleWithFallback(device: DeviceModel, titleType: string = 'name'): string {
  const titleParts: string[] = [];

  if (device.host_id) titleParts.push(device.host_id);

  // add device identifier (fallback to generated device name)
  const titleResult = deviceTitleForType(device, titleType);
  titleParts.push(
    titleResult || deviceTitleForType(device, 'name')
  );

  return titleParts.join(' - ');
}
