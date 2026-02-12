import type {DeviceModel} from './device-model';
import type {SmartTemperatureModel} from './measurements/smart-temperature-model';

// maps to webapp/backend/pkg/models/device_summary.go
export interface DeviceSummaryModel {
    device: DeviceModel;
    smart?: SmartSummary;
    temp_history?: SmartTemperatureModel[];
}

export interface SmartSummary {
    collector_date?: string,
    temp?: number
    power_on_hours?: number
}
