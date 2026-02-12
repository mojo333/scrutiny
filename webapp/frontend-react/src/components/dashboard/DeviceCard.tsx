import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import type { DeviceSummaryModel } from '@/models/device-summary-model';
import { deviceStatusForModelWithThreshold } from '@/utils/device-status';
import { formatFileSize } from '@/utils/file-size';
import { formatTemperature } from '@/utils/temperature';
import { formatDeviceHours } from '@/utils/device-hours';
import { deviceTitleWithFallback } from '@/utils/device-title';
import { MetricsStatusThreshold, type MetricsStatusThresholdValue } from '@/constants';
import { CheckCircle, XCircle, HelpCircle, MoreVertical, Archive, Settings, ArchiveRestore, Trash2, Bell, BellOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DetailSettingsDialog } from '@/components/detail/DetailSettingsDialog';
import { muteDevice, unmuteDevice, archiveDevice, unarchiveDevice, deleteDevice, setDeviceLabel } from '@/api/device';
import { useQueryClient } from '@tanstack/react-query';
import type { AppConfig } from '@/api/settings';

interface DeviceCardProps {
  deviceSummary: DeviceSummaryModel;
  config: AppConfig | undefined;
  showArchived: boolean;
}

export function DeviceCard({ deviceSummary, config, showArchived }: DeviceCardProps) {
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const status = deviceStatusForModelWithThreshold(
    deviceSummary.device,
    !!deviceSummary.smart,
    (config?.metrics?.status_threshold as MetricsStatusThresholdValue) || MetricsStatusThreshold.Both
  );

  const handleSaveSettings = async (muted: boolean, label: string) => {
    const promises: Promise<any>[] = [];

    // Update muted status if changed
    if (muted !== deviceSummary.device.muted) {
      promises.push(muted ? muteDevice(deviceSummary.device.wwn) : unmuteDevice(deviceSummary.device.wwn));
    }

    // Update label if changed
    if (label !== deviceSummary.device.label) {
      promises.push(setDeviceLabel(deviceSummary.device.wwn, label));
    }

    if (promises.length > 0) {
      try {
        await Promise.all(promises);
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
        toast.success('Device settings updated');
      } catch (error) {
        console.error('Error saving device settings:', error);
        toast.error('Failed to update device settings');
      }
    }
  };

  const handleMuteToggle = async () => {
    try {
      if (deviceSummary.device.muted) {
        await unmuteDevice(deviceSummary.device.wwn);
        toast.success('Device unmuted');
      } else {
        await muteDevice(deviceSummary.device.wwn);
        toast.success('Device muted');
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    } catch (error) {
      console.error('Error toggling mute:', error);
      toast.error('Failed to toggle mute');
    }
  };

  const handleArchiveToggle = async () => {
    try {
      if (deviceSummary.device.archived) {
        await unarchiveDevice(deviceSummary.device.wwn);
        toast.success('Device unarchived');
      } else {
        await archiveDevice(deviceSummary.device.wwn);
        toast.success('Device archived');
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    } catch (error) {
      console.error('Error toggling archive:', error);
      toast.error('Failed to toggle archive');
    }
  };

  const handleDelete = async () => {
    const deviceName = deviceTitleWithFallback(deviceSummary.device, config?.dashboard_display || 'name');

    if (!confirm(`Are you sure you want to delete ${deviceName}?\n\nThis action cannot be undone.`)) {
      return;
    }

    toast.promise(
      deleteDevice(deviceSummary.device.wwn).then(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
      }),
      {
        loading: 'Deleting device...',
        success: `${deviceName} deleted successfully`,
        error: 'Failed to delete device',
      }
    );
  };

  if (!showArchived && deviceSummary.device.archived) {
    return null;
  }

  const borderColor = status === 'passed' ? 'border-green' : status === 'failed' ? 'border-red' : 'border-yellow';
  const iconColor = status === 'passed' ? 'text-green' : status === 'failed' ? 'text-red' : 'text-yellow';
  const IconComponent = status === 'passed' ? CheckCircle : status === 'failed' ? XCircle : HelpCircle;

  return (
    <div
      className={`relative flex flex-col flex-auto p-6 pr-3 pb-3 bg-card rounded border-l-4 ${borderColor} shadow-md overflow-hidden ${
        deviceSummary.device.archived ? 'text-disabled' : ''
      }`}
    >
      {/* Large background icon - exact positioning from Angular */}
      <div className="absolute bottom-0 right-0 w-24 h-24 -m-6">
        <IconComponent className={`w-24 h-24 opacity-12 ${iconColor}`} strokeWidth={2} />
      </div>

      {/* Header */}
      <div className="flex items-center">
        <div className="flex flex-col">
          <Link
            to="/device/$wwn"
            params={{ wwn: deviceSummary.device.wwn }}
            className="font-bold uppercase tracking-wider no-underline hover:underline text-size-md text-cool-gray-400"
          >
            {deviceTitleWithFallback(deviceSummary.device, config?.dashboard_display || 'name')}
            {deviceSummary.device.muted && (
              <span className="inline-block ml-1 align-middle text-base">
                🔕
              </span>
            )}
          </Link>
          {deviceSummary.smart?.collector_date && (
            <div
              className={`font-medium text-size-sm ${status === 'passed' ? 'text-green-400' : status === 'failed' ? 'text-red-400' : 'text-hint'}`}
            >
              Last Updated on {new Date(deviceSummary.smart.collector_date).toLocaleString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
        <div className="ml-auto flex items-center">
          {deviceSummary.device.archived && (
            <Archive className="w-5 h-5 mr-2 text-hint" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:bg-gray-700 rounded">
                <MoreVertical className="w-5 h-5 text-hint" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSettingsDialogOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                <span>Settings</span>
              </DropdownMenuItem>
              {deviceSummary.device.muted ? (
                <DropdownMenuItem onClick={handleMuteToggle}>
                  <Bell className="w-4 h-4 mr-2" />
                  <span>Unmute</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleMuteToggle}>
                  <BellOff className="w-4 h-4 mr-2" />
                  <span>Mute</span>
                </DropdownMenuItem>
              )}
              {deviceSummary.device.archived ? (
                <DropdownMenuItem onClick={handleArchiveToggle}>
                  <ArchiveRestore className="w-4 h-4 mr-2" />
                  <span>Unarchive</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchiveToggle}>
                  <Archive className="w-4 h-4 mr-2" />
                  <span>Archive</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-400" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Settings Dialog */}
          {settingsDialogOpen && (
            <DetailSettingsDialog
              onOpenChange={setSettingsDialogOpen}
              currentMuted={deviceSummary.device.muted || false}
              currentLabel={deviceSummary.device.label || ''}
              onSave={handleSaveSettings}
            />
          )}
        </div>
      </div>

      {/* Stats - matching Angular's exact spacing */}
      <div className="flex flex-row flex-wrap mt-4 -mx-6">
        <div className="flex flex-col mx-6 my-3 xs:w-full">
          <div className="font-semibold text-hint uppercase tracking-wider leading-none text-size-xs">Status</div>
          <div className="mt-2 font-medium leading-none text-size-3xl">
            {deviceSummary.smart?.collector_date
              ? status.charAt(0).toUpperCase() + status.slice(1)
              : 'No Data'}
          </div>
        </div>

        <div className="flex flex-col mx-6 my-3 xs:w-full">
          <div className="font-semibold text-hint uppercase tracking-wider leading-none text-size-xs">Temperature</div>
          <div className="mt-2 font-medium leading-none text-size-3xl">
            {deviceSummary.smart?.collector_date && deviceSummary.smart?.temp !== undefined
              ? formatTemperature(deviceSummary.smart.temp, config?.temperature_unit || 'celsius', true)
              : '--'}
          </div>
        </div>

        <div className="flex flex-col mx-6 my-3 xs:w-full">
          <div className="font-semibold text-hint uppercase tracking-wider leading-none text-size-xs">Capacity</div>
          <div className="mt-2 font-medium leading-none text-size-3xl">
            {formatFileSize(deviceSummary.device.capacity, config?.file_size_si_units)}
          </div>
        </div>

        <div className="flex flex-col mx-6 my-3 xs:w-full">
          <div className="font-semibold text-hint uppercase tracking-wider leading-none text-size-xs">Powered On</div>
          <div className="mt-2 font-medium leading-none text-size-3xl">
            {deviceSummary.smart?.power_on_hours
              ? formatDeviceHours(deviceSummary.smart.power_on_hours, (config?.powered_on_hours_unit as string) || 'humanize', {
                  round: true,
                  largest: 1,
                  units: ['y', 'd', 'h']
                })
              : '--'}
          </div>
        </div>
      </div>
    </div>
  );
}
