// Settings type definitions

// UI Setting types (self-documenting strings)
export type ThemeMode = 'light' | 'dark' | 'system';
export type DashboardDisplay = 'name' | 'serial_number' | 'uuid';
export type DashboardSort = 'status' | 'name' | 'age';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type LineStroke = 'smooth' | 'straight' | 'stepline';
export type PoweredOnHoursUnit = 'humanize' | 'device_hours';

// Dashboard Duration Keys
export type DurationKey = 'forever' | 'year' | 'month' | 'week' | 'day';

// App configuration interface
export interface AppConfig {
  version: string;
  commit?: string;
  date?: string;
  dashboard_display: DashboardDisplay;
  dashboard_sort: DashboardSort;
  temperature_unit: TemperatureUnit;
  file_size_si_units: boolean;
  powered_on_hours_unit: string | string[];
  line_stroke?: LineStroke;
  theme: ThemeMode;
  metrics?: {
    status_threshold: number;
    status_filter_attributes: number;
    notify_level: number;
    repeat_notifications: boolean;
  };
  collector?: {
    retrieve_sct_temperature_history?: boolean;
  };
}
