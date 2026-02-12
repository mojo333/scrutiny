import { describe, it, expect } from 'vitest';
import { deviceStatusForModelWithThreshold } from '@/utils/device-status';
import { MetricsStatusThreshold } from '@/constants';
import type { DeviceModel } from '@/models/device-model';

describe('deviceStatusForModelWithThreshold', () => {
  it('if healthy device, should be passing', () => {
    expect(
      deviceStatusForModelWithThreshold(
        { device_status: 0 } as DeviceModel,
        true,
        MetricsStatusThreshold.Both
      )
    ).toBe('passed');
  });

  it('if device with no smart data, should be unknown', () => {
    expect(
      deviceStatusForModelWithThreshold(
        { device_status: 0 } as DeviceModel,
        false,
        MetricsStatusThreshold.Both
      )
    ).toBe('unknown');
  });

  describe('status thresholds', () => {
    const testCases = [
      {
        deviceStatus: 10000, // invalid status
        hasSmartResults: false,
        threshold: MetricsStatusThreshold.Smart,
        includeReason: false,
        result: 'unknown',
      },
      // Device status 1 (FailedSmart)
      {
        deviceStatus: 1,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Smart,
        includeReason: false,
        result: 'failed',
      },
      {
        deviceStatus: 1,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Scrutiny,
        includeReason: false,
        result: 'passed',
      },
      {
        deviceStatus: 1,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Both,
        includeReason: false,
        result: 'failed',
      },
      // Device status 2 (FailedScrutiny)
      {
        deviceStatus: 2,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Smart,
        includeReason: false,
        result: 'passed',
      },
      {
        deviceStatus: 2,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Scrutiny,
        includeReason: false,
        result: 'failed',
      },
      {
        deviceStatus: 2,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Both,
        includeReason: false,
        result: 'failed',
      },
      // Device status 3 (FailedBoth)
      {
        deviceStatus: 3,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Smart,
        includeReason: false,
        result: 'failed',
      },
      {
        deviceStatus: 3,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Scrutiny,
        includeReason: false,
        result: 'failed',
      },
      {
        deviceStatus: 3,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Both,
        includeReason: false,
        result: 'failed',
      },
      // With reason included
      {
        deviceStatus: 3,
        hasSmartResults: false,
        threshold: MetricsStatusThreshold.Smart,
        includeReason: true,
        result: 'unknown',
      },
      {
        deviceStatus: 3,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Smart,
        includeReason: true,
        result: 'failed: smart',
      },
      {
        deviceStatus: 3,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Scrutiny,
        includeReason: true,
        result: 'failed: scrutiny',
      },
      {
        deviceStatus: 3,
        hasSmartResults: true,
        threshold: MetricsStatusThreshold.Both,
        includeReason: true,
        result: 'failed: both',
      },
    ];

    testCases.forEach((test, index) => {
      it(`if device with status (${test.deviceStatus}), hasSmartResults(${test.hasSmartResults}) and threshold (${test.threshold}), should be ${test.result} (testcase: ${index + 1})`, () => {
        expect(
          deviceStatusForModelWithThreshold(
            { device_status: test.deviceStatus } as DeviceModel,
            test.hasSmartResults,
            test.threshold,
            test.includeReason
          )
        ).toBe(test.result);
      });
    });
  });
});
