import type {SmartTemperatureModel} from './measurements/smart-temperature-model';
import type {ApiError} from '@/types/api';

export interface DeviceSummaryTempResponseWrapper {
    success: boolean;
    errors?: ApiError[];
    data: {
        temp_history: { [key: string]: SmartTemperatureModel[]; }
    }
}
