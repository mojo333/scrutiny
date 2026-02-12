import { useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useDeviceDetail } from '@/hooks/useDeviceDetail';
import { useAppConfig } from '@/hooks/useAppConfig';
import { Download, Settings } from 'lucide-react';
import { deviceTitleWithFallback } from '@/utils/device-title';
import { deviceStatusForModelWithThreshold } from '@/utils/device-status';
import { formatFileSize } from '@/utils/file-size';
import { formatTemperature } from '@/utils/temperature';
import { formatDeviceHours } from '@/utils/device-hours';
import { exportDeviceDetailToCSV, exportDeviceDetailToPDF } from '@/utils/export';
import { SmartAttributesTable } from '@/components/detail/SmartAttributesTable';
import { DetailSettingsDialog } from '@/components/detail/DetailSettingsDialog';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import type { SmartModel } from '@/models/measurements/smart-model';
import { MetricsStatusThreshold, type MetricsStatusThresholdValue } from '@/constants';
import { muteDevice, unmuteDevice, setDeviceLabel } from '@/api/device';
import { useQueryClient } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function DeviceDetail() {
  const params = useParams({ strict: false });
  const wwn = (params as { wwn: string }).wwn;
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useDeviceDetail(wwn);
  const { data: config } = useAppConfig();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !data?.success) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-red-500">Error loading device details</div>
      </div>
    );
  }

  const { device, smart_results } = data.data;
  const metadata = data.metadata;
  const latestSmart: SmartModel | undefined = smart_results?.[0];

  const deviceStatus = deviceStatusForModelWithThreshold(
    device,
    !!latestSmart,
    (config?.metrics?.status_threshold as MetricsStatusThresholdValue) || MetricsStatusThreshold.Both
  );

  const statusBgClass = deviceStatus === 'passed'
    ? 'bg-green-100 dark:bg-green-500 text-green-900 dark:text-gray-900 border-green-600'
    : deviceStatus === 'failed'
    ? 'bg-red-100 dark:bg-red-500 text-red-900 dark:text-gray-900 border-red-600'
    : 'bg-yellow-100 dark:bg-yellow-400 text-yellow-900 dark:text-gray-900 border-yellow-600';
  const statusDotClass = deviceStatus === 'passed' ? 'bg-green' : deviceStatus === 'failed' ? 'bg-red' : 'bg-yellow';

  const handleSaveSettings = async (muted: boolean, label: string) => {
    const promises: Promise<any>[] = [];

    // Update muted status if changed
    if (muted !== device.muted) {
      promises.push(muted ? muteDevice(wwn) : unmuteDevice(wwn));
    }

    // Update label if changed
    if (label !== device.label) {
      promises.push(setDeviceLabel(wwn, label));
    }

    if (promises.length > 0) {
      try {
        await Promise.all(promises);
        // Refetch device details to get updated data
        queryClient.invalidateQueries({ queryKey: ['device-detail', wwn] });
      } catch (error) {
        console.error('Error saving device settings:', error);
      }
    }
  };

  return (
    <div className="flex flex-col flex-auto w-full p-8 xs:p-2">
      <div className="flex flex-wrap w-full">
        {/* Header */}
        <div className="flex items-center justify-between w-full my-4 px-4 xs:pr-0">
          <div className="mr-6">
            <h2 className="m-0 font-bold flex items-center text-size-2rem">
              Drive Details - {deviceTitleWithFallback(device, config?.dashboard_display || 'name')}
              {device.muted && <span className="ml-2 text-base">🔕</span>}
            </h2>
            <div className="text-hint tracking-tight">Dive into S.M.A.R.T data</div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center px-4 py-2 border border-gray-600 rounded bg-transparent hover:opacity-80 xs:hidden ml-2 text-foreground">
                  <Download className="w-5 h-5 mr-2" />
                  <span>Export</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => config && exportDeviceDetailToCSV(device, smart_results || [], metadata || {}, config)}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => config && exportDeviceDetailToPDF(device, smart_results || [], metadata || {}, config)}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              className="flex items-center px-4 py-2 border border-gray-600 rounded bg-transparent hover:opacity-80 xs:hidden ml-2 text-foreground"
              onClick={() => setSettingsDialogOpen(true)}
            >
              <Settings className="w-5 h-5 mr-2 rotate-90 mirror" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Settings Dialog */}
        {settingsDialogOpen && (
          <DetailSettingsDialog
            onOpenChange={setSettingsDialogOpen}
            currentMuted={device.muted || false}
            currentLabel={device.label || ''}
            onSave={handleSaveSettings}
          />
        )}

        {/* Device Info Card (Left Sidebar) - 1/4 width */}
        <div className="flex flex-auto w-1/4 p-4 lt-md:w-full">
          <div className="flex flex-col flex-auto p-4 bg-card shadow-md rounded">
            <div className="grid grid-cols-2">
              {/* Status */}
              <div className="my-2 col-span-2 lt-md:col-span-1">
                <div>
                  <span className={`inline-flex items-center font-bold text-xs px-2 py-0.5 rounded-full tracking-wide uppercase border ${statusBgClass}`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${statusDotClass}`}></span>
                    <span className="leading-relaxed whitespace-nowrap">
                      {deviceStatus.charAt(0).toUpperCase() + deviceStatus.slice(1)}
                    </span>
                  </span>
                </div>
                <div className="text-hint text-size-md">Status</div>
              </div>

              {/* Host ID */}
              {device.host_id && (
                <div className="my-2 col-span-2 lt-md:col-span-1">
                  <div>{device.host_id}</div>
                  <div className="text-hint text-size-md">Host ID</div>
                </div>
              )}

              {/* Device UUID */}
              {device.device_uuid && (
                <div className="my-2 col-span-2 lt-md:col-span-1">
                  <div>{device.device_uuid}</div>
                  <div className="text-hint text-size-md">Device UUID</div>
                </div>
              )}

              {/* Device Label */}
              {device.device_label && (
                <div className="my-2 col-span-2 lt-md:col-span-1">
                  <div>{device.device_label}</div>
                  <div className="text-hint text-size-md">Device Label</div>
                </div>
              )}

              {/* Device Type */}
              {device.device_type && device.device_type !== 'ata' && device.device_type !== 'scsi' && (
                <div className="my-2 col-span-2 lt-md:col-span-1">
                  <div>{device.device_type.toUpperCase()}</div>
                  <div className="text-hint text-size-md">Device Type</div>
                </div>
              )}

              {/* Manufacturer/Model Family */}
              {device.manufacturer && (
                <div className="my-2 col-span-2 lt-md:col-span-1">
                  <div>{device.manufacturer}</div>
                  <div className="text-hint text-size-md">Model Family</div>
                </div>
              )}

              {/* Model Name */}
              <div className="my-2 col-span-2 lt-md:col-span-1">
                <div>{device.model_name}</div>
                <div className="text-hint text-size-md">Device Model</div>
              </div>

              {/* Serial Number */}
              <div className="my-2 col-span-2 lt-md:col-span-1">
                <div>{device.serial_number}</div>
                <div className="text-hint text-size-md">Serial Number</div>
              </div>

              {/* WWN */}
              <div className="my-2 col-span-2 lt-md:col-span-1">
                <div>{device.wwn}</div>
                <div className="text-hint text-size-md">LU WWN Device Id</div>
              </div>

              {/* Firmware */}
              <div className="my-2 col-span-2 lt-md:col-span-1">
                <div>{device.firmware}</div>
                <div className="text-hint text-size-md">Firmware Version</div>
              </div>

              {/* Capacity */}
              <div className="my-2 col-span-2 lt-md:col-span-1">
                <div>{formatFileSize(device.capacity, config?.file_size_si_units || false)}</div>
                <div className="text-hint text-size-md">Capacity</div>
              </div>

              {/* Rotation Speed */}
              {device.rotational_speed && (
                <div className="my-2 col-span-2 lt-md:col-span-1">
                  <div>{device.rotational_speed} RPM</div>
                  <div className="text-hint text-size-md">Rotation Rate</div>
                </div>
              )}

              {/* Protocol */}
              {device.device_protocol && (
                <div className="my-2 col-span-2 lt-md:col-span-1">
                  <div>{device.device_protocol}</div>
                  <div className="text-hint text-size-md">Protocol</div>
                </div>
              )}

              {/* Power Cycle Count */}
              <div className="my-2 col-span-2 lt-md:col-span-1">
                <div>{latestSmart?.power_cycle_count}</div>
                <div className="text-hint text-size-md">Power Cycle Count</div>
              </div>

              {/* Powered On */}
              {latestSmart?.power_on_hours && (
                <div className="my-2 col-span-2 lt-md:col-span-1">
                  <div>
                    {formatDeviceHours(latestSmart.power_on_hours, (config?.powered_on_hours_unit as any) || 'humanize', {
                      round: true,
                      largest: 1,
                      units: ['y', 'd', 'h']
                    })}
                  </div>
                  <div className="text-hint text-size-md">Powered On</div>
                </div>
              )}

              {/* Temperature */}
              <div className="my-2 col-span-2 lt-md:col-span-1">
                <div>{formatTemperature(latestSmart?.temp || 0, config?.temperature_unit || 'celsius', true)}</div>
                <div className="text-hint text-size-md">Temperature</div>
              </div>
            </div>
          </div>
        </div>

        {/* S.M.A.R.T Attributes Table (Right Main Area) - 3/4 width */}
        <div className="flex flex-auto w-3/4 p-4 lt-md:w-full">
          <SmartAttributesTable
            device={device}
            smartResults={smart_results}
            metadata={metadata}
          />
        </div>
      </div>
    </div>
  );
}
