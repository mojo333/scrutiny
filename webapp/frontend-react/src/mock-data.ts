// Mock data for demo mode
import type { DeviceSummaryModel } from '@/models/device-summary-model';
import type { ZFSPoolModel } from './models/zfs-pool-model';

const DEMO_DEVICES_KEY = 'scrutiny_demo_devices';
const DEMO_ZFS_POOLS_KEY = 'scrutiny_demo_zfs_pools';

// Generate temperature history (last 30 days, one reading per day)
function generateTempHistory(baseTemp: number, variance: number = 5): { date: string; temp: number }[] {
  const history = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const temp = baseTemp + Math.floor(Math.random() * variance * 2) - variance;
    history.push({
      date: date.toISOString(),
      temp: Math.max(20, Math.min(80, temp)) // Keep temps between 20-80°C
    });
  }
  return history;
}

export const MOCK_DEVICE_SUMMARY: Record<string, DeviceSummaryModel> = {
  '0x5000c500a8f7c8c8': {
    device: {
      wwn: '0x5000c500a8f7c8c8',
      device_name: 'sda',
      device_uuid: 'f8d5e4c3-b2a1-4567-8901-2345678901ab',
      device_serial_id: 'ata-Samsung_SSD_870_EVO_1TB_S5YJNX0R123456',
      manufacturer: 'Samsung',
      model_name: 'Samsung SSD 870 EVO 1TB',
      interface_type: 'SATA',
      interface_speed: '6.0 Gb/s',
      serial_number: 'S5YJNX0R123456',
      firmware: 'SVT02B6Q',
      rotational_speed: 0,
      capacity: 1000204886016,
      form_factor: '2.5 inches',
      smart_support: true,
      device_protocol: 'ATA',
      device_type: 'ata',
      label: 'System Drive',
      host_id: 'localhost',
      device_status: 0,
      muted: false,
    },
    smart: {
      collector_date: new Date().toISOString(),
      temp: 35,
      power_on_hours: 8760,
    },
    temp_history: generateTempHistory(35, 3),
  },
  '0x5000c500a8f7d9d9': {
    device: {
      wwn: '0x5000c500a8f7d9d9',
      device_name: 'sdb',
      device_uuid: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      device_serial_id: 'ata-WDC_WD40EFRX-68N32N0_WD-WX12D81F5678',
      manufacturer: 'Western Digital',
      model_name: 'WD Red Plus 4TB',
      interface_type: 'SATA',
      interface_speed: '6.0 Gb/s',
      serial_number: 'WD-WX12D81F5678',
      firmware: '82.00A82',
      rotational_speed: 5400,
      capacity: 4000787030016,
      form_factor: '3.5 inches',
      smart_support: true,
      device_protocol: 'ATA',
      device_type: 'ata',
      label: 'Data Drive',
      host_id: 'localhost',
      device_status: 0,
      muted: false,
    },
    smart: {
      collector_date: new Date().toISOString(),
      temp: 42,
      power_on_hours: 15000,
    },
    temp_history: generateTempHistory(42, 4),
  },
  '0x5000c500d1e2f3a4': {
    device: {
      wwn: '0x5000c500d1e2f3a4',
      device_name: 'sdc',
      device_uuid: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
      device_serial_id: 'ata-TOSHIBA_HDWE150_Y9GVK7BNFBXS',
      manufacturer: 'Toshiba',
      model_name: 'TOSHIBA HDWE150',
      interface_type: 'SATA',
      interface_speed: '6.0 Gb/s',
      serial_number: 'Y9GVK7BNFBXS',
      firmware: 'FP2A',
      rotational_speed: 7200,
      capacity: 5000981078016,
      form_factor: '3.5 inches',
      smart_support: true,
      device_protocol: 'ATA',
      device_type: 'ata',
      label: '',
      host_id: 'localhost',
      device_status: 0,
      muted: false,
    },
    smart: {
      collector_date: new Date().toISOString(),
      temp: 38,
      power_on_hours: 12000,
    },
    temp_history: generateTempHistory(38, 4),
  },
  '0x5000c500e2f3a4b5': {
    device: {
      wwn: '0x5000c500e2f3a4b5',
      device_name: 'sdd',
      device_uuid: 'c3d4e5f6-a7b8-9012-3456-7890abcdef12',
      device_serial_id: 'ata-ST5000DM000-1FK178_Z8J0ABCD',
      manufacturer: 'Seagate',
      model_name: 'ST5000DM000-1FK178',
      interface_type: 'SATA',
      interface_speed: '6.0 Gb/s',
      serial_number: 'Z8J0ABCD',
      firmware: 'CC26',
      rotational_speed: 5900,
      capacity: 5000981078016,
      form_factor: '3.5 inches',
      smart_support: true,
      device_protocol: 'ATA',
      device_type: 'ata',
      label: '',
      host_id: 'localhost',
      device_status: 0,
      muted: false,
    },
    smart: {
      collector_date: new Date().toISOString(),
      temp: 36,
      power_on_hours: 18000,
    },
    temp_history: generateTempHistory(36, 3),
  },
  '0x50014ee2b5c7e123': {
    device: {
      wwn: '0x50014ee2b5c7e123',
      device_name: 'nvme0n1',
      device_uuid: 'd4e5f6a7-b8c9-0123-4567-890abcdef123',
      device_serial_id: 'nvme-Samsung_SSD_980_PRO_2TB_S69ANF0R789012',
      manufacturer: 'Samsung',
      model_name: 'Samsung SSD 980 PRO 2TB',
      interface_type: 'NVMe',
      interface_speed: 'PCIe 4.0 x4',
      serial_number: 'S69ANF0R789012',
      firmware: '5B2QGXA7',
      rotational_speed: 0,
      capacity: 2000398934016,
      form_factor: 'M.2',
      smart_support: true,
      device_protocol: 'NVMe',
      device_type: 'nvme',
      label: 'Fast Storage',
      host_id: 'workstation',
      device_status: 0,
      muted: false,
    },
    smart: {
      collector_date: new Date().toISOString(),
      temp: 45,
      power_on_hours: 5000,
    },
    temp_history: generateTempHistory(45, 6),
  },
  '0x5000c500b3a8e456': {
    device: {
      wwn: '0x5000c500b3a8e456',
      device_name: 'sdc',
      device_uuid: 'e5f6a7b8-c9d0-1234-5678-90abcdef1234',
      device_serial_id: 'ata-ST8000VN004-2M2101_ZCT2M5JK',
      manufacturer: 'Seagate',
      model_name: 'Seagate IronWolf 8TB',
      interface_type: 'SATA',
      interface_speed: '6.0 Gb/s',
      serial_number: 'ZCT2M5JK',
      firmware: 'SC60',
      rotational_speed: 7200,
      capacity: 8001563222016,
      form_factor: '3.5 inches',
      smart_support: true,
      device_protocol: 'ATA',
      device_type: 'ata',
      label: '',
      host_id: 'nas',
      device_status: 1, // Failed - SMART
      muted: false,
    },
    smart: {
      collector_date: new Date().toISOString(),
      temp: 48,
      power_on_hours: 25000,
    },
    temp_history: generateTempHistory(48, 5),
  },
};

