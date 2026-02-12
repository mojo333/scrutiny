import { describe, it, expect } from 'vitest';
import { formatFileSize } from '@/utils/file-size';

describe('formatFileSize', () => {
  describe('binary units (si = false)', () => {
    const testCases = [
      { bytes: 1500, si: false, result: '1.5 KiB' },
      { bytes: 5000, si: false, result: '4.9 KiB' },
      { bytes: 999_949, si: false, result: '976.5 KiB' },
      { bytes: 1_551_859_712, si: false, result: '1.4 GiB' },
      { bytes: 2_100_000_000, si: false, result: '2.0 GiB' },
    ];

    testCases.forEach((test, index) => {
      it(`should correctly format ${test.bytes} bytes (testcase: ${index + 1})`, () => {
        const formatted = formatFileSize(test.bytes, test.si);
        expect(formatted).toEqual(test.result);
      });
    });
  });

  describe('SI units (si = true)', () => {
    const testCases = [
      { bytes: 1500, si: true, result: '1.5 kB' },
      { bytes: 5000, si: true, result: '5.0 kB' },
      { bytes: 999_949, si: true, result: '999.9 kB' },
      { bytes: 999_950, si: true, result: '1.0 MB' },
      { bytes: 2_100_000_000, si: true, result: '2.1 GB' },
    ];

    testCases.forEach((test, index) => {
      it(`should correctly format ${test.bytes} bytes (testcase: ${index + 1})`, () => {
        const formatted = formatFileSize(test.bytes, test.si);
        expect(formatted).toEqual(test.result);
      });
    });
  });

  describe('edge cases', () => {
    it('should return "0 B" for 0 bytes', () => {
      expect(formatFileSize(0)).toEqual('0 B');
    });

    it('should handle undefined by defaulting to 0', () => {
      expect(formatFileSize(undefined)).toEqual('0 B');
    });

    it('should handle small byte values', () => {
      expect(formatFileSize(500, false)).toEqual('500 B');
      expect(formatFileSize(500, true)).toEqual('500 B');
    });
  });
});
