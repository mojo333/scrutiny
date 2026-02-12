/**
 * Common API response error structure
 */
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Chart data point for ApexCharts
 */
export interface ChartDataPoint {
  x: Date | number | string;
  y: number | null;
  strokeColor?: string;
  fillColor?: string;
}

/**
 * Chart series data for ApexCharts
 */
export interface ChartSeries {
  name: string;
  data: ChartDataPoint[];
}
