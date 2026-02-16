import { useParams } from '@tanstack/react-router';
import { format } from 'date-fns';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useZFSPoolDetails } from '@/hooks/useZFS';
import { formatFileSize } from '@/utils/file-size';
import type { ZFSVdevModel } from '@/models/zfs-pool-model';

export function ZFSPoolDetail() {
  const { guid } = useParams({ from: '/zfs-pool/$guid' });

  const { data, isLoading } = useZFSPoolDetails(guid);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading pool details...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Pool not found</div>
      </div>
    );
  }

  const { pool, metrics_history } = data;

  // Prepare capacity chart data
  const capacityChartOptions: ApexOptions = {
    chart: {
      type: 'area',
      height: 300,
      fontFamily: 'inherit',
      toolbar: {
        show: false,
      },
    },
    colors: ['#667eea'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    xaxis: {
      type: 'datetime',
      labels: {
        format: 'MMM dd',
      },
    },
    yaxis: {
      min: 0,
      max: 100,
      labels: {
        formatter: (val) => `${(val ?? 0).toFixed(0)}%`,
      },
    },
    tooltip: {
      x: {
        format: 'MMM dd, yyyy',
      },
      y: {
        formatter: (val) => `${(val ?? 0).toFixed(1)}%`,
      },
    },
  };

  const capacitySeries = [
    {
      name: 'Capacity',
      data: metrics_history.map((m: { date: string; capacity_percent: number }) => ({
        x: new Date(m.date).getTime(),
        y: m.capacity_percent,
      })),
    },
  ];

  // Render vdev tree
  const renderVdevTree = (vdev: ZFSVdevModel, level = 0) => {
    const hasErrors =
      vdev.read_errors > 0 || vdev.write_errors > 0 || vdev.checksum_errors > 0;

    return (
      <div key={vdev.id} className={`${level > 0 ? 'ml-8' : ''} mb-2`}>
        <div className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded">
          <div className="flex-1">
            <span className="font-semibold">{vdev.name}</span>
            <span className="text-muted-foreground ml-2">({vdev.type})</span>
          </div>
          <div className="text-white font-semibold">{vdev.status}</div>
          {hasErrors && (
            <div className="text-red-500 text-sm">
              R:{vdev.read_errors} W:{vdev.write_errors} C:{vdev.checksum_errors}
            </div>
          )}
        </div>
        {vdev.children && vdev.children.map((child: ZFSVdevModel) => renderVdevTree(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold">{pool.label || pool.name}</h2>
        <p className="text-muted-foreground">
          Last updated {format(new Date(pool.updated_at), 'MMMM dd, yyyy - HH:mm')}
        </p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Status</div>
          <div className="text-2xl font-bold">{pool.status}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Capacity</div>
          <div className="text-2xl font-bold">{(pool.capacity_percent ?? 0).toFixed(1)}%</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Size</div>
          <div className="text-2xl font-bold">{formatFileSize(pool.size)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Free</div>
          <div className="text-2xl font-bold">{formatFileSize(pool.free)}</div>
        </Card>
      </div>

      {/* Capacity History Chart */}
      {metrics_history.length > 0 && (
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Capacity History</h3>
          <ReactApexChart
            options={capacityChartOptions}
            series={capacitySeries}
            type="area"
            height={300}
          />
        </Card>
      )}

      {/* Scrub Status */}
      {pool.scrub_state !== 'none' && (
        <Card className="p-6 mb-8">
          <h3 className="text-xl font-semibold mb-4">Scrub Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">State</div>
              <div className="font-semibold">{pool.scrub_state}</div>
            </div>
            {pool.scrub_state === 'scanning' && (
              <div>
                <div className="text-sm text-muted-foreground">Progress</div>
                <div className="font-semibold">{(pool.scrub_percent ?? 0).toFixed(1)}%</div>
              </div>
            )}
            {pool.scrub_errors > 0 && (
              <div>
                <div className="text-sm text-muted-foreground">Errors</div>
                <div className="font-semibold text-red-500">{pool.scrub_errors}</div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Vdev Structure */}
      {pool.vdevs && pool.vdevs.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">VDEV Structure</h3>
          <Separator className="mb-4" />
          <div>{pool.vdevs.map((vdev) => renderVdevTree(vdev))}</div>
        </Card>
      )}
    </div>
  );
}
