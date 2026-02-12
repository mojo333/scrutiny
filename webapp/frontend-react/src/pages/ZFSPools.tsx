import { useState } from 'react';
import { Archive } from 'lucide-react';

import { ZFSPoolCard } from '@/components/zfs/ZFSPoolCard';
import { Button } from '@/components/ui/button';
import { useZFSPoolsSummary } from '@/hooks/useZFS';
import type { ZFSPoolModel } from '@/models/zfs-pool-model';

export function ZFSPools() {
  const [showArchived, setShowArchived] = useState(false);

  const { data: pools, isLoading } = useZFSPoolsSummary();

  // Group pools by host
  const hostGroups: { [hostId: string]: string[] } = {};
  if (pools) {
    for (const guid in pools) {
      const hostId = pools[guid].host_id;
      if (!hostGroups[hostId]) {
        hostGroups[hostId] = [];
      }
      hostGroups[hostId].push(guid);
    }
  }

  const getPoolsForHost = (guids: string[]): ZFSPoolModel[] => {
    if (!pools) return [];
    return guids.map((guid) => pools[guid]).filter(Boolean);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading ZFS pools...</div>
      </div>
    );
  }

  if (!pools || Object.keys(pools).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
        <img
          src="/dashboard-placeholder.png"
          alt="No pools"
          className="w-64 h-64 mb-8 opacity-50"
        />
        <h1 className="text-3xl font-bold mb-4">No ZFS Pools Detected!</h1>
        <p className="max-w-2xl text-muted-foreground mb-4">
          Scrutiny includes a ZFS Collector agent that you must run on systems with ZFS pools.
          The ZFS Collector is responsible for detecting ZFS pools and collecting health metrics
          on a configurable schedule.
        </p>
        <p className="mb-4 text-muted-foreground">
          You can trigger the ZFS Collector manually by running the following command, then
          refreshing this page:
        </p>
        <code className="bg-muted px-4 py-2 rounded">scrutiny-collector-zfs run</code>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold">ZFS Pools</h2>
          <p className="text-muted-foreground">ZFS pool health at a glance</p>
        </div>

        {/* Toggle archived */}
        <Button
          variant={showArchived ? 'default' : 'outline'}
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="w-4 h-4 mr-2" />
          Archived
        </Button>
      </div>

      {/* Pool Groups by Host */}
      {Object.entries(hostGroups).map(([hostId, guids]) => (
        <div key={hostId} className="mb-8">
          {hostId && <h3 className="text-xl font-semibold mb-4">{hostId}</h3>}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {getPoolsForHost(guids).map((pool) => {
              if (!showArchived && pool.archived) return null;
              return <ZFSPoolCard key={pool.guid} pool={pool} />;
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
