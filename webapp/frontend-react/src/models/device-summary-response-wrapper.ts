import type {DeviceSummaryModel} from './device-summary-model';
import type {ApiError} from '@/types/api';

// maps to webapp/backend/pkg/models/device_summary.go
export interface DeviceSummaryResponseWrapper {
    success: boolean;
    errors?: ApiError[];
    data: {
        summary: { [key: string]: DeviceSummaryModel }
    }
}
