import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { SmartModel } from '@/models/measurements/smart-model';
import type { SmartAttributeModel } from '@/models/measurements/smart-attribute-model';
import type { AttributeMetadataModel } from '@/models/thresholds/attribute-metadata-model';
import { AttributeStatus } from '@/constants';

export type AttributeRow = SmartAttributeModel & {
  metadata?: AttributeMetadataModel;
  smartHistory: SmartModel[];
};

export type HistoryPoint = {
  x: Date;
  y: number;
  strokeColor?: string;
  fillColor?: string;
};

export function getAttributeStatusName(status: number): string {
  if (status === AttributeStatus.Passed) return 'passed';
  if ((status & AttributeStatus.FailedScrutiny) !== 0 || (status & AttributeStatus.FailedSmart) !== 0) return 'failed';
  if ((status & AttributeStatus.WarningScrutiny) !== 0) return 'warn';
  return 'unknown';
}

export function getAttributeValue(attrData: SmartAttributeModel, isAta: boolean, attrMeta?: AttributeMetadataModel): number {
  if (!isAta) return attrData.value;
  if (!attrMeta) return attrData.value;
  if (attrMeta.display_type === 'raw') return attrData.raw_value ?? attrData.value;
  if (attrMeta.display_type === 'transformed' && attrData.transformed_value !== undefined) return attrData.transformed_value;
  return attrData.value;
}

export function buildAttributeHistory(
  smartHistory: SmartModel[],
  attrId: string | number,
  attrMeta: AttributeMetadataModel | undefined,
  isAta: boolean
): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  for (const smartResult of smartHistory) {
    const attrData = smartResult.attrs?.[attrId];
    if (!attrData) continue;
    const point: HistoryPoint = { x: new Date(smartResult.date), y: getAttributeValue(attrData, isAta, attrMeta) };
    const statusName = getAttributeStatusName(attrData.status);
    if (statusName === 'failed') {
      point.strokeColor = '#F05252';
      point.fillColor = '#F05252';
    } else if (statusName === 'warn') {
      point.strokeColor = '#C27803';
      point.fillColor = '#C27803';
    }
    points.push(point);
  }
  return points;
}

function getScrutinyStatusColor(status: number): string {
  const statusName = getAttributeStatusName(status);
  if (statusName === 'failed') return 'bg-red';
  if (statusName === 'passed') return 'bg-green';
  if (statusName === 'warn') return 'bg-yellow';
  return 'bg-gray-500';
}

function getSmartStatusColor(status: number): string {
  if ((status & AttributeStatus.FailedSmart) !== 0) return 'bg-red';
  return 'bg-green';
}

interface ExpandedAttributeRowProps {
  row: AttributeRow;
  columnsLength: number;
  isAta: boolean;
}

export function ExpandedAttributeRow({ row, columnsLength, isAta }: ExpandedAttributeRowProps) {
  const historyData = buildAttributeHistory(row.smartHistory, row.attribute_id, row.metadata, isAta);

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
      labels: { style: { colors: isDark ? '#9FA6B2' : '#6B7280' } },
    },
    yaxis: {
      labels: { style: { colors: isDark ? '#9FA6B2' : '#6B7280' } },
    },
    grid: {
      borderColor: isDark ? '#374151' : '#E5E7EB',
    },
  };

  const chartSeries = [{ name: row.metadata?.display_name || 'Value', data: historyData }];

  const displayValue = getAttributeValue(row, isAta, row.metadata);
  const transformedValue = displayValue + (row.metadata?.transform_value_unit || '');
  const worstValue = row.worst !== undefined ? row.worst : '--';
  const threshValue = row.thresh || '--';
  const failureRate = row.failure_rate !== undefined && row.failure_rate !== null
    ? `${(row.failure_rate * 100).toFixed(2)}%`
    : '--';

  return (
    <tr className="bg-gray-50 dark:bg-cool-gray-800">
      <td colSpan={columnsLength} className="p-0">
        <div className="flex flex-col md:flex-row text-gray-900 dark:text-gray-300">
          <div className="flex flex-auto w-full md:w-1/3 py-4 px-4">
            <div className="flex flex-col flex-auto text-sm">
              {row.metadata?.description || 'No description available'}
            </div>
          </div>
          <div className="flex flex-auto w-full md:w-2/3 py-4 px-6">
            <div className="flex flex-col flex-auto text-sm">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 font-semibold">
                <div className="flex items-center w-1/4">Type</div>
                <div className="flex items-center w-1/4">Value</div>
                <div className="flex items-center w-1/4">Worst/Thresh</div>
                <div className="flex items-center w-1/4">Failure %</div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center w-1/4">
                  <div className={`flex-shrink-0 w-2 h-2 mr-3 rounded-full ${getScrutinyStatusColor(row.status)}`}></div>
                  <div className="truncate">Scrutiny</div>
                </div>
                <div className="w-1/4 items-center font-medium">{transformedValue}</div>
                <div className="w-1/4 items-center text-gray-500 dark:text-hint">--</div>
                <div className="w-1/4 items-center text-gray-500 dark:text-hint">{failureRate}</div>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center w-1/4">
                  <div className={`flex-shrink-0 w-2 h-2 mr-3 rounded-full ${getSmartStatusColor(row.status)}`}></div>
                  <div className="truncate">Normalized</div>
                </div>
                <div className="w-1/4 items-center font-medium">{row.value}</div>
                <div className="w-1/4 items-center text-gray-500 dark:text-hint">{worstValue}/{threshValue}</div>
                <div className="w-1/4 items-center text-gray-500 dark:text-hint">--</div>
              </div>
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
}
