// Device and Attribute Status Constants (from backend Constants.go)
// These must match the backend constants

// Device Status
export const DeviceStatus = {
  Passed: 0,
  FailedSmart: 1,
  FailedScrutiny: 2,
  FailedBoth: 3,
} as const;

// Attribute Status
export const AttributeStatus = {
  Passed: 0,
  FailedSmart: 1,
  WarningScrutiny: 2,
  FailedScrutiny: 4,
} as const;

// Type helpers for the constants
export type DeviceStatusValue = (typeof DeviceStatus)[keyof typeof DeviceStatus];
export type AttributeStatusValue = (typeof AttributeStatus)[keyof typeof AttributeStatus];
