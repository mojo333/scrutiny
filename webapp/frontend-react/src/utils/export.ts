import type { DeviceSummaryModel } from '@/models/device-summary-model';
import type { DeviceModel } from '@/models/device-model';
import type { SmartModel } from '@/models/measurements/smart-model';
import type { AttributeMetadataModel } from '@/models/thresholds/attribute-metadata-model';
import type { AppConfig } from '@/api/settings';
import { deviceTitleWithFallback } from './device-title';

export function exportToCSV(
  deviceSummaries: Record<string, DeviceSummaryModel>,
  config: AppConfig
) {
  // Prepare CSV headers
  const headers = ['Host', 'Device Name', 'Status', 'Temperature', 'Capacity', 'Powered On', 'Model', 'Serial'];

  // Prepare CSV rows
  const rows = Object.entries(deviceSummaries).map(([_wwn, deviceSummary]) => {
    const deviceName = deviceTitleWithFallback(deviceSummary.device, config?.dashboard_display || 'name');
    const temp = deviceSummary.device.device_status === 0 && deviceSummary.smart?.temp
      ? `${deviceSummary.smart.temp}${config?.temperature_unit === 'fahrenheit' ? '°F' : '°C'}`
      : '--';
    const capacity = deviceSummary.device.capacity ? `${(deviceSummary.device.capacity / 1000000000).toFixed(1)} GB` : '--';
    const poweredOn = deviceSummary.smart?.power_on_hours
      ? `${Math.floor(deviceSummary.smart.power_on_hours / 24)} days`
      : '--';

    return [
      deviceSummary.device.host_id || 'localhost',
      deviceName,
      deviceSummary.device.device_status === 0 ? 'Passed' : 'Failed',
      temp,
      capacity,
      poweredOn,
      deviceSummary.device.model_name || '--',
      deviceSummary.device.serial_number || '--',
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `scrutiny-dashboard-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportToPDF(
  deviceSummaries: Record<string, DeviceSummaryModel>,
  config: AppConfig
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(20);
  doc.text('Scrutiny Dashboard Report', 14, 20);

  // Add date
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  // Table setup
  let yPosition = 40;
  const lineHeight = 8;
  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(10);

  // Add devices
  Object.entries(deviceSummaries).forEach(([_wwn, deviceSummary], index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = 20;
    }

    const deviceName = deviceTitleWithFallback(deviceSummary.device, config?.dashboard_display || 'name');
    const status = deviceSummary.device.device_status === 0 ? 'Passed' : 'Failed';
    const temp = deviceSummary.smart?.temp
      ? `${deviceSummary.smart.temp}${config?.temperature_unit === 'fahrenheit' ? '°F' : '°C'}`
      : '--';
    const capacity = deviceSummary.device.capacity
      ? `${(deviceSummary.device.capacity / 1000000000).toFixed(1)} GB`
      : '--';
    const poweredOn = deviceSummary.smart?.power_on_hours
      ? `${Math.floor(deviceSummary.smart.power_on_hours / 24)} days`
      : '--';

    // Device header
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${deviceName}`, 14, yPosition);
    yPosition += lineHeight;

    // Device details
    doc.setFont('helvetica', 'normal');
    doc.text(`Host: ${deviceSummary.device.host_id || 'localhost'}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Status: ${status}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Temperature: ${temp}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Capacity: ${capacity}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Powered On: ${poweredOn}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Model: ${deviceSummary.device.model_name || '--'}`, 20, yPosition);
    yPosition += lineHeight;
    doc.text(`Serial: ${deviceSummary.device.serial_number || '--'}`, 20, yPosition);
    yPosition += lineHeight + 4;
  });

  // Save the PDF
  doc.save(`scrutiny-dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
}

export function exportDeviceDetailToCSV(
  device: DeviceModel,
  smartResults: SmartModel[],
  metadata: Record<number, AttributeMetadataModel>,
  config: AppConfig
) {
  const deviceName = deviceTitleWithFallback(device, config?.dashboard_display || 'name');
  const latestSmart = smartResults?.[0];

  if (!latestSmart) {
    console.error('No SMART data available for export');
    return;
  }

  // Prepare CSV headers
  const headers = ['Attribute ID', 'Attribute Name', 'Value', 'Worst', 'Threshold', 'Raw Value', 'Status', 'Failure Rate'];

  // Prepare CSV rows from SMART attributes
  const rows = Object.entries(latestSmart.attrs || {}).map(([attrId, attr]) => {
    const attrMetadata = metadata[parseInt(attrId)];
    const displayName = attrMetadata?.display_name || `Attribute ${attrId}`;
    const status = attr.status === 0 ? 'Passed' : 'Failed';
    const failureRate = attr.failure_rate ? `${(attr.failure_rate * 100).toFixed(2)}%` : '--';

    return [
      attrId,
      displayName,
      attr.value?.toString() || '--',
      attr.worst?.toString() || '--',
      attr.thresh?.toString() || '--',
      attr.raw_value?.toString() || '--',
      status,
      failureRate,
    ];
  });

  // Combine headers and rows
  const csvContent = [
    `Device: ${deviceName}`,
    `Model: ${device.model_name || '--'}`,
    `Serial: ${device.serial_number || '--'}`,
    `Exported: ${new Date().toLocaleString()}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `scrutiny-device-${device.serial_number || 'unknown'}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportDeviceDetailToPDF(
  device: DeviceModel,
  smartResults: SmartModel[],
  metadata: Record<number, AttributeMetadataModel>,
  config: AppConfig
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const deviceName = deviceTitleWithFallback(device, config?.dashboard_display || 'name');
  const latestSmart = smartResults?.[0];

  if (!latestSmart) {
    console.error('No SMART data available for export');
    return;
  }

  // Add title
  doc.setFontSize(18);
  doc.text('Device Details Report', 14, 20);

  // Add device info
  doc.setFontSize(10);
  doc.text(`Device: ${deviceName}`, 14, 30);
  doc.text(`Model: ${device.model_name || '--'}`, 14, 36);
  doc.text(`Serial: ${device.serial_number || '--'}`, 14, 42);
  doc.text(`Manufacturer: ${device.manufacturer || '--'}`, 14, 48);
  doc.text(`Capacity: ${device.capacity ? `${(device.capacity / 1000000000).toFixed(1)} GB` : '--'}`, 14, 54);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 60);

  // Add SMART attributes header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('SMART Attributes', 14, 72);

  // Table setup
  let yPosition = 80;
  const lineHeight = 6;
  const pageHeight = doc.internal.pageSize.height;

  doc.setFontSize(8);

  // Sort attributes by ID
  const sortedAttrs = Object.entries(latestSmart.attrs || {}).sort(([a], [b]) => parseInt(a) - parseInt(b));

  sortedAttrs.forEach(([attrId, attr]) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }

    const attrMetadata = metadata[parseInt(attrId)];
    const displayName = attrMetadata?.display_name || `Attribute ${attrId}`;
    const status = attr.status === 0 ? 'Passed' : 'Failed';

    doc.setFont('helvetica', 'bold');
    doc.text(`${attrId}: ${displayName}`, 14, yPosition);
    yPosition += lineHeight;

    doc.setFont('helvetica', 'normal');
    doc.text(`  Value: ${attr.value || '--'}  |  Worst: ${attr.worst || '--'}  |  Thresh: ${attr.thresh || '--'}  |  Status: ${status}`, 14, yPosition);
    yPosition += lineHeight;
    doc.text(`  Raw: ${attr.raw_value || '--'}  |  Failure Rate: ${attr.failure_rate ? (attr.failure_rate * 100).toFixed(2) + '%' : '--'}`, 14, yPosition);
    yPosition += lineHeight + 2;
  });

  // Save the PDF
  doc.save(`scrutiny-device-${device.serial_number || 'unknown'}-${new Date().toISOString().split('T')[0]}.pdf`);
}
