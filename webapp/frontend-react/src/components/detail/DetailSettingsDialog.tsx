import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DetailSettingsDialogProps {
  onOpenChange: (open: boolean) => void;
  currentMuted: boolean;
  currentLabel: string;
  onSave: (muted: boolean, label: string) => void;
}

export function DetailSettingsDialog({
  onOpenChange,
  currentMuted,
  currentLabel,
  onSave,
}: DetailSettingsDialogProps) {
  const [muted, setMuted] = useState(currentMuted);
  const [label, setLabel] = useState(currentLabel || '');

  const handleSave = () => {
    onSave(muted, label);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Device Settings</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0 p-8 pb-0 overflow-hidden">
          {/* Custom Label */}
          <div className="flex flex-col mt-5">
            <div className="flex-auto">
              <Label htmlFor="label" className="settings-label">Custom Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g., Parity 1, Data Drive"
                className="settings-select"
              />
            </div>
          </div>

          {/* Threshold Data */}
          <div className="flex flex-col mt-5">
            <div className="flex-auto">
              <Label htmlFor="threshold" className="settings-label">Threshold Data</Label>
              <Select value="scrutiny" disabled>
                <SelectTrigger id="threshold" className="settings-select">
                  <SelectValue placeholder="Select threshold" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scrutiny">Scrutiny</SelectItem>
                  <SelectItem value="manufacturer" disabled>
                    Manufacturer
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notifications */}
          <div className="flex flex-col mt-5">
            <div className="flex-auto">
              <Label htmlFor="notifications" className="settings-label">Notifications</Label>
              <Select
                value={muted ? 'true' : 'false'}
                onValueChange={(value) => setMuted(value === 'true')}
              >
                <SelectTrigger id="notifications" className="settings-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Enabled</SelectItem>
                  <SelectItem value="true">Disabled</SelectItem>
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
