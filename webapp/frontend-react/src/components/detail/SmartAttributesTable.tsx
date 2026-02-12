import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  createColumnHelper,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ExpandedState,
} from '@tanstack/react-table';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { DeviceModel } from '@/models/device-model';
import type { SmartModel } from '@/models/measurements/smart-model';
import type { SmartAttributeModel } from '@/models/measurements/smart-attribute-model';
import type { AttributeMetadataModel } from '@/models/thresholds/attribute-metadata-model';
import { Button } from '@/components/ui/button';
import { Info, ChevronDown, ChevronRight, ChevronsUpDown, ChevronUp } from 'lucide-react';
import { AttributeStatus } from '@/constants';

interface SmartAttributesTableProps {
  device: DeviceModel;
  smartResults: SmartModel[];
  metadata: { [key: string]: AttributeMetadataModel } | { [key: number]: AttributeMetadataModel };
}

type AttributeRow = SmartAttributeModel & {
  metadata?: AttributeMetadataModel;
  smartHistory: SmartModel[];
};

const columnHelper = createColumnHelper<AttributeRow>();

export function SmartAttributesTable({
  device,
  smartResults,
  metadata
}: SmartAttributesTableProps) {
  const [onlyCritical, setOnlyCritical] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const isAta = device.device_protocol === 'ATA';
  const isScsi = device.device_protocol === 'SCSI';
  const isNvme = device.device_protocol === 'NVMe';

  // Helper to safely access metadata - handles both string and number keys
  const getMetadata = (attrId: string | number): AttributeMetadataModel | undefined => {
    // Check if metadata uses string keys
    if (typeof attrId === 'string' && attrId in metadata) {
      return (metadata as { [key: string]: AttributeMetadataModel })[attrId];
    }
    // Check if metadata uses number keys
    if (typeof attrId === 'number' && attrId in metadata) {
      return (metadata as { [key: number]: AttributeMetadataModel })[attrId];
    }
    // Try converting string to number and vice versa as fallback
    const alternateId = typeof attrId === 'string' ? Number(attrId) : String(attrId);
    if (alternateId in metadata) {
      if (typeof alternateId === 'string') {
        return (metadata as { [key: string]: AttributeMetadataModel })[alternateId];
      } else {
        return (metadata as { [key: number]: AttributeMetadataModel })[alternateId];
      }
    }
    return undefined;
  };

  // Helper functions
  const getAttributeStatusName = (status: number): string => {
    if (status === AttributeStatus.Passed) {
      return 'passed';
    } else if ((status & AttributeStatus.FailedScrutiny) !== 0 || (status & AttributeStatus.FailedSmart) !== 0) {
      return 'failed';
    } else if ((status & AttributeStatus.WarningScrutiny) !== 0) {
      return 'warn';
    }
    return 'unknown';
  };

  // Helper to get the correct value based on metadata display_type (matching Angular logic)
  const getAttributeValue = (attrData: SmartAttributeModel, attrMeta?: AttributeMetadataModel): number => {
    if (isAta) {
      if (!attrMeta) {
        return attrData.value;
      } else if (attrMeta.display_type === 'raw') {
        return attrData.raw_value ?? attrData.value;
      } else if (attrMeta.display_type === 'transformed' && attrData.transformed_value !== undefined) {
        return attrData.transformed_value;
      } else {
        return attrData.value;
      }
    } else {
      return attrData.value;
    }
  };

  // Generate table data
  const data = useMemo<AttributeRow[]>(() => {
    if (!smartResults || smartResults.length === 0) return [];

    const latestSmartResult = smartResults[0];
    const attrs = latestSmartResult.attrs || {};
    const result: AttributeRow[] = [];

    for (const attrId in attrs) {
      const attr = attrs[attrId];
      const attrMeta = getMetadata(attr.attribute_id);

      // Filter based on onlyCritical
      if (!onlyCritical || (onlyCritical && attrMeta?.critical) || attr.value < attr.thresh) {
        result.push({
          ...attr,
          metadata: attrMeta,
          smartHistory: smartResults,
        });
      }
    }

    return result;
  }, [smartResults, onlyCritical, metadata]);

  const hiddenAttributesCount = useMemo(() => {
    if (!smartResults || smartResults.length === 0) return 0;
    const totalAttrs = Object.keys(smartResults[0].attrs || {}).length;
    return totalAttrs - data.length;
  }, [smartResults, data]);

  // Define columns based on protocol
  const columns = useMemo<ColumnDef<AttributeRow, any>[]>(() => {
    const cols: ColumnDef<AttributeRow, any>[] = [];

    // Expander column
    cols.push(
      columnHelper.display({
        id: 'expander',
        header: '',
        cell: ({ row }) => (
          <button
            onClick={row.getToggleExpandedHandler()}
            className="cursor-pointer p-1"
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ),
        size: 40,
      })
    );

    // Status column
    cols.push(
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => {
          const status = getValue();
          const statusName = getAttributeStatusName(status);
          const statusColors = {
            passed: 'bg-green-100 dark:bg-green-500 text-green-900 dark:text-gray-900 border-green-600',
            failed: 'bg-red-100 dark:bg-red-500 text-red-900 dark:text-gray-900 border-red-600',
            warn: 'bg-yellow-100 dark:bg-yellow-400 text-yellow-900 dark:text-gray-900 border-yellow-600',
            unknown: 'bg-gray-100 dark:bg-gray-500 text-gray-900 dark:text-gray-900 border-gray-600',
          };
          return (
            <span
              className={`inline-block px-2 py-1 text-xs uppercase rounded border ${
                statusColors[statusName as keyof typeof statusColors] || statusColors.unknown
              }`}
            >
              {statusName}
            </span>
          );
        },
        sortingFn: 'basic',
        size: 100,
      })
    );

    // ID column (ATA only)
    if (isAta) {
      cols.push(
        columnHelper.accessor('attribute_id', {
          header: 'ID',
          cell: ({ getValue, row }) => {
            const attrId = getValue();
            const hexId = typeof attrId === 'number' ? `0x${attrId.toString(16).toUpperCase().padStart(2, '0')}` : attrId;
            return (
              <span className="flex items-center">
                {hexId}
                {row.original.metadata?.description && (
                  <span title={row.original.metadata.description}>
                    <Info className="w-3 h-3 ml-1 text-hint cursor-help" />
                  </span>
                )}
              </span>
            );
          },
          sortingFn: 'alphanumeric',
          size: 80,
        })
      );
    }

    // Name column
    cols.push(
      columnHelper.accessor('attribute_id', {
        id: 'name',
        header: 'Name',
        cell: ({ getValue, row }) => {
          const attrId = getValue();
          const attrMeta = row.original.metadata;
          return attrMeta?.display_name || `Unknown Attribute (${attrId})`;
        },
        sortingFn: 'text',
        size: 200,
      })
    );

    // Value column
    cols.push(
      columnHelper.display({
        id: 'value',
        header: 'Value',
        cell: ({ row }) => {
          const value = getAttributeValue(row.original, row.original.metadata);
          const unit = row.original.metadata?.transform_value_unit || '';
          return (
            <span>
              {value}
              {unit && <span className="text-xs text-hint ml-1">{unit}</span>}
            </span>
          );
        },
        size: 100,
      })
    );

    // Threshold column
    cols.push(
      columnHelper.accessor('thresh', {
        header: 'Threshold',
        cell: ({ getValue }) => getValue() || '--',
        sortingFn: 'basic',
        size: 100,
      })
    );

    // Ideal column (ATA & NVMe)
    if (isAta || isNvme) {
      cols.push(
        columnHelper.accessor((row) => row.metadata?.ideal, {
          id: 'ideal',
          header: 'Ideal',
          cell: ({ getValue }) => getValue() || '--',
          sortingFn: 'text',
          size: 80,
        })
      );
    }

    // Failure Rate column (ATA only)
    if (isAta) {
      cols.push(
        columnHelper.accessor('failure_rate', {
          header: 'Failure Rate',
          cell: ({ getValue }) => {
            const rate = getValue();
            if (rate === undefined || rate === null) return '--';
            return `${(rate * 100).toFixed(2)}%`;
          },
          sortingFn: 'basic',
          size: 120,
        })
      );
    }

    // History column with sparkline (bar chart like Angular)
    cols.push(
      columnHelper.display({
        id: 'history',
        header: 'History',
        cell: ({ row }) => {
          const historyData: { x: string; y: number; strokeColor?: string; fillColor?: string }[] = [];

          // Build chart data (same as Angular version)
          for (const smartResult of row.original.smartHistory) {
            const attrData = smartResult.attrs?.[row.original.attribute_id];
            if (!attrData) continue;

            const date = new Date(smartResult.date);
            const formattedDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            const datapoint: { x: string; y: number; strokeColor?: string; fillColor?: string } = {
              x: formattedDate,
              y: getAttributeValue(attrData, row.original.metadata),
            };

            const statusName = getAttributeStatusName(attrData.status);
            if (statusName === 'failed') {
              datapoint.strokeColor = '#F05252';
              datapoint.fillColor = '#F05252';
            } else if (statusName === 'warn') {
              datapoint.strokeColor = '#C27803';
              datapoint.fillColor = '#C27803';
            }

            historyData.push(datapoint);
          }

          // Reverse so newest data is on the right (fixes #339)
          historyData.reverse();

          if (historyData.length === 0) {
            return <div className="h-[25px] w-[100px]" />;
          }

          const sparklineOptions: ApexOptions = {
            chart: {
              type: 'bar',
              width: 100,
              height: 25,
              sparkline: { enabled: true },
              animations: { enabled: false },
            },
            stroke: {
              width: 2,
              colors: ['#667EEA']
            },
            tooltip: {
              theme: 'dark',
              fixed: { enabled: false },
              x: { show: true },
              y: {
                title: {
                  formatter: () => '',
                },
              },
              marker: {
                show: false,
              },
            },
          };

          const sparklineSeries = [{
            name: 'chart-line-sparkline',
            data: historyData
          }];

          return (
            <div className="inline-block">
              <Chart options={sparklineOptions} series={sparklineSeries} type="bar" width={100} height={25} />
            </div>
          );
        },
        size: 150,
      })
    );

    return cols;
  }, [isAta, isScsi, isNvme]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      expanded,
    },
    onSortingChange: setSorting,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
  });

  // Get status indicator colors
  const getScrutinyStatusColor = (status: number): string => {
    const statusName = getAttributeStatusName(status);
    if (statusName === 'failed') return 'bg-red';
    if (statusName === 'passed') return 'bg-green';
    if (statusName === 'warn') return 'bg-yellow';
    return 'bg-gray-500';
  };

  const getSmartStatusColor = (status: number): string => {
    if ((status & AttributeStatus.FailedSmart) !== 0) return 'bg-red';
    return 'bg-green';
  };

  // Render expanded row content (details + chart)
  const renderExpandedRow = (row: AttributeRow) => {
    const historyData: { x: Date | string; y: number | null; strokeColor?: string; fillColor?: string }[] = [];

    // Build history data
    for (const smartResult of row.smartHistory) {
      const date = new Date(smartResult.date);
      const attrData = smartResult.attrs?.[row.attribute_id];
      if (!attrData) continue;

      const value = getAttributeValue(attrData, row.metadata);
      const statusName = getAttributeStatusName(attrData.status);
      const datapoint: { x: Date | string; y: number | null; strokeColor?: string; fillColor?: string } = {
        x: date,
        y: value
      };

      if (statusName === 'failed') {
        datapoint.strokeColor = '#F05252';
        datapoint.fillColor = '#F05252';
      } else if (statusName === 'warn') {
        datapoint.strokeColor = '#C27803';
        datapoint.fillColor = '#C27803';
      }

      historyData.push(datapoint);
    }

    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const chartOptions: ApexOptions = {
      chart: {
        type: 'line',
        sparkline: { enabled: false },
        animations: { enabled: false },
        toolbar: { show: false },
        background: 'transparent',
      },
      stroke: { curve: 'smooth', width: 2 },
      markers: { size: 3 },
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        x: { format: 'dd MMM yyyy' },
      },
      colors: ['#3F83F8'],
      xaxis: {
        type: 'datetime',
        labels: {
          style: {
            colors: isDark ? '#9FA6B2' : '#6B7280',
          },
        },
      },
      yaxis: {
        labels: {
          style: {
            colors: isDark ? '#9FA6B2' : '#6B7280',
          },
        },
      },
      grid: {
        borderColor: isDark ? '#374151' : '#E5E7EB',
      },
    };

    const chartSeries = [{ name: row.metadata?.display_name || 'Value', data: historyData }];

    const displayValue = getAttributeValue(row, row.metadata);
    const transformedValue = displayValue + (row.metadata?.transform_value_unit || '');
    const worstValue = row.worst !== undefined ? row.worst : '--';
    const threshValue = row.thresh || '--';
    const failureRate = row.failure_rate !== undefined && row.failure_rate !== null
      ? `${(row.failure_rate * 100).toFixed(2)}%`
      : '--';

    return (
      <tr className="bg-gray-50 dark:bg-cool-gray-800">
        <td colSpan={columns.length} className="p-0">
          <div className="flex flex-col md:flex-row text-gray-900 dark:text-gray-300">
            {/* Left side: Description */}
            <div className="flex flex-auto w-full md:w-1/3 py-4 px-4">
              <div className="flex flex-col flex-auto text-sm">
                {row.metadata?.description || 'No description available'}
              </div>
            </div>

            {/* Right side: Details table */}
            <div className="flex flex-auto w-full md:w-2/3 py-4 px-6">
              <div className="flex flex-col flex-auto text-sm">
                {/* Header row */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 font-semibold">
                  <div className="flex items-center w-1/4">Type</div>
                  <div className="flex items-center w-1/4">Value</div>
                  <div className="flex items-center w-1/4">Worst/Thresh</div>
                  <div className="flex items-center w-1/4">Failure %</div>
                </div>

                {/* Scrutiny row */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center w-1/4">
                    <div className={`flex-shrink-0 w-2 h-2 mr-3 rounded-full ${getScrutinyStatusColor(row.status)}`}></div>
                    <div className="truncate">Scrutiny</div>
                  </div>
                  <div className="w-1/4 items-center font-medium">{transformedValue}</div>
                  <div className="w-1/4 items-center text-gray-500 dark:text-hint">--</div>
                  <div className="w-1/4 items-center text-gray-500 dark:text-hint">{failureRate}</div>
                </div>

                {/* Normalized row */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center w-1/4">
                    <div className={`flex-shrink-0 w-2 h-2 mr-3 rounded-full ${getSmartStatusColor(row.status)}`}></div>
                    <div className="truncate">Normalized</div>
                  </div>
                  <div className="w-1/4 items-center font-medium">{row.value}</div>
                  <div className="w-1/4 items-center text-gray-500 dark:text-hint">{worstValue}/{threshValue}</div>
                  <div className="w-1/4 items-center text-gray-500 dark:text-hint">--</div>
                </div>

                {/* Raw row */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center w-1/4">
                    <div className="flex-shrink-0 w-2 h-2 mr-3"></div>
                    <div className="truncate">Raw</div>
                  </div>
                  <div className="w-1/4 items-center font-medium">{row.raw_value || row.raw_string || '--'}</div>
                  <div className="w-1/4 items-center text-gray-500 dark:text-hint">--</div>
                  <div className="w-1/4 items-center text-gray-500 dark:text-hint">--</div>
                </div>
              </div>
            </div>
          </div>

          {/* Chart section below */}
          {historyData.length > 0 && (
            <div className="px-4 pb-4">
              <div className="h-64 w-full">
                <Chart options={chartOptions} series={chartSeries} type="line" height="100%" width="100%" />
              </div>
            </div>
          )}
        </td>
      </tr>
    );
  };

  if (!smartResults || smartResults.length === 0) {
    return <div className="p-4 text-hint">No SMART data available</div>;
  }

  return (
    <div className="flex flex-col bg-white dark:bg-card shadow-md rounded">
      {/* Table header info */}
      <div className="flex items-center justify-between p-4">
        <div className="text-sm text-secondary">
          <span className="font-bold uppercase tracking-wider">S.M.A.R.T Attributes</span>
          <div className="text-hint">
            {data.length} visible, {hiddenAttributesCount} hidden
        </div>
        </div>
        <Button
          variant="outline"
          size="lg"
          onClick={() => setOnlyCritical(!onlyCritical)}
        >
          {onlyCritical ? 'Show all attributes' : 'Show critical only'}
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full bg-white dark:bg-transparent text-gray-900 dark:text-gray-300">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="bg-gray-100 dark:bg-cool-gray-700 border-t border-gray-200 dark:border-gray-700 px-2 py-3 text-left text-gray-900 dark:text-gray-100 font-semibold"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? 'flex items-center cursor-pointer select-none' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="ml-1">
                            {{
                              asc: <ChevronUp className="w-4 h-4" />,
                              desc: <ChevronDown className="w-4 h-4" />,
                            }[header.column.getIsSorted() as string] ?? <ChevronsUpDown className="w-4 h-4 text-hint" />}
                          </span>
                        )}
                      </div>
                    )}
                </th>
                ))}
            </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => {
              const isCritical = row.original.metadata?.critical || row.original.value < row.original.thresh;
              return (
                <React.Fragment key={row.id}>
                  <tr className={isCritical ? 'bg-gray-100 dark:bg-cool-gray-800' : 'bg-white dark:bg-cool-gray-900'}>
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="border-b border-gray-200 dark:border-gray-700 px-2 py-3 text-sm"
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                  {row.getIsExpanded() && renderExpandedRow(row.original)}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
