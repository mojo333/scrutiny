import { describe, it, expect } from 'vitest';
import { deviceTitleForType, deviceTitleWithFallback } from '@/utils/device-title';
import type { DeviceModel } from '@/models/device-model';

// Helper to create a mock device with all required properties
function createMockDevice(overrides: Partial<DeviceModel> = {}): DeviceModel {
  return {
    muted: false,
    wwn: 'wwn-test',
    manufacturer: 'Test Manufacturer',
    model_name: 'Test Model',
    interface_type: 'SATA',
    interface_speed: '6.0 Gb/s',
    serial_number: 'TEST123',
    firmware: '1.0',
    rotational_speed: 0,
    capacity: 1000000000000,
    form_factor: '2.5',
    smart_support: true,
    device_protocol: 'ATA',
    device_type: 'ata',
    label: '',
    host_id: '',
    device_status: 0,
    ...overrides,
  };
}

describe('deviceTitleForType', () => {
  const testCases = [
    {
      device: createMockDevice({
        device_name: 'sda',
        device_type: 'ata',
        model_name: 'Samsung',
      }),
      titleType: 'name',
      result: '/dev/sda - Samsung',
    },
    {
      device: createMockDevice({
        device_name: 'nvme0',
        device_type: 'nvme',
        model_name: 'Samsung',
      }),
      titleType: 'name',
      result: '/dev/nvme0 - nvme - Samsung',
    },
    {
      device: createMockDevice(),
      titleType: 'serial_id',
      result: '',
    },
    {
      device: createMockDevice({
        device_serial_id: 'ata-WDC_WD140EDFZ-11AXXXXX_9RXXXXXX',
      }),
      titleType: 'serial_id',
      result: '/by-id/ata-WDC_WD140EDFZ-11AXXXXX_9RXXXXXX',
    },
    {
      device: createMockDevice(),
      titleType: 'uuid',
      result: '',
    },
    {
      device: createMockDevice({
        device_uuid: 'abcdef-1234-4567-8901',
      }),
      titleType: 'uuid',
      result: '/by-uuid/abcdef-1234-4567-8901',
    },
    {
      device: createMockDevice(),
      titleType: 'label',
      result: '',
    },
    {
      device: createMockDevice({
        label: 'custom-device-label',
      }),
      titleType: 'label',
      result: 'custom-device-label',
    },
    {
      device: createMockDevice({
        device_label: 'drive-volume-label',
      }),
      titleType: 'label',
      result: '/by-label/drive-volume-label',
    },
  ];

  testCases.forEach((test, index) => {
    it(`should correctly format device title ${JSON.stringify(test.device)} (testcase: ${index + 1})`, () => {
      const formatted = deviceTitleForType(test.device, test.titleType);
      expect(formatted).toEqual(test.result);
    });
  });
});

describe('deviceTitleWithFallback', () => {
  const testCases = [
    {
      device: createMockDevice({
        device_name: 'sda',
        device_type: 'ata',
        model_name: 'Samsung',
      }),
      titleType: 'name',
      result: '/dev/sda - Samsung',
    },
    {
      device: createMockDevice({
        device_name: 'nvme0',
        device_type: 'nvme',
        model_name: 'Samsung',
      }),
      titleType: 'name',
      result: '/dev/nvme0 - nvme - Samsung',
    },
    {
      // Falls back to name when serial_id is missing
      device: createMockDevice({
        device_name: 'fallback',
        device_type: 'ata',
        model_name: 'fallback',
      }),
      titleType: 'serial_id',
      result: '/dev/fallback - fallback',
    },
    {
      device: createMockDevice({
        device_serial_id: 'ata-WDC_WD140EDFZ-11AXXXXX_9RXXXXXX',
      }),
      titleType: 'serial_id',
      result: '/by-id/ata-WDC_WD140EDFZ-11AXXXXX_9RXXXXXX',
    },
    {
      // Falls back to name when uuid is missing
      device: createMockDevice({
        device_name: 'fallback',
        device_type: 'ata',
        model_name: 'fallback',
      }),
      titleType: 'uuid',
      result: '/dev/fallback - fallback',
    },
    {
      device: createMockDevice({
        device_uuid: 'abcdef-1234-4567-8901',
      }),
      titleType: 'uuid',
      result: '/by-uuid/abcdef-1234-4567-8901',
    },
    {
      // Falls back to name when label is missing
      device: createMockDevice({
        device_name: 'fallback',
        device_type: 'ata',
        model_name: 'fallback',
      }),
      titleType: 'label',
      result: '/dev/fallback - fallback',
    },
    {
      device: createMockDevice({
        label: 'custom-device-label',
      }),
      titleType: 'label',
      result: 'custom-device-label',
    },
    {
      device: createMockDevice({
        device_label: 'drive-volume-label',
      }),
      titleType: 'label',
      result: '/by-label/drive-volume-label',
    },
  ];

  testCases.forEach((test, index) => {
    it(`should correctly format device title with fallback ${JSON.stringify(test.device)} (testcase: ${index + 1})`, () => {
      const formatted = deviceTitleWithFallback(test.device, test.titleType);
      expect(formatted).toEqual(test.result);
    });
  });

  it('should include host_id when present', () => {
    const device = createMockDevice({
      host_id: 'server-01',
      device_name: 'sda',
      device_type: 'ata',
      model_name: 'Samsung',
    });

    const formatted = deviceTitleWithFallback(device, 'name');
    expect(formatted).toEqual('server-01 - /dev/sda - Samsung');
  });
});