// Mock App Config
export const MOCK_APP_CONFIG = {
  version: '0.8.0-web',
  commit: 'dev',
  date: new Date().toISOString(),
  dashboard_display: 'name' as const,
  dashboard_sort: 'status' as const,
  temperature_unit: 'celsius' as const,
  file_size_si_units: false,
  powered_on_hours_unit: 'humanize',
  line_stroke: 'smooth' as const,
  theme: 'dark' as const,
  metrics: {
    status_threshold: 3, // Both
    status_filter_attributes: 0, // All
    notify_level: 2, // Fail
    repeat_notifications: false,
  },
  collector: {
    retrieve_sct_temperature_history: false,
  },
};

// Generate capacity history for ZFS pools
function generateCapacityHistory(baseCapacity: number, variance: number = 2): { date: string; size: number; allocated: number; free: number; capacity_percent: number; fragmentation: number; status: string }[] {
  const history = [];
  const now = new Date();
  const poolSize = 8000000000000; // 8TB

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const capacityVariance = Math.floor(Math.random() * variance * 2) - variance;
    const capacity = Math.max(30, Math.min(95, baseCapacity + capacityVariance));
    const allocated = Math.floor((poolSize * capacity) / 100);
    const free = poolSize - allocated;

    history.push({
      date: date.toISOString(),
      size: poolSize,
      allocated,
      free,
      capacity_percent: capacity,
      fragmentation: Math.floor(Math.random() * 10) + 5, // 5-15%
      status: 'ONLINE',
    });
  }
  return history;
}

