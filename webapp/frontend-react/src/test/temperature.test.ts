import { describe, it, expect } from 'vitest';
import { celsiusToFahrenheit, formatTemperature } from '@/utils/temperature';

describe('celsiusToFahrenheit', () => {
  const testCases = [
    { c: -273.15, f: -459.67 },
    { c: -40, f: -40 }, // Same in both scales
    { c: 0, f: 32 },
    { c: 10, f: 50 },
    { c: 37, f: 98.6 },
    { c: 100, f: 212 },
  ];

  testCases.forEach((test, index) => {
    it(`should correctly convert ${test.c}°C to Fahrenheit (testcase: ${index + 1})`, () => {
      const result = celsiusToFahrenheit(test.c);
      expect(result).toBeCloseTo(test.f, 1);
    });
  });
});

describe('formatTemperature', () => {
  describe('celsius unit', () => {
    it('should format temperature in Celsius with units', () => {
      const result = formatTemperature(27, 'celsius', true);
      expect(result).toEqual('27°C');
    });

    it('should format temperature in Celsius without units', () => {
      const result = formatTemperature(27, 'celsius', false);
      expect(result).toEqual(27);
    });

    it('should round decimal temperatures', () => {
      const result = formatTemperature(26.67, 'celsius', true);
      expect(result).toEqual('27°C');
    });
  });

  describe('fahrenheit unit', () => {
    it('should convert and format temperature in Fahrenheit with units', () => {
      // 27°C = 80.6°F, rounds to 81°F
      const result = formatTemperature(27, 'fahrenheit', true);
      expect(result).toEqual('81°F');
    });

    it('should convert and format temperature in Fahrenheit without units', () => {
      // 27°C = 80.6°F, rounds to 81
      const result = formatTemperature(27, 'fahrenheit', false);
      expect(result).toEqual(81);
    });

    it('should convert 0°C to 32°F', () => {
      const result = formatTemperature(0, 'fahrenheit', true);
      expect(result).toEqual('32°F');
    });

    it('should convert 100°C to 212°F', () => {
      const result = formatTemperature(100, 'fahrenheit', true);
      expect(result).toEqual('212°F');
    });
  });

  describe('default behavior', () => {
    it('should default to celsius for unknown unit', () => {
      const result = formatTemperature(27, 'unknown', true);
      expect(result).toEqual('27°C');
    });
  });
});
