import { describe, it, expect } from 'vitest';
import { sortDevices } from '@/utils/device-sort';
import type { DeviceSummaryModel } from '@/models/device-summary-model';
import type { DeviceModel } from '@/models/device-model';

describe('sortDevices', () => {
  // Helper to create device summary models for testing
  function createDeviceSummary(
    name: string,
    deviceStatus: number,
    hasSmart: boolean,
    powerOnHours: number = 0
  ): DeviceSummaryModel {
    return {
      device: {
        device_name: name,
        device_type: 'ata',
        model_name: `Model ${name}`,
        device_status: deviceStatus,
      } as DeviceModel,
      smart: hasSmart
        ? {
            power_on_hours: powerOnHours,
          }
        : null,
    } as DeviceSummaryModel;
  }

  describe('sort by status', () => {
    it('should sort failed devices first', () => {
      const devices = [
        createDeviceSummary('sda', 0, true), // passed
        createDeviceSummary('sdb', 3, true), // failed both
        createDeviceSummary('sdc', 1, true), // failed smart
      ];

      const sorted = sortDevices(devices, 'status');

      // Failed devices should come first (negative status after conversion)
      expect(sorted[0].device.device_name).toBe('sdb'); // status 3 -> -3
      expect(sorted[1].device.device_name).toBe('sdc'); // status 1 -> -1
      expect(sorted[2].device.device_name).toBe('sda'); // status 0 -> 1 (passed)
    });

    it('should put devices without smart data after failed devices', () => {
      const devices = [
        createDeviceSummary('sda', 0, true), // passed
        createDeviceSummary('sdb', 0, false), // no smart data
        createDeviceSummary('sdc', 2, true), // failed scrutiny
      ];

      const sorted = sortDevices(devices, 'status');

      expect(sorted[0].device.device_name).toBe('sdc'); // failed
      expect(sorted[1].device.device_name).toBe('sdb'); // no smart (0)
      expect(sorted[2].device.device_name).toBe('sda'); // passed (1)
    });
  });

  describe('sort by title', () => {
    it('should sort devices alphabetically by title', () => {
      const devices = [
        createDeviceSummary('sdc', 0, true),
        createDeviceSummary('sda', 0, true),
        createDeviceSummary('sdb', 0, true),
      ];

      const sorted = sortDevices(devices, 'title');

      expect(sorted[0].device.device_name).toBe('sda');
      expect(sorted[1].device.device_name).toBe('sdb');
      expect(sorted[2].device.device_name).toBe('sdc');
    });
  });

  describe('sort by age', () => {
    it('should sort devices by power on hours', () => {
      const devices = [
        createDeviceSummary('sda', 0, true, 5000),
        createDeviceSummary('sdb', 0, true, 1000),
        createDeviceSummary('sdc', 0, true, 10000),
      ];

      const sorted = sortDevices(devices, 'age');

      expect(sorted[0].device.device_name).toBe('sdb'); // 1000 hours
      expect(sorted[1].device.device_name).toBe('sda'); // 5000 hours
      expect(sorted[2].device.device_name).toBe('sdc'); // 10000 hours
    });

    it('should handle devices without smart data (0 hours)', () => {
      const devices = [
        createDeviceSummary('sda', 0, true, 5000),
        createDeviceSummary('sdb', 0, false), // no smart data
        createDeviceSummary('sdc', 0, true, 1000),
      ];

      const sorted = sortDevices(devices, 'age');

      expect(sorted[0].device.device_name).toBe('sdb'); // 0 hours (no smart)
      expect(sorted[1].device.device_name).toBe('sdc'); // 1000 hours
      expect(sorted[2].device.device_name).toBe('sda'); // 5000 hours
    });
  });

  describe('default sorting', () => {
    it('should default to status sorting for unknown sort type', () => {
      const devices = [
        createDeviceSummary('sda', 0, true),
        createDeviceSummary('sdb', 3, true),
      ];

      const sorted = sortDevices(devices, 'unknown');

      expect(sorted[0].device.device_name).toBe('sdb'); // failed first
    });
  });

  it('should not mutate the original array', () => {
    const devices = [
      createDeviceSummary('sdc', 0, true),
      createDeviceSummary('sda', 0, true),
    ];
    const originalFirst = devices[0];

    sortDevices(devices, 'title');

    expect(devices[0]).toBe(originalFirst);
  });
});