// Mock ZFS Pool Summary
export const MOCK_ZFS_POOL_SUMMARY: Record<string, ZFSPoolModel> = {
  'tank-guid-12345': {
      guid: 'tank-guid-12345',
      name: 'tank',
      host_id: 'nas',
      label: 'Main Storage Pool',
      archived: false,
      muted: false,
      status: 'ONLINE',
      size: 8000000000000, // 8TB
      allocated: 5200000000000, // 5.2TB used
      free: 2800000000000, // 2.8TB free
      fragmentation: 8,
      capacity_percent: 65.0,
      scrub_state: 'finished',
      scrub_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      scrub_end: new Date(Date.now() - 6.9 * 24 * 60 * 60 * 1000).toISOString(),
      scrub_percent: 100,
      scrub_errors: 0,
      total_read_errors: 0,
      total_write_errors: 0,
      total_checksum_errors: 0,
      vdevs: [
        {
          id: 1,
          pool_guid: 'tank-guid-12345',
          name: 'tank',
          type: 'mirror',
          status: 'ONLINE',
          path: '',
          read_errors: 0,
          write_errors: 0,
          checksum_errors: 0,
          created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          children: [
            {
              id: 2,
              pool_guid: 'tank-guid-12345',
              parent_id: 1,
              name: 'sda',
              type: 'disk',
              status: 'ONLINE',
              path: '/dev/sda',
              read_errors: 0,
              write_errors: 0,
              checksum_errors: 0,
              created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 3,
              pool_guid: 'tank-guid-12345',
              parent_id: 1,
              name: 'sdb',
              type: 'disk',
              status: 'ONLINE',
              path: '/dev/sdb',
              read_errors: 0,
              write_errors: 0,
              checksum_errors: 0,
              created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ],
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  'backup-guid-67890': {
      guid: 'backup-guid-67890',
      name: 'backup',
      host_id: 'nas',
      label: '',
      archived: false,
      muted: false,
      status: 'DEGRADED',
      size: 12000000000000, // 12TB
      allocated: 10200000000000, // 10.2TB used
      free: 1800000000000, // 1.8TB free
      fragmentation: 15,
      capacity_percent: 85.0,
      scrub_state: 'scanning',
      scrub_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      scrub_end: '',
      scrub_percent: 42.5,
      scrub_errors: 3,
      total_read_errors: 3,
      total_write_errors: 0,
      total_checksum_errors: 1,
      vdevs: [
        {
          id: 4,
          pool_guid: 'backup-guid-67890',
          name: 'backup',
          type: 'raidz1',
          status: 'DEGRADED',
          path: '',
          read_errors: 3,
          write_errors: 0,
          checksum_errors: 1,
          created_at: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          children: [
            {
              id: 5,
              pool_guid: 'backup-guid-67890',
              parent_id: 4,
              name: 'sdc',
              type: 'disk',
              status: 'ONLINE',
              path: '/dev/sdc',
              read_errors: 0,
              write_errors: 0,
              checksum_errors: 0,
              created_at: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 6,
              pool_guid: 'backup-guid-67890',
              parent_id: 4,
              name: 'sdd',
              type: 'disk',
              status: 'DEGRADED',
              path: '/dev/sdd',
              read_errors: 3,
              write_errors: 0,
              checksum_errors: 1,
              created_at: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              id: 7,
              pool_guid: 'backup-guid-67890',
              parent_id: 4,
              name: 'sde',
              type: 'disk',
              status: 'ONLINE',
              path: '/dev/sde',
              read_errors: 0,
              write_errors: 0,
              checksum_errors: 0,
              created_at: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
        },
      ],
    created_at: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
};

// Mock Device Details (full SMART data)
export const MOCK_DEVICE_DETAILS: Record<string, any> = {
  '0x5000c500a8f7c8c8': {
    success: true,
    data: {
      device: MOCK_DEVICE_SUMMARY['0x5000c500a8f7c8c8'].device,
      smart_results: [
        {
          date: new Date().toISOString(),
          temp: 35,
          power_on_hours: 8760,
          power_cycle_count: 245,
          attrs: {
            1: { attribute_id: 1, name: 'Read_Error_Rate', value: 82, worst: 44, thresh: 6, raw_value: 125895744, raw_string: '125895744', when_failed: '', transformed_value: 125895744, status: 0, status_reason: '', failure_rate: 0.0 },
            3: { attribute_id: 3, name: 'Spin_Up_Time', value: 98, worst: 98, thresh: 0, raw_value: 4, raw_string: '4', when_failed: '', transformed_value: 4, status: 0, status_reason: '', failure_rate: 0.0 },
            4: { attribute_id: 4, name: 'Start_Stop_Count', value: 100, worst: 100, thresh: 20, raw_value: 76, raw_string: '76', when_failed: '', transformed_value: 76, status: 0, status_reason: '', failure_rate: 0.0 },
            5: { attribute_id: 5, name: 'Reallocated_Sector_Ct', value: 100, worst: 100, thresh: 10, raw_value: 0, raw_string: '0', when_failed: '', transformed_value: 0, status: 0, status_reason: '', failure_rate: 0.0 },
            7: { attribute_id: 7, name: 'Seek_Error_Rate', value: 94, worst: 45, thresh: 30, raw_value: 22365840, raw_string: '22365840', when_failed: '', transformed_value: 22365840, status: 0, status_reason: '', failure_rate: 0.0 },
            9: { attribute_id: 9, name: 'Power_On_Hours', value: 99, worst: 99, thresh: 0, raw_value: 8760, raw_string: '8760', when_failed: '', transformed_value: 8760, status: 0, status_reason: '', failure_rate: 0.0 },
            10: { attribute_id: 10, name: 'Spin_Retry_Count', value: 100, worst: 97, thresh: 97, raw_value: 0, raw_string: '0', when_failed: '', transformed_value: 0, status: 0, status_reason: '', failure_rate: 0.0 },
            12: { attribute_id: 12, name: 'Power_Cycle_Count', value: 100, worst: 100, thresh: 20, raw_value: 76, raw_string: '76', when_failed: '', transformed_value: 76, status: 0, status_reason: '', failure_rate: 0.0 },
            184: { attribute_id: 184, name: 'End-to-End_Error', value: 100, worst: 99, thresh: 99, raw_value: 0, raw_string: '0', when_failed: '', transformed_value: 0, status: 0, status_reason: '', failure_rate: 0.09 },
            187: { attribute_id: 187, name: 'Reported_Uncorrect', value: 100, worst: 100, thresh: 0, raw_value: 0, raw_string: '0', when_failed: '', transformed_value: 0, status: 0, status_reason: '', failure_rate: 0.03 },
            188: { attribute_id: 188, name: 'Command_Timeout', value: 100, worst: 100, thresh: 0, raw_value: 1, raw_string: '1', when_failed: '', transformed_value: 1, status: 0, status_reason: '', failure_rate: 0.02 },
            189: { attribute_id: 189, name: 'High_Fly_Writes', value: 100, worst: 100, thresh: 0, raw_value: 12, raw_string: '12', when_failed: '', transformed_value: 12, status: 0, status_reason: '', failure_rate: 0.09 },
            190: { attribute_id: 190, name: 'Airflow_Temperature_Cel', value: 66, worst: 40, thresh: 45, raw_value: 34, raw_string: '34', when_failed: '', transformed_value: 34, status: 0, status_reason: '', failure_rate: 0.0 },
            191: { attribute_id: 191, name: 'G-Sense_Error_Rate', value: 96, worst: 96, thresh: 0, raw_value: 8704, raw_string: '8704', when_failed: '', transformed_value: 8704, status: 0, status_reason: '', failure_rate: 0.0 },
            192: { attribute_id: 192, name: 'Power-Off_Retract_Count', value: 100, worst: 100, thresh: 0, raw_value: 54, raw_string: '54', when_failed: '', transformed_value: 54, status: 0, status_reason: '', failure_rate: 0.01 },
            193: { attribute_id: 193, name: 'Load_Cycle_Count', value: 100, worst: 100, thresh: 0, raw_value: 1, raw_string: '1', when_failed: '', transformed_value: 1, status: 0, status_reason: '', failure_rate: 0.0 },
            194: { attribute_id: 194, name: 'Temperature_Celsius', value: 65, worst: 47, thresh: 0, raw_value: 35, raw_string: '35', when_failed: '', transformed_value: 35, status: 0, status_reason: '', failure_rate: 0.0 },
            195: { attribute_id: 195, name: 'Hardware_ECC_Recovered', value: 100, worst: 100, thresh: 0, raw_value: 20, raw_string: '20', when_failed: '', transformed_value: 20, status: 1, status_reason: 'Attribute is failing SMART threshold test', failure_rate: 0.31 },
            197: { attribute_id: 197, name: 'Current_Pending_Sector', value: 100, worst: 100, thresh: 0, raw_value: 0, raw_string: '0', when_failed: '', transformed_value: 0, status: 0, status_reason: '', failure_rate: 0.03 },
            198: { attribute_id: 198, name: 'Offline_Uncorrectable', value: 100, worst: 100, thresh: 0, raw_value: 0, raw_string: '0', when_failed: '', transformed_value: 0, status: 0, status_reason: '', failure_rate: 0.03 },
            199: { attribute_id: 199, name: 'UDMA_CRC_Error_Count', value: 200, worst: 200, thresh: 0, raw_value: 0, raw_string: '0', when_failed: '', transformed_value: 0, status: 0, status_reason: '', failure_rate: 0.0 },
            200: { attribute_id: 200, name: 'Multi_Zone_Error_Rate', value: 100, worst: 100, thresh: 1, raw_value: 0, raw_string: '0', when_failed: '', transformed_value: 0, status: 0, status_reason: '', failure_rate: 0.0 },
            240: { attribute_id: 240, name: 'Head_Flying_Hours', value: 100, worst: 100, thresh: 0, raw_value: 8760, raw_string: '8760', when_failed: '', transformed_value: 8760, status: 0, status_reason: '', failure_rate: 0.0 },
            241: { attribute_id: 241, name: 'Total_LBAs_Written', value: 100, worst: 100, thresh: 0, raw_value: 125896, raw_string: '125896', when_failed: '', transformed_value: 125896, status: 0, status_reason: '', failure_rate: 0.0 },
            242: { attribute_id: 242, name: 'Total_LBAs_Read', value: 100, worst: 100, thresh: 0, raw_value: 98745, raw_string: '98745', when_failed: '', transformed_value: 98745, status: 0, status_reason: '', failure_rate: 0.0 },
          },
        },
      ],
    },
    metadata: {
      1: { display_name: 'Read Error Rate', ideal: 'low', critical: true, description: 'Rate of hardware read errors that occurred when reading data from a disk surface. The raw value has different structure for different vendors and is often not meaningful as a decimal number. For some drives, this number may increase during normal operation without necessarily signifying errors.', display_type: 'normalized' },
      3: { display_name: 'Spin-Up Time', ideal: 'low', critical: false, description: 'Average time of spindle spin up (time from stopped to full operational speed). Raw value shows total time spent spinning up. Changes in spinup time can reflect mechanical issues.', display_type: 'raw' },
      4: { display_name: 'Start/Stop Count', ideal: 'low', critical: true, description: 'A tally of spindle start/stop cycles. The spindle turns on, and hence the count is increased, both when the hard disk is turned on after having before been turned entirely off (disconnected from power source) and when the hard disk returns from having previously been put to sleep mode.', display_type: 'raw' },
      5: { display_name: 'Reallocated Sectors Count', ideal: 'low', critical: true, description: 'Count of reallocated sectors. When the hard drive finds a read/write/verification error, it marks that sector as "reallocated" and transfers data to a special reserved area (spare area). This process is also known as remapping, and reallocated sectors are called "remaps". The raw value normally represents a count of the bad sectors that have been found and remapped. Thus, the higher the attribute value, the more sectors the drive has had to reallocate. This allows a drive with bad sectors to continue operation; however, a drive which has had any reallocations at all is significantly more likely to fail in the near future. While primarily used as a metric of the life expectancy of the drive, this number also affects performance. As the count of reallocated sectors increases, the read/write speed tends to become worse because the drive head is forced to seek to the reserved area whenever a remap is accessed. If sequential access speed is critical, the remapped sectors can be manually marked as bad blocks in the file system in order to prevent their use.', display_type: 'normalized' },
      7: { display_name: 'Seek Error Rate', ideal: 'low', critical: true, description: 'Rate of seek errors of the magnetic heads. If there is a partial failure in the mechanical positioning system, then seek errors will arise. Such a failure may be due to numerous factors, such as damage to a servo, or thermal widening of the hard disk. The raw value has different structure for different vendors and is often not meaningful as a decimal number.', display_type: 'normalized' },
      9: { display_name: 'Power On Hours', ideal: 'low', critical: true, description: 'Count of hours in power-on state. The raw value of this attribute shows total count of hours (or minutes, or seconds, depending on manufacturer) in power-on state. By default, the total expected lifetime of a hard disk in perfect condition is defined as 5 years (running every day and night on all days). This is equal to 1825 days in 24/7 mode or 43800 hours.', display_type: 'transformed' },
      10: { display_name: 'Spin Retry Count', ideal: 'low', critical: true, description: 'Count of retry of spin start attempts. This attribute stores a total count of the spin start attempts to reach the fully operational speed (under the condition that the first attempt was unsuccessful). An increase of this attribute value is a sign of problems in the hard disk mechanical subsystem.', display_type: 'raw' },
      12: { display_name: 'Power Cycle Count', ideal: 'low', critical: false, description: 'This attribute indicates the count of full hard disk power on/off cycles. A full power cycle means a full shutdown of the device or a sleep mode (like S3 suspend to RAM on PC systems).', display_type: 'raw' },
      184: { display_name: 'End-to-End Error', ideal: 'low', critical: true, description: 'This attribute is a part of Hewlett-Packard\'s SMART IV technology, as well as part of other vendors\' IO Error Detection and Correction schemas, and it contains a count of parity errors which occur in the data path to the media via the drive\'s cache RAM.', display_type: 'raw' },
      187: { display_name: 'Reported Uncorrectable Errors', ideal: 'low', critical: true, description: 'The count of errors that could not be recovered using hardware ECC (Error Correction Code). A non-zero value indicates that some data has been lost.', display_type: 'raw' },
      188: { display_name: 'Command Timeout', ideal: 'low', critical: true, description: 'The count of aborted operations due to HDD timeout. Normally this attribute value should be equal to zero and if the value is far above zero, then most likely there will be some serious problems with power supply or an oxidized data cable.', display_type: 'raw' },
      189: { display_name: 'High Fly Writes', ideal: 'low', critical: true, description: 'Count of times a recording head is flying outside its normal operating range. If the flight height is too high or too low, the head may hit the disk surface (head crash) or fail to read/write properly.', display_type: 'raw' },
      190: { display_name: 'Airflow Temperature', ideal: 'low', critical: false, description: 'Airflow temperature of the drive (usually requires a special heat sensor). High airflow temperatures can indicate insufficient cooling or an environmental problem.', display_type: 'transformed' },
      191: { display_name: 'G-sense Error Rate', ideal: 'low', critical: false, description: 'Count of errors as a result of externally induced shock and vibration (G-shock). High values indicate the drive is being subjected to excessive physical shock, which can cause damage over time.', display_type: 'raw' },
      192: { display_name: 'Power-off Retract Count', ideal: 'low', critical: true, description: 'Count of power-off or emergency retract cycles. This value is increased when the heads are moved to the parking position due to a power failure or an emergency head retraction.', display_type: 'raw' },
      193: { display_name: 'Load Cycle Count', ideal: 'low', critical: false, description: 'Count of load/unload cycles into head landing zone position. Some laptop HDDs are programmed to unload the heads very frequently, which can wear out the drive prematurely.', display_type: 'raw' },
      194: { display_name: 'Temperature', ideal: 'low', critical: true, description: 'Current internal temperature of the drive. Higher temperatures indicate that the drive may be overheating, which can lead to decreased lifespan or immediate failures.', display_type: 'transformed' },
      195: { display_name: 'Hardware ECC Recovered', ideal: 'low', critical: true, description: 'Time between ECC-corrected errors or count of errors that the Error Correction Code (ECC) was able to recover using hardware mechanisms. This is different from software correction, and indicates marginal sectors that may fail in the future.', display_type: 'raw' },
      197: { display_name: 'Current Pending Sector Count', ideal: 'low', critical: true, description: 'Count of "unstable" sectors (waiting to be remapped, because of unrecoverable read errors). If an unstable sector is subsequently read successfully, the sector is remapped and this value is decreased. Read errors on a sector will not remap the sector immediately (since the correct value cannot be read and so the value to remap is not known, and also it might become readable later); instead, the drive firmware remembers that the sector needs to be remapped, and will remap it the next time it\'s written. However some drives will not immediately remap such sectors when written; instead the drive will first attempt to write to the problem sector and if the write operation is successful then the sector will be marked good (in this case, the "Reallocation Event Count" (0xC4) will not be increased). This is a serious indicator; any non-zero value indicates that data is at risk.', display_type: 'raw' },
      198: { display_name: 'Offline Uncorrectable Sector Count', ideal: 'low', critical: true, description: 'The total count of uncorrectable errors when reading/writing a sector. A rise in the value of this attribute indicates defects of the disk surface and/or problems in the mechanical subsystem.', display_type: 'raw' },
      199: { display_name: 'UltraDMA CRC Error Count', ideal: 'low', critical: false, description: 'The count of errors in data transfer via the interface cable as determined by ICRC (Interface Cyclic Redundancy Check). A non-zero attribute value indicates problems with the interface cable or connection.', display_type: 'raw' },
      200: { display_name: 'Multi-Zone Error Rate', ideal: 'low', critical: false, description: 'Count of errors found when writing a sector', display_type: 'raw' },
      240: { display_name: 'Head Flying Hours', ideal: 'low', critical: false, description: 'Time spent during the positioning of the drive heads', display_type: 'raw' },
      241: { display_name: 'Total LBAs Written', ideal: 'low', critical: false, description: 'Total number of sectors written', display_type: 'raw' },
      242: { display_name: 'Total LBAs Read', ideal: 'low', critical: false, description: 'Total number of sectors read', display_type: 'raw' },
    },
  },
};

// Generate mock device details on the fly with history
export function generateMockDeviceDetails(wwn: string) {
  const deviceSummary = MOCK_DEVICE_SUMMARY[wwn];
  if (!deviceSummary) {
    // Fallback to first device if WWN not found
    return MOCK_DEVICE_DETAILS['0x5000c500a8f7c8c8'];
  }

  // Generate SMART history (last 10 measurements over 30 days)
  const smartHistory = [];
  const now = new Date();
  for (let i = 9; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 3 * 24 * 60 * 60 * 1000); // Every 3 days
    const dayVariance = Math.floor(Math.random() * 10) - 5; // -5 to +5
    smartHistory.push({
      date: date.toISOString(),
      temp: deviceSummary.smart?.temp ? deviceSummary.smart.temp + dayVariance : 35,
      power_on_hours: (deviceSummary.smart?.power_on_hours || 8760) + (i * 72), // +72 hours per 3 days
      power_cycle_count: 245 + i,
      attrs: {
        5: {
          attribute_id: 5,
          name: 'Reallocated_Sector_Ct',
          value: 100,
          worst: 100,
          thresh: 10,
          raw_value: 0,
          raw_string: '0',
          when_failed: '',
          transformed_value: 0,
          status: 0,
          status_reason: '',
          failure_rate: 0.0,
        },
        9: {
          attribute_id: 9,
          name: 'Power_On_Hours',
          value: 99,
          worst: 99,
          thresh: 0,
          raw_value: (deviceSummary.smart?.power_on_hours || 8760) + (i * 72),
          raw_string: String((deviceSummary.smart?.power_on_hours || 8760) + (i * 72)),
          when_failed: '',
          transformed_value: (deviceSummary.smart?.power_on_hours || 8760) + (i * 72),
          status: 0,
          status_reason: '',
          failure_rate: 0.0,
        },
        12: {
          attribute_id: 12,
          name: 'Power_Cycle_Count',
          value: 99,
          worst: 99,
          thresh: 0,
          raw_value: 245 + i,
          raw_string: String(245 + i),
          when_failed: '',
          transformed_value: 245 + i,
          status: 0,
          status_reason: '',
          failure_rate: 0.0,
        },
        177: {
          attribute_id: 177,
          name: 'Wear_Leveling_Count',
          value: 99 - Math.floor(i / 2),
          worst: 99 - Math.floor(i / 2),
          thresh: 0,
          raw_value: 14 + Math.floor(i / 3),
          raw_string: String(14 + Math.floor(i / 3)),
          when_failed: '',
          transformed_value: 14 + Math.floor(i / 3),
          status: 0,
          status_reason: '',
          failure_rate: 0.0,
        },
        194: {
          attribute_id: 194,
          name: 'Temperature_Celsius',
          value: 65,
          worst: 47,
          thresh: 0,
          raw_value: deviceSummary.smart?.temp ? deviceSummary.smart.temp + dayVariance : 35,
          raw_string: String(deviceSummary.smart?.temp ? deviceSummary.smart.temp + dayVariance : 35),
          when_failed: '',
          transformed_value: deviceSummary.smart?.temp ? deviceSummary.smart.temp + dayVariance : 35,
          status: 0,
          status_reason: '',
          failure_rate: 0.0,
        },
        195: {
          attribute_id: 195,
          name: 'Hardware_ECC_Recovered',
          value: 200,
          worst: 200,
          thresh: 0,
          raw_value: 0,
          raw_string: '0',
          when_failed: '',
          transformed_value: 0,
          status: 0,
          status_reason: '',
          failure_rate: 0.0,
        },
      },
    });
  }

  return {
    success: true,
    data: {
      device: deviceSummary.device,
      smart_results: smartHistory.reverse(), // Most recent first
    },
    metadata: {
      1: {
        display_name: 'Read Error Rate',
        ideal: 'low',
        critical: true,
        description: 'Rate of hardware read errors that occurred when reading data from a disk surface. The raw value has different structure for different vendors and is often not meaningful as a decimal number. For some drives, this number may increase during normal operation without necessarily signifying errors.',
        display_type: 'normalized',
      },
      4: {
        display_name: 'Start/Stop Count',
        ideal: 'low',
        critical: true,
        description: 'A tally of spindle start/stop cycles. The spindle turns on, and hence the count is increased, both when the hard disk is turned on after having before been turned entirely off (disconnected from power source) and when the hard disk returns from having previously been put to sleep mode.',
        display_type: 'raw',
      },
      5: {
        display_name: 'Reallocated Sectors Count',
        ideal: 'low',
        critical: true,
        description: 'Count of reallocated sectors. When the hard drive finds a read/write/verification error, it marks that sector as "reallocated" and transfers data to a special reserved area (spare area). This process is also known as remapping, and reallocated sectors are called "remaps". The raw value normally represents a count of the bad sectors that have been found and remapped. Thus, the higher the attribute value, the more sectors the drive has had to reallocate. This allows a drive with bad sectors to continue operation; however, a drive which has had any reallocations at all is significantly more likely to fail in the near future. While primarily used as a metric of the life expectancy of the drive, this number also affects performance. As the count of reallocated sectors increases, the read/write speed tends to become worse because the drive head is forced to seek to the reserved area whenever a remap is accessed. If sequential access speed is critical, the remapped sectors can be manually marked as bad blocks in the file system in order to prevent their use.',
        display_type: 'normalized',
      },
      7: {
        display_name: 'Seek Error Rate',
        ideal: 'low',
        critical: true,
        description: 'Rate of seek errors of the magnetic heads. If there is a partial failure in the mechanical positioning system, then seek errors will arise. Such a failure may be due to numerous factors, such as damage to a servo, or thermal widening of the hard disk. The raw value has different structure for different vendors and is often not meaningful as a decimal number.',
        display_type: 'normalized',
      },
      9: {
        display_name: 'Power On Hours',
        ideal: 'low',
        critical: true,
        description: 'Count of hours in power-on state. The raw value of this attribute shows total count of hours (or minutes, or seconds, depending on manufacturer) in power-on state. By default, the total expected lifetime of a hard disk in perfect condition is defined as 5 years (running every day and night on all days). This is equal to 1825 days in 24/7 mode or 43800 hours.',
        display_type: 'transformed',
      },
      10: {
        display_name: 'Spin Retry Count',
        ideal: 'low',
        critical: true,
        description: 'Count of retry of spin start attempts. This attribute stores a total count of the spin start attempts to reach the fully operational speed (under the condition that the first attempt was unsuccessful). An increase of this attribute value is a sign of problems in the hard disk mechanical subsystem.',
        display_type: 'raw',
      },
      12: {
        display_name: 'Power Cycle Count',
        ideal: 'low',
        critical: false,
        description: 'This attribute indicates the count of full hard disk power on/off cycles. A full power cycle means a full shutdown of the device or a sleep mode (like S3 suspend to RAM on PC systems).',
        display_type: 'raw',
      },
      177: {
        display_name: 'Wear Leveling Count',
        ideal: 'low',
        critical: true,
        description: 'Number that represents the number of media program and erase operations (in percentage points). Specific to SSD drives, this indicates how evenly data is distributed across the memory cells.',
        display_type: 'normalized',
      },
      184: {
        display_name: 'End-to-End Error',
        ideal: 'low',
        critical: true,
        description: 'This attribute is a part of Hewlett-Packard\'s SMART IV technology, as well as part of other vendors\' IO Error Detection and Correction schemas, and it contains a count of parity errors which occur in the data path to the media via the drive\'s cache RAM.',
        display_type: 'raw',
      },
      187: {
        display_name: 'Reported Uncorrectable Errors',
        ideal: 'low',
        critical: true,
        description: 'The count of errors that could not be recovered using hardware ECC (Error Correction Code). A non-zero value indicates that some data has been lost.',
        display_type: 'raw',
      },
      188: {
        display_name: 'Command Timeout',
        ideal: 'low',
        critical: true,
        description: 'The count of aborted operations due to HDD timeout. Normally this attribute value should be equal to zero and if the value is far above zero, then most likely there will be some serious problems with power supply or an oxidized data cable.',
        display_type: 'raw',
      },
      189: {
        display_name: 'High Fly Writes',
        ideal: 'low',
        critical: true,
        description: 'Count of times a recording head is flying outside its normal operating range. If the flight height is too high or too low, the head may hit the disk surface (head crash) or fail to read/write properly.',
        display_type: 'raw',
      },
      192: {
        display_name: 'Power-off Retract Count',
        ideal: 'low',
        critical: true,
        description: 'Count of power-off or emergency retract cycles. This value is increased when the heads are moved to the parking position due to a power failure or an emergency head retraction.',
        display_type: 'raw',
      },
      194: {
        display_name: 'Temperature',
        ideal: 'low',
        critical: true,
        description: 'Current internal temperature of the drive. Higher temperatures indicate that the drive may be overheating, which can lead to decreased lifespan or immediate failures.',
        display_type: 'transformed',
      },
      195: {
        display_name: 'Hardware ECC Recovered',
        ideal: 'low',
        critical: true,
        description: 'Time between ECC-corrected errors or count of errors that the Error Correction Code (ECC) was able to recover using hardware mechanisms. This is different from software correction, and indicates marginal sectors that may fail in the future.',
        display_type: 'raw',
      },
      197: {
        display_name: 'Current Pending Sector Count',
        ideal: 'low',
        critical: true,
        description: 'Count of "unstable" sectors (waiting to be remapped, because of unrecoverable read errors). If an unstable sector is subsequently read successfully, the sector is remapped and this value is decreased. Read errors on a sector will not remap the sector immediately (since the correct value cannot be read and so the value to remap is not known, and also it might become readable later); instead, the drive firmware remembers that the sector needs to be remapped, and will remap it the next time it\'s written. However some drives will not immediately remap such sectors when written; instead the drive will first attempt to write to the problem sector and if the write operation is successful then the sector will be marked good (in this case, the "Reallocation Event Count" (0xC4) will not be increased). This is a serious indicator; any non-zero value indicates that data is at risk.',
        display_type: 'raw',
      },
      198: {
        display_name: 'Offline Uncorrectable Sector Count',
        ideal: 'low',
        critical: true,
        description: 'The total count of uncorrectable errors when reading/writing a sector. A rise in the value of this attribute indicates defects of the disk surface and/or problems in the mechanical subsystem.',
        display_type: 'raw',
      },
      199: {
        display_name: 'UltraDMA CRC Error Count',
        ideal: 'low',
        critical: false,
        description: 'The count of errors in data transfer via the interface cable as determined by ICRC (Interface Cyclic Redundancy Check). A non-zero attribute value indicates problems with the interface cable or connection.',
        display_type: 'raw',
      },
    },
  };
}

// Check if we're in demo mode
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true' ||
         localStorage.getItem('demo_mode') === 'true' ||
         window.location.search.includes('demo=true');
}

// Get devices from localStorage or use defaults
export function getDemoDevices(): Record<string, DeviceSummaryModel> {
  const stored = localStorage.getItem(DEMO_DEVICES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { ...MOCK_DEVICE_SUMMARY };
    }
  }
  return { ...MOCK_DEVICE_SUMMARY };
}

// Save devices to localStorage
function saveDemoDevices(devices: Record<string, DeviceSummaryModel>) {
  localStorage.setItem(DEMO_DEVICES_KEY, JSON.stringify(devices));
}

// Mute a device
export function demoMuteDevice(wwn: string) {
  const devices = getDemoDevices();
  if (devices[wwn]) {
    devices[wwn].device.muted = true;
    saveDemoDevices(devices);
  }
}

// Unmute a device
export function demoUnmuteDevice(wwn: string) {
  const devices = getDemoDevices();
  if (devices[wwn]) {
    devices[wwn].device.muted = false;
    saveDemoDevices(devices);
  }
}

// Archive a device
export function demoArchiveDevice(wwn: string) {
  const devices = getDemoDevices();
  if (devices[wwn]) {
    devices[wwn].device.archived = true;
    saveDemoDevices(devices);
  }
}

// Unarchive a device
export function demoUnarchiveDevice(wwn: string) {
  const devices = getDemoDevices();
  if (devices[wwn]) {
    devices[wwn].device.archived = false;
    saveDemoDevices(devices);
  }
}

// Delete a device
export function demoDeleteDevice(wwn: string) {
  const devices = getDemoDevices();
  delete devices[wwn];
  saveDemoDevices(devices);
}

// Set device label
export function demoSetDeviceLabel(wwn: string, label: string) {
  const devices = getDemoDevices();
  if (devices[wwn]) {
    devices[wwn].device.label = label;
    saveDemoDevices(devices);
  }
}

// ========== ZFS Pool Demo Functions ==========

// Get ZFS pools from localStorage or use defaults
export function getDemoZFSPools(): Record<string, ZFSPoolModel> {
  const stored = localStorage.getItem(DEMO_ZFS_POOLS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { ...MOCK_ZFS_POOL_SUMMARY };
    }
  }
  return { ...MOCK_ZFS_POOL_SUMMARY };
}

// Save ZFS pools to localStorage
function saveDemoZFSPools(pools: Record<string, ZFSPoolModel>) {
  localStorage.setItem(DEMO_ZFS_POOLS_KEY, JSON.stringify(pools));
}

// Archive a ZFS pool
export function demoArchiveZFSPool(guid: string) {
  const pools = getDemoZFSPools();
  if (pools[guid]) {
    pools[guid].archived = true;
    saveDemoZFSPools(pools);
  }
}

// Unarchive a ZFS pool
export function demoUnarchiveZFSPool(guid: string) {
  const pools = getDemoZFSPools();
  if (pools[guid]) {
    pools[guid].archived = false;
    saveDemoZFSPools(pools);
  }
}

// Mute a ZFS pool
export function demoMuteZFSPool(guid: string) {
  const pools = getDemoZFSPools();
  if (pools[guid]) {
    pools[guid].muted = true;
    saveDemoZFSPools(pools);
  }
}

// Unmute a ZFS pool
export function demoUnmuteZFSPool(guid: string) {
  const pools = getDemoZFSPools();
  if (pools[guid]) {
    pools[guid].muted = false;
    saveDemoZFSPools(pools);
  }
}

// Delete a ZFS pool
export function demoDeleteZFSPool(guid: string) {
  const pools = getDemoZFSPools();
  delete pools[guid];
  saveDemoZFSPools(pools);
}

// Set ZFS pool label
export function demoSetZFSPoolLabel(guid: string, label: string) {
  const pools = getDemoZFSPools();
  if (pools[guid]) {
    pools[guid].label = label;
    saveDemoZFSPools(pools);
  }
}

// Generate mock ZFS pool details with capacity history
export function generateMockZFSPoolDetails(guid: string) {
  const pool = getDemoZFSPools()[guid];
  if (!pool) {
    // Fallback to first pool if guid not found
    const firstGuid = Object.keys(MOCK_ZFS_POOL_SUMMARY)[0];
    return {
      pool: MOCK_ZFS_POOL_SUMMARY[firstGuid],
      metrics_history: generateCapacityHistory(65, 3),
    };
  }

  return {
    pool: pool,
    metrics_history: generateCapacityHistory(pool.capacity_percent, 3),
  };
}
