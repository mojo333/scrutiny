// Metrics constants (give meaning to numeric values)

export const MetricsNotifyLevel = {
  Warn: 1,
  Fail: 2,
} as const;

export const MetricsStatusFilterAttributes = {
  All: 0,
  Critical: 1,
} as const;

export const MetricsStatusThreshold = {
  Smart: 1,
  Scrutiny: 2,
  Both: 3,
} as const;

// Type helpers for the constants
export type MetricsNotifyLevelValue = (typeof MetricsNotifyLevel)[keyof typeof MetricsNotifyLevel];
export type MetricsStatusFilterAttributesValue = (typeof MetricsStatusFilterAttributes)[keyof typeof MetricsStatusFilterAttributes];
export type MetricsStatusThresholdValue = (typeof MetricsStatusThreshold)[keyof typeof MetricsStatusThreshold];
