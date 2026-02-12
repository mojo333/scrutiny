import { format } from 'date-fns';
import {
  Archive,
  MoreVertical,
  BellOff,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  ArchiveRestore,
  Trash2,
  FileText,
  AlertTriangle,
  Circle,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useArchiveZFSPool, useDeleteZFSPool } from '@/hooks/useZFS';
import type { ZFSPoolModel, ZFSPoolStatus, ZFSVdevModel } from '@/models/zfs-pool-model';

interface ZFSPoolCardProps {
  pool: ZFSPoolModel;
}

export function ZFSPoolCard({ pool }: ZFSPoolCardProps) {

  const getPoolStatus = (pool: ZFSPoolModel): 'passed' | 'failed' | 'unknown' => {
    switch (pool.status) {
      case 'ONLINE':
        return 'passed';
      case 'DEGRADED':
      case 'FAULTED':
        return 'failed';
      default:
        return 'unknown';
    }
  };

  const getStatusColor = (status: ZFSPoolStatus) => {
    switch (status) {
      case 'ONLINE':
        return 'text-green';
      case 'DEGRADED':
        return 'text-yellow';
      case 'FAULTED':
      case 'UNAVAIL':
      case 'OFFLINE':
      case 'REMOVED':
        return 'text-red';
      default:
        return '';
    }
  };

  const getPoolTitle = (pool: ZFSPoolModel) => {
    return pool.label || pool.name;
  };

  const status = getPoolStatus(pool);
  const borderColor =
    status === 'passed' ? 'border-green' : status === 'failed' ? 'border-red' : 'border-yellow';

  const StatusIcon = {
    passed: CheckCircle,
    failed: AlertCircle,
    unknown: HelpCircle,
  }[status];

  // Mutations
  const archiveMutation = useArchiveZFSPool();
  const deleteMutation = useDeleteZFSPool();

  const handleArchive = (archive: boolean) => {
    archiveMutation.mutate(
      { guid: pool.guid, archive },
      {
        onSuccess: () => {
          toast.success(archive ? 'Pool archived' : 'Pool unarchived');
        },
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(pool.guid, {
      onSuccess: () => {
        toast.success('Pool deleted');
      },
    });
  };

  // Render vdev tree recursively with tree icons
  const renderVdevTree = (vdev: ZFSVdevModel, depth = 0) => {
    const hasErrors =
      vdev.read_errors > 0 || vdev.write_errors > 0 || vdev.checksum_errors > 0;

    // Get the appropriate status icon
    const VdevIcon =
      vdev.status === 'ONLINE'
        ? CheckCircle
        : vdev.status === 'DEGRADED'
          ? AlertCircle
          : Circle;

    const iconColor =
      vdev.status === 'ONLINE'
        ? 'text-green-500'
        : vdev.status === 'DEGRADED'
          ? 'text-yellow-500'
          : 'text-red-500';

    return (
      <div key={vdev.id}>
        <div className="flex items-center gap-2 py-1.5 text-sm" style={{ marginLeft: `${depth * 40}px` }}>
          {/* L-shaped tree connector for children */}
          {depth > 0 && (
            <div className="relative mr-2" style={{ width: '24px', height: '20px' }}>
              <div className="absolute bottom-2 left-0 w-6 border-b-2 border-l-2 border-gray-600" style={{ height: '10px' }}></div>
            </div>
          )}

          {/* Status icon */}
          <VdevIcon className={`w-4 h-4 ${iconColor} flex-shrink-0`} />

          <div className="flex items-center justify-between flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="font-medium">{vdev.name}</span>
              <span className="text-xs text-hint">{vdev.type}</span>
              {vdev.path && (
                <span className="text-xs text-hint truncate">
                  {vdev.path.replace('/dev/disk/by-id/', '').replace('/dev/', '')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasErrors && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-red cursor-help">
                        R:{vdev.read_errors} W:{vdev.write_errors} C:{vdev.checksum_errors}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <div className="font-bold mb-1">Error Counts:</div>
                        <div>R = Read Errors</div>
                        <div>W = Write Errors</div>
                        <div>C = Checksum Errors</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Badge
                className={`text-xs font-bold px-4 py-1.5 min-w-[80px] justify-center ${
                  vdev.status === 'ONLINE'
                    ? 'bg-green-600 hover:bg-green-600'
                    : vdev.status === 'DEGRADED'
                      ? 'bg-yellow-600 hover:bg-yellow-600'
                      : 'bg-red-600 hover:bg-red-600'
                }`}
              >
                {vdev.status}
              </Badge>
            </div>
          </div>
        </div>
        {vdev.children && vdev.children.map((child) => renderVdevTree(child, depth + 1))}
      </div>
    );
  };

  return (
    <div
      className={`relative flex flex-col flex-auto p-6 pr-3 pb-3 bg-card rounded border-l-4 ${borderColor} shadow-md overflow-hidden ${pool.archived ? 'text-disabled' : ''}`}
    >
      {/* Status watermark icon */}
      <div className="absolute bottom-0 right-0 w-24 h-24 -m-6">
        <StatusIcon
          className={`w-24 h-24 opacity-12 ${status === 'passed' ? 'text-green' : status === 'failed' ? 'text-red' : 'text-yellow'}`}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex flex-col">
          <a
            href={`/web/zfs-pool/${pool.guid}`}
            className="text-base text-gray-400 uppercase tracking-wider"
          >
            {getPoolTitle(pool)}
            {pool.muted && <BellOff className="muted-icon ml-1 inline w-4 h-4 align-middle" />}
          </a>

          {pool.updated_at && (
            <div className="text-sm text-green mt-1 font-bold">
              Last Updated on {format(new Date(pool.updated_at), 'MMMM dd, yyyy - HH:mm')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center">
          {pool.archived && <Archive className="w-5 h-5" />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={`/web/zfs-pool/${pool.guid}`} className="flex items-center">
                  <FileText className="w-5 h-5 mr-3" />
                  <span>View Details</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleArchive(!pool.archived)}>
                {pool.archived ? (
                  <>
                    <ArchiveRestore className="w-5 h-5 mr-3" />
                    <span>Unarchive Pool</span>
                  </>
                ) : (
                  <>
                    <Archive className="w-5 h-5 mr-3" />
                    <span>Archive Pool</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (confirm(`Are you sure you want to delete pool "${getPoolTitle(pool)}"?`)) {
                    handleDelete();
                  }
                }}
                className="text-red"
              >
                <Trash2 className="w-5 h-5 mr-3" />
                <span>Delete Pool</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Warning/Status Message */}
      {pool.status === 'DEGRADED' && pool.scrub_state === 'scanning' && (
        <div className="mb-4 p-2.5 bg-yellow-900/30 border border-yellow-600/40 rounded flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-medium text-yellow-500">
            Action: Wait for the scrub to complete.
          </div>
        </div>
      )}

      {pool.status === 'DEGRADED' && pool.scrub_state !== 'scanning' && (
        <div className="mb-4 p-2.5 bg-gray-800/50 rounded text-sm text-gray-400">
          One or more devices is currently being scanned. The pool will continue to function,
          possibly in a degraded state.
        </div>
      )}

      {pool.status === 'ONLINE' && (
        <div className="mb-4 p-2.5 bg-gray-700/80 rounded text-sm text-white font-medium">
          Pool is healthy
        </div>
      )}

      {/* Three Column Metrics */}
      <div className="grid grid-cols-3 gap-8 mb-5">
        <div>
          <div className="text-xs text-hint uppercase tracking-wider mb-2">STATE</div>
          <div className={`text-3xl font-bold ${getStatusColor(pool.status)}`}>
            {pool.status === 'DEGRADED' && 'Degraded'}
            {pool.status === 'ONLINE' && 'Online'}
            {pool.status === 'FAULTED' && 'Faulted'}
            {pool.status === 'OFFLINE' && 'Offline'}
          </div>
        </div>

        <div>
          <div className="text-xs text-hint uppercase tracking-wider mb-2">LAST SCRUB</div>
          <div className={`text-3xl font-bold leading-tight ${
            pool.scrub_state === 'finished' ? 'text-green' :
            pool.scrub_state === 'scanning' ? 'text-blue-400' :
            'text-gray-400'
          }`}>
            {pool.scrub_state === 'scanning' && 'In progress'}
            {pool.scrub_state === 'finished' && 'Completed'}
            {pool.scrub_state === 'none' && 'Never'}
            {pool.scrub_state === 'canceled' && 'Canceled'}
          </div>
          {pool.scrub_state === 'scanning' && (
            <div className="text-sm text-blue-400 mt-1">
              {pool.scrub_percent.toFixed(1)}% complete
            </div>
          )}
        </div>

        <div>
          <div className="text-xs text-hint uppercase tracking-wider mb-2">UTILIZATION</div>
          <div className="text-3xl font-bold text-green">{pool.capacity_percent.toFixed(0)}%</div>
        </div>
      </div>

      {/* Device Configuration */}
      <div className="border-t border-gray-700 pt-4">
        <div className="text-sm font-medium text-gray-400 mb-3">Device Configuration:</div>
        {pool.vdevs && pool.vdevs.length > 0 ? (
          <div className="space-y-0">{pool.vdevs.map((vdev) => renderVdevTree(vdev, 0))}</div>
        ) : (
          <div className="text-sm text-hint">No vdev information available</div>
        )}
      </div>
    </div>
  );
}
