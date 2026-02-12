import type {DeviceModel} from './device-model';
import type {SmartModel} from './measurements/smart-model';
import type {AttributeMetadataModel} from './thresholds/attribute-metadata-model';
import type {ApiError} from '@/types/api';

// maps to webapp/backend/pkg/models/device_summary.go
export interface DeviceDetailsResponseWrapper {
    success: boolean;
    errors?: ApiError[];
    data: {
        device: DeviceModel;
        smart_results: SmartModel[];
    },
    metadata: { [key: string]: AttributeMetadataModel } | { [key: number]: AttributeMetadataModel };
}
