import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AppConfig, ThemeMode, DashboardDisplay, DashboardSort, TemperatureUnit } from '@/types/settings';
import { AppConfigDefaults } from '@/config/defaults';

interface DashboardSettingsDialogProps {
  onOpenChange: (open: boolean) => void;
  currentConfig: AppConfig | undefined;
  onSave: (config: Partial<AppConfig>) => void;
}

export function DashboardSettingsDialog({
  onOpenChange,
  currentConfig,
  onSave,
}: DashboardSettingsDialogProps) {
  const poweredValue = Array.isArray(currentConfig?.powered_on_hours_unit)
    ? AppConfigDefaults.powered_on_hours_unit
    : (currentConfig?.powered_on_hours_unit || AppConfigDefaults.powered_on_hours_unit);

  const [settings, setSettings] = useState({
    theme: (currentConfig?.theme || AppConfigDefaults.theme) as ThemeMode,
    dashboard_display: (currentConfig?.dashboard_display || AppConfigDefaults.dashboard_display) as DashboardDisplay,
    dashboard_sort: (currentConfig?.dashboard_sort || AppConfigDefaults.dashboard_sort) as DashboardSort,
    temperature_unit: (currentConfig?.temperature_unit || AppConfigDefaults.temperature_unit) as TemperatureUnit,
    file_size_si_units: currentConfig?.file_size_si_units ?? AppConfigDefaults.file_size_si_units,
    powered_on_hours_unit: poweredValue,
    status_threshold: currentConfig?.metrics?.status_threshold ?? AppConfigDefaults.metrics.status_threshold,
    status_filter_attributes: currentConfig?.metrics?.status_filter_attributes ?? AppConfigDefaults.metrics.status_filter_attributes,
    notify_level: currentConfig?.metrics?.notify_level ?? AppConfigDefaults.metrics.notify_level,
    repeat_notifications: currentConfig?.metrics?.repeat_notifications ?? AppConfigDefaults.metrics.repeat_notifications,
    retrieve_sct_temperature_history: currentConfig?.collector?.retrieve_sct_temperature_history ?? AppConfigDefaults.collector.retrieve_sct_temperature_history,
  });

  const handleSave = () => {
    onSave({
      theme: settings.theme,
      dashboard_display: settings.dashboard_display,
      dashboard_sort: settings.dashboard_sort,
      temperature_unit: settings.temperature_unit,
      file_size_si_units: settings.file_size_si_units,
      powered_on_hours_unit: settings.powered_on_hours_unit,
      metrics: {
        status_threshold: settings.status_threshold,
        status_filter_attributes: settings.status_filter_attributes,
        notify_level: settings.notify_level,
        repeat_notifications: settings.repeat_notifications,
      },
      collector: {
        retrieve_sct_temperature_history: settings.retrieve_sct_temperature_history,
      },
    });
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scrutiny Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0 p-8 pb-0 overflow-hidden">
          {/* Row 1: Dark Mode (full width) */}
          <div className="flex flex-col mt-5 md:flex-row">
            <div className="flex-auto md:pr-3">
              <Label htmlFor="theme" className="settings-label">Dark Mode</Label>
              <Select value={settings.theme} onValueChange={(val) => setSettings(prev => ({ ...prev, theme: val as ThemeMode }))}>
                <SelectTrigger id="theme" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Display Title & Sort By */}
          <div className="flex flex-col mt-5 md:flex-row">
            <div className="flex-auto md:pr-3">
              <Label htmlFor="display" className="settings-label">Display Title</Label>
              <Select value={settings.dashboard_display} onValueChange={(val) => setSettings(prev => ({ ...prev, dashboard_display: val as DashboardDisplay }))}>
                <SelectTrigger id="display" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="serial_number">Serial ID</SelectItem>
                  <SelectItem value="uuid">UUID</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-auto md:pl-3">
              <Label htmlFor="sort" className="settings-label">Sort By</Label>
              <Select value={settings.dashboard_sort} onValueChange={(val) => setSettings(prev => ({ ...prev, dashboard_sort: val as DashboardSort }))}>
                <SelectTrigger id="sort" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="age">Age</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Temperature & File Size */}
          <div className="flex flex-col mt-5 md:flex-row">
            <div className="flex-auto md:pr-3">
              <Label htmlFor="temp" className="settings-label">Temperature</Label>
              <Select value={settings.temperature_unit} onValueChange={(val) => setSettings(prev => ({ ...prev, temperature_unit: val as TemperatureUnit }))}>
                <SelectTrigger id="temp" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="celsius">Celsius</SelectItem>
                  <SelectItem value="fahrenheit">Fahrenheit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-auto md:pr-3">
              <Label htmlFor="filesize" className="settings-label">File Size</Label>
              <Select
                value={settings.file_size_si_units ? 'true' : 'false'}
                onValueChange={(val) => setSettings(prev => ({ ...prev, file_size_si_units: val === 'true' }))}
              >
                <SelectTrigger id="filesize" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">SI Units (GB)</SelectItem>
                  <SelectItem value="false">Binary Units (GiB)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 4: Powered On Format */}
          <div className="flex flex-col mt-5 md:flex-row">
            <div className="flex-auto md:pr-3">
              <Label htmlFor="powered" className="settings-label">Powered On Format</Label>
              <Select value={settings.powered_on_hours_unit} onValueChange={(val) => setSettings(prev => ({ ...prev, powered_on_hours_unit: val }))}>
                <SelectTrigger id="powered" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="humanize">Humanize</SelectItem>
                  <SelectItem value="device_hours">Device Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Device Status - Thresholds (full width) */}
          <div className="flex flex-col mt-5 md:flex-row">
            <div className="flex-auto md:pr-3">
              <Label htmlFor="threshold" className="settings-label">Device Status - Thresholds</Label>
              <Select value={String(settings.status_threshold)} onValueChange={(val) => setSettings(prev => ({ ...prev, status_threshold: Number(val) }))}>
                <SelectTrigger id="threshold" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Smart</SelectItem>
                  <SelectItem value="2">Scrutiny</SelectItem>
                  <SelectItem value="3">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 6: Notify - Filter Attributes (full width) */}
          <div className="flex flex-col mt-5 md:flex-row">
            <div className="flex-auto md:pr-3">
              <Label htmlFor="filter" className="settings-label">Notify - Filter Attributes</Label>
              <Select value={String(settings.status_filter_attributes)} onValueChange={(val) => setSettings(prev => ({ ...prev, status_filter_attributes: Number(val) }))}>
                <SelectTrigger id="filter" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All</SelectItem>
                  <SelectItem value="1">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 7: Notify - Level (full width) */}
          <div className="flex flex-col mt-5 md:flex-row">
            <div className="flex-auto md:pr-3">
              <Label htmlFor="notifyLevel" className="settings-label">Notify - Level</Label>
              <Select value={String(settings.notify_level)} onValueChange={(val) => setSettings(prev => ({ ...prev, notify_level: Number(val) }))}>
                <SelectTrigger id="notifyLevel" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Warn (Warning or Failed)</SelectItem>
                  <SelectItem value="2">Fail (Only Failed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 8: Repeat Notifications (full width) */}
          <div className="flex flex-col mt-5 md:flex-row">
            <div className="flex-auto md:pr-3">
              <Label htmlFor="repeat" className="settings-label">Repeat Notifications</Label>
              <Select value={String(settings.repeat_notifications)} onValueChange={(val) => setSettings(prev => ({ ...prev, repeat_notifications: val === 'true' }))}>
                <SelectTrigger id="repeat" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Always</SelectItem>
                  <SelectItem value="false">Only when the value has changed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 8: Retrieve SCT Temperature History (full width) */}
          <div className="flex flex-col mt-5 md:flex-row">
            <div className="flex-auto md:pr-3">
              <Label htmlFor="retrieveSCT" className="settings-label">Retrieve SCT Temperature History</Label>
              <Select value={String(settings.retrieve_sct_temperature_history)} onValueChange={(val) => setSettings(prev => ({ ...prev, retrieve_sct_temperature_history: val === 'true' }))}>
                <SelectTrigger id="retrieveSCT" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
