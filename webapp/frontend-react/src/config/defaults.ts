import type {
  ThemeMode,
  DashboardDisplay,
  DashboardSort,
  TemperatureUnit,
  LineStroke,
  PoweredOnHoursUnit,
} from '@/types/settings';
import {
  MetricsNotifyLevel,
  MetricsStatusFilterAttributes,
  MetricsStatusThreshold,
} from '@/constants/metrics';

// Strongly-typed defaults with all fields required
export interface AppConfigDefaults {
  theme: ThemeMode;
  dashboard_display: DashboardDisplay;
  dashboard_sort: DashboardSort;
  temperature_unit: TemperatureUnit;
  file_size_si_units: boolean;
  powered_on_hours_unit: PoweredOnHoursUnit;
  line_stroke: LineStroke;
  metrics: {
    status_threshold: number;
    status_filter_attributes: number;
    notify_level: number;
    repeat_notifications: boolean;
  };
  collector: {
    retrieve_sct_temperature_history: boolean;
  };
}

// Default values for all settings
export const AppConfigDefaults: AppConfigDefaults = {
  theme: 'dark',
  dashboard_display: 'name',
  dashboard_sort: 'status',
  temperature_unit: 'celsius',
  file_size_si_units: false,
  powered_on_hours_unit: 'humanize',
  line_stroke: 'smooth',
  metrics: {
    status_threshold: MetricsStatusThreshold.Both,
    status_filter_attributes: MetricsStatusFilterAttributes.All,
    notify_level: MetricsNotifyLevel.Fail,
    repeat_notifications: true,
  },
  collector: {
    retrieve_sct_temperature_history: false,
  },
};
