import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useDashboardSummary, useDashboardSummaryTemp } from '@/hooks/useDashboard';
import { useAppConfig } from '@/hooks/useAppConfig';
import type { DeviceSummaryModel } from '@/models/device-summary-model';
import { DeviceCard } from '@/components/dashboard/DeviceCard';
import { TemperatureChart } from '@/components/dashboard/TemperatureChart';
import { DashboardSettingsDialog } from '@/components/dashboard/DashboardSettingsDialog';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { deviceTitleWithFallback } from '@/utils/device-title';
import { sortDevices } from '@/utils/device-sort';
import { exportToCSV, exportToPDF } from '@/utils/export';
import { Archive, Download, Settings2, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { saveSettings, type AppConfig } from '@/api/settings';
import { useQueryClient } from '@tanstack/react-query';
import type { DurationKey } from '@/types/settings';

export function Dashboard() {
  const [showArchived, setShowArchived] = useState(false);
  const [tempDurationKey, setTempDurationKey] = useState<DurationKey>('forever');
  const [lineStroke, setLineStroke] = useState<'smooth' | 'straight' | 'stepline'>('smooth');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [visibleDevices, setVisibleDevices] = useState<Set<string>>(new Set());
  const { data: config } = useAppConfig();
  const queryClient = useQueryClient();

  // Initialize lineStroke from config
  useEffect(() => {
    if (config?.line_stroke) {
      setLineStroke(config.line_stroke);
    }
  }, [config?.line_stroke]);

  const { data: summaryData, isLoading, isError } = useDashboardSummary();
  const { data: tempHistoryData } = useDashboardSummaryTemp(tempDurationKey);

  // Merge temperature history data with summary data
  const mergedSummaryData = useMemo(() => {
    if (!summaryData) return summaryData;
    if (!tempHistoryData) return summaryData;

    const merged = { ...summaryData };
    for (const wwn in merged) {
      if (tempHistoryData[wwn]) {
        merged[wwn] = {
          ...merged[wwn],
          temp_history: tempHistoryData[wwn],
        };
      }
    }
    return merged;
  }, [summaryData, tempHistoryData]);

  // Initialize visible devices when data loads
  useEffect(() => {
    if (mergedSummaryData && visibleDevices.size === 0) {
      const allDevices = new Set(Object.keys(mergedSummaryData));
      setVisibleDevices(allDevices);
    }
  }, [mergedSummaryData]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-screen text-red">
        Error loading dashboard.
      </div>
    );
  }

  // Group devices by host_id
  const hostGroups = Object.values(mergedSummaryData || {}).reduce((acc, deviceSummary) => {
    const hostId = deviceSummary.device.host_id || '';
    if (!acc[hostId]) {
      acc[hostId] = [];
    }
    acc[hostId].push(deviceSummary);
    return acc;
  }, {} as { [key: string]: DeviceSummaryModel[] });

  const handleSaveSettings = async (newSettings: Partial<AppConfig>) => {
    try {
      await saveSettings(newSettings);
      await queryClient.invalidateQueries({ queryKey: ['app-config'] });
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    }
  };

  return (
    <div className="flex flex-col flex-auto w-full p-8 xs:p-2">
      <div className="flex flex-wrap w-full">
        {/* Header */}
        <div className="flex items-center justify-between w-full my-4 px-4 xs:pr-0">
          <div className="mr-6">
            <h2 className="m-0 text-4xl font-bold">Dashboard</h2>
            <div className="text-hint tracking-tight">Drive health at a glance</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`flex items-center px-4 py-2 border rounded xs:hidden ${
                showArchived
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-transparent border-gray-300 dark:border-gray-600'
              } hover:opacity-80`}
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="w-5 h-5 mr-2" />
              <span>Archived</span>
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent hover:opacity-80 xs:hidden">
                  <Download className="w-5 h-5 mr-2" />
                  <span>Export</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => mergedSummaryData && config && exportToCSV(mergedSummaryData, config)}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => mergedSummaryData && config && exportToPDF(mergedSummaryData, config)}>
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-transparent hover:opacity-80 xs:hidden"
              onClick={() => setSettingsDialogOpen(true)}
            >
              <Settings2 className="w-5 h-5 mr-2" />
              <span>Settings</span>
            </button>
          </div>
        </div>

        {/* Settings Dialog */}
        {settingsDialogOpen && (
          <DashboardSettingsDialog
            onOpenChange={setSettingsDialogOpen}
            currentConfig={config}
            onSave={handleSaveSettings}
          />
        )}

        {/* Device Cards grouped by host */}
        {Object.entries(hostGroups).map(([hostId, deviceSummaries]) => {
          // Filter out archived devices if not showing them
          const filteredDevices = showArchived
            ? deviceSummaries
            : deviceSummaries.filter(ds => !ds.device.archived);

          // Don't render host group if no visible devices
          if (filteredDevices.length === 0) return null;

          // Sort devices according to config
          const sortedDevices = sortDevices(
            filteredDevices,
            config?.dashboard_sort || 'status',
            config?.dashboard_display || 'name'
          );

          return (
            <div key={hostId || 'no-host'} className="flex flex-wrap w-full">
              {hostId && <h3 className="ml-4 w-full text-2xl font-bold mb-0 mt-2">{hostId}</h3>}
              <div className="flex flex-wrap w-full">
                {sortedDevices.map((deviceSummary) => (
                  <div key={deviceSummary.device.wwn} className="flex gt-sm:w-1/2 min-w-80 p-4">
                    <DeviceCard
                      deviceSummary={deviceSummary}
                      config={config}
                      showArchived={showArchived}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Drive Temperatures Chart */}
        <div className="flex flex-auto w-full min-w-80 h-90 p-4">
          <div className="flex flex-col flex-auto bg-card shadow-md rounded overflow-hidden">
            <div className="flex flex-col p-6 pr-4 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="font-bold text-md text-secondary uppercase tracking-wider mr-4">Temperature</div>
                  <div className="text-sm text-hint font-medium">Temperature history for each device</div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Device Selection Control */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-sm"
                      >
                        <ListFilter className="w-4 h-4 mr-1" />
                        Devices ({visibleDevices.size})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[450px] max-h-96 overflow-y-auto">
                      <DropdownMenuLabel>Show/Hide Devices</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => {
                          const allDevices = new Set(Object.keys(mergedSummaryData || {}));
                          setVisibleDevices(allDevices);
                        }}
                      >
                        Show All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => setVisibleDevices(new Set())}
                      >
                        Hide All
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {mergedSummaryData && Object.entries(mergedSummaryData).map(([wwn, deviceSummary]) => {
                        const deviceName = deviceTitleWithFallback(
                          deviceSummary.device,
                          config?.dashboard_display || 'name'
                        );
                        return (
                          <DropdownMenuCheckboxItem
                            key={wwn}
                            checked={visibleDevices.has(wwn)}
                            onSelect={(e) => e.preventDefault()}
                            onCheckedChange={(checked) => {
                              const newVisible = new Set(visibleDevices);
                              if (checked) {
                                newVisible.add(wwn);
                              } else {
                                newVisible.delete(wwn);
                              }
                              setVisibleDevices(newVisible);
                            }}
                            title={deviceName}
                          >
                            <span className="truncate flex-1">{deviceName}</span>
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Line Stroke Control */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-sm capitalize"
                      >
                        {lineStroke}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLineStroke('smooth')}>
                        Smooth
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLineStroke('straight')}>
                        Straight
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLineStroke('stepline')}>
                        Stepline
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Duration Control */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-sm capitalize"
                      >
                        {tempDurationKey}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setTempDurationKey('forever')}>
                        Forever
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTempDurationKey('year')}>
                        Year
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTempDurationKey('month')}>
                        Month
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTempDurationKey('week')}>
                        Week
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setTempDurationKey('day')}>
                        Day
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
            <div className="flex flex-col flex-auto">
              <div className="flex-auto w-full h-full">
                {mergedSummaryData && (
                  <TemperatureChart
                    deviceSummaries={mergedSummaryData}
                    temperatureUnit={config?.temperature_unit || 'celsius'}
                    dashboardDisplay={config?.dashboard_display || 'name'}
                    lineStroke={lineStroke}
                    visibleDevices={visibleDevices}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
