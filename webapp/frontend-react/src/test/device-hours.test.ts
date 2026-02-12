import { describe, it, expect } from 'vitest';
import { formatDeviceHours } from '@/utils/device-hours';

describe('formatDeviceHours', () => {
  describe('device_hours unit', () => {
    it('should return hours as-is with "hours" suffix', () => {
      expect(formatDeviceHours(12345, 'device_hours')).toEqual('12345 hours');
    });

    it('should return "Unknown" for null hours', () => {
      expect(formatDeviceHours(null, 'device_hours')).toEqual('Unknown');
    });
  });

  describe('humanize unit', () => {
    it('should return "Unknown" for null hours', () => {
      expect(formatDeviceHours(null, 'humanize')).toEqual('Unknown');
    });

    it('should humanize hours correctly', () => {
      // 48 hours = 2 days
      const result = formatDeviceHours(48, 'humanize');
      expect(result).toContain('2');
      expect(result).toContain('day');
    });

    it('should humanize 168 hours to 1 week', () => {
      const result = formatDeviceHours(168, 'humanize');
      expect(result).toContain('1');
      expect(result).toContain('week');
    });

    it('should humanize large durations', () => {
      // 15273 hours ≈ 1.74 years
      const result = formatDeviceHours(15273, 'humanize');
      expect(result).toContain('year');
      expect(result).toContain('month');
    });
  });

  describe('with custom humanize config', () => {
    it('should respect humanize configuration', () => {
      const result = formatDeviceHours(168, 'humanize', { units: ['w'] });
      expect(result).toEqual('1 week');
    });

    it('should support largest unit only', () => {
      const result = formatDeviceHours(15273, 'humanize', { largest: 1 });
      expect(result).toContain('year');
      expect(result).not.toContain('month');
    });
  });
});
