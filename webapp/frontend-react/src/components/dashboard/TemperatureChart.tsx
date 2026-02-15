import { useMemo } from 'react';
import Chart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';
import type { DeviceSummaryModel } from '@/models/device-summary-model';
import { deviceTitleWithFallback } from '@/utils/device-title';
import { celsiusToFahrenheit } from '@/utils/temperature';

interface TemperatureChartProps {
  deviceSummaries: Record<string, DeviceSummaryModel>;
  temperatureUnit: 'celsius' | 'fahrenheit';
  dashboardDisplay: 'name' | 'serial_number' | 'uuid';
  lineStroke?: 'smooth' | 'straight' | 'stepline';
  visibleDevices?: Set<string>; // WWNs of visible devices
}

export function TemperatureChart({
  deviceSummaries,
  temperatureUnit,
  dashboardDisplay,
  lineStroke = 'smooth',
  visibleDevices
}: TemperatureChartProps) {
  const chartData = useMemo(() => {
    const series: { name: string; data: { x: Date | number; y: number }[] }[] = [];

    for (const wwn in deviceSummaries) {
      // Skip if device is not visible
      if (visibleDevices && !visibleDevices.has(wwn)) {
        continue;
      }

      const deviceSummary = deviceSummaries[wwn];
      if (!deviceSummary.temp_history || deviceSummary.temp_history.length === 0) {
        continue;
      }

      const deviceName = deviceTitleWithFallback(deviceSummary.device, dashboardDisplay);
      const data: { x: Date | number; y: number }[] = [];

      for (const tempHistory of deviceSummary.temp_history) {
        const date = new Date(tempHistory.date);
        let temperature = tempHistory.temp;

        if (temperatureUnit === 'fahrenheit') {
          temperature = celsiusToFahrenheit(temperature);
        }

        data.push({
          x: date.getTime(),
          y: temperature
        });
      }

      series.push({
        name: deviceName,
        data
      });
    }

    return series;
  }, [deviceSummaries, temperatureUnit, dashboardDisplay, visibleDevices]);

  const options: ApexOptions = {
    chart: {
      animations: {
        speed: 400,
        animateGradually: {
          enabled: false
        }
      },
      fontFamily: 'inherit',
      foreColor: 'inherit',
      width: '100%',
      height: '100%',
      type: 'area',
      sparkline: {
        enabled: true
      },
      background: 'transparent'
    },
    colors: ['#667eea', '#9066ea', '#66c0ea', '#66ead2', '#d266ea', '#66ea90'],
    fill: {
      colors: ['#b2bef4', '#c7b2f4', '#b2dff4', '#b2f4e8', '#e8b2f4', '#b2f4c7'],
      opacity: 0.5,
      type: 'gradient'
    },
    stroke: {
      curve: lineStroke,
      width: 2
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      x: {
        format: 'MMM dd, yyyy HH:mm:ss'
      },
      y: {
        formatter: (value: number) => {
          const unit = temperatureUnit === 'fahrenheit' ? '°F' : '°C';
          return value != null ? `${value.toFixed(1)}${unit}` : '';
        }
      }
    },
    xaxis: {
      type: 'datetime',
      labels: {
        datetimeUTC: false
      }
    },
    yaxis: {
      labels: {
        formatter: (value: number) => {
          return value != null ? value.toFixed(0) : '';
        }
      }
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-hint">
        No temperature data available
      </div>
    );
  }

  return (
    <Chart
      options={options}
      series={chartData}
      type="area"
      width="100%"
      height="100%"
    />
  );
}
