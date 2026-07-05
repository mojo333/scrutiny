package database

import (
	"errors"
	"fmt"

	"github.com/analogj/scrutiny/webapp/backend/pkg/database/migrations/m20201107210306"
	"github.com/analogj/scrutiny/webapp/backend/pkg/models/collector"
	"github.com/analogj/scrutiny/webapp/backend/pkg/models/measurements"
	"github.com/influxdata/influxdb-client-go/v2/api/http"
	log "github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// When adding data to influxdb, an error may be returned if the data point is outside the range of the retention policy.
// This function will ignore retention policy errors, and allow the migration to continue.
func ignorePastRetentionPolicyError(err error) error {
	var influxDbWriteError *http.Error
	if errors.As(err, &influxDbWriteError) {
		if influxDbWriteError.StatusCode == 422 {
			log.Infoln("ignoring error: attempted to writePoint past retention period duration")
			return nil
		}
	}
	return err
}

// Deprecated
func m20201107210306_FromPreInfluxDBTempCreatePostInfluxDBTemp(preDevice m20201107210306.Device, preSmartResult m20201107210306.Smart) (error, measurements.SmartTemperature) {
	//extract temperature data for every datapoint
	postSmartTemp := measurements.SmartTemperature{
		Date: preSmartResult.TestDate,
		Temp: preSmartResult.Temp,
	}

	return nil, postSmartTemp
}

// Deprecated
func m20201107210306_FromPreInfluxDBSmartResultsCreatePostInfluxDBSmartResults(database *gorm.DB, preDevice m20201107210306.Device, preSmartResult m20201107210306.Smart) (error, measurements.Smart) {
	//create a measurements.Smart object (which we will then push to the InfluxDB)
	postDeviceSmartData := measurements.Smart{
		Date:            preSmartResult.TestDate,
		DeviceWWN:       preDevice.WWN,
		DeviceProtocol:  preDevice.DeviceProtocol,
		Temp:            preSmartResult.Temp,
		PowerOnHours:    preSmartResult.PowerOnHours,
		PowerCycleCount: preSmartResult.PowerCycleCount,

		// this needs to be populated using measurements.Smart.ProcessAtaSmartInfo, ProcessScsiSmartInfo or ProcessNvmeSmartInfo
		// because those functions will take into account thresholds (which we didn't consider correctly previously)
		Attributes: map[string]measurements.SmartAttribute{},
	}

	result := database.Preload("AtaAttributes").Preload("NvmeAttributes").Preload("ScsiAttributes").Find(&preSmartResult)
	if result.Error != nil {
		return result.Error, postDeviceSmartData
	}

	if preDevice.IsAta() {
		preAtaSmartAttributesTable := []collector.AtaSmartAttributesTableItem{}
		for _, preAtaAttribute := range preSmartResult.AtaAttributes {
			preAtaSmartAttributesTable = append(preAtaSmartAttributesTable, collector.AtaSmartAttributesTableItem{
				ID:         preAtaAttribute.AttributeId,
				Name:       preAtaAttribute.Name,
				Value:      int64(preAtaAttribute.Value),
				Worst:      int64(preAtaAttribute.Worst),
				Thresh:     int64(preAtaAttribute.Threshold),
				WhenFailed: preAtaAttribute.WhenFailed,
				Flags: struct {
					Value         int    `json:"value"`
					String        string `json:"string"`
					Prefailure    bool   `json:"prefailure"`
					UpdatedOnline bool   `json:"updated_online"`
					Performance   bool   `json:"performance"`
					ErrorRate     bool   `json:"error_rate"`
					EventCount    bool   `json:"event_count"`
					AutoKeep      bool   `json:"auto_keep"`
				}{
					Value:         0,
					String:        "",
					Prefailure:    false,
					UpdatedOnline: false,
					Performance:   false,
					ErrorRate:     false,
					EventCount:    false,
					AutoKeep:      false,
				},
				Raw: struct {
					Value  int64  `json:"value"`
					String string `json:"string"`
				}{
					Value:  preAtaAttribute.RawValue,
					String: preAtaAttribute.RawString,
				},
			})
		}

		postDeviceSmartData.ProcessAtaSmartInfo(preAtaSmartAttributesTable)

	} else if preDevice.IsNvme() {
		//info collector.SmartInfo
		postNvmeSmartHealthInformation := collector.NvmeSmartHealthInformationLog{}

		for _, preNvmeAttribute := range preSmartResult.NvmeAttributes {
			switch preNvmeAttribute.AttributeId {
			case "critical_warning":
				postNvmeSmartHealthInformation.CriticalWarning = int64(preNvmeAttribute.Value)
			case "temperature":
				postNvmeSmartHealthInformation.Temperature = int64(preNvmeAttribute.Value)
			case "available_spare":
				postNvmeSmartHealthInformation.AvailableSpare = int64(preNvmeAttribute.Value)
			case "available_spare_threshold":
				postNvmeSmartHealthInformation.AvailableSpareThreshold = int64(preNvmeAttribute.Value)
			case "percentage_used":
				postNvmeSmartHealthInformation.PercentageUsed = int64(preNvmeAttribute.Value)
			case "data_units_read":
				postNvmeSmartHealthInformation.DataUnitsRead = int64(preNvmeAttribute.Value)
			case "data_units_written":
				postNvmeSmartHealthInformation.DataUnitsWritten = int64(preNvmeAttribute.Value)
			case "host_reads":
				postNvmeSmartHealthInformation.HostReads = int64(preNvmeAttribute.Value)
			case "host_writes":
				postNvmeSmartHealthInformation.HostWrites = int64(preNvmeAttribute.Value)
			case "controller_busy_time":
				postNvmeSmartHealthInformation.ControllerBusyTime = int64(preNvmeAttribute.Value)
			case "power_cycles":
				postNvmeSmartHealthInformation.PowerCycles = int64(preNvmeAttribute.Value)
			case "power_on_hours":
				postNvmeSmartHealthInformation.PowerOnHours = int64(preNvmeAttribute.Value)
			case "unsafe_shutdowns":
				postNvmeSmartHealthInformation.UnsafeShutdowns = int64(preNvmeAttribute.Value)
			case "media_errors":
				postNvmeSmartHealthInformation.MediaErrors = int64(preNvmeAttribute.Value)
			case "num_err_log_entries":
				postNvmeSmartHealthInformation.NumErrLogEntries = int64(preNvmeAttribute.Value)
			case "warning_temp_time":
				postNvmeSmartHealthInformation.WarningTempTime = int64(preNvmeAttribute.Value)
			case "critical_comp_time":
				postNvmeSmartHealthInformation.CriticalCompTime = int64(preNvmeAttribute.Value)
			}
		}

		postDeviceSmartData.ProcessNvmeSmartInfo(postNvmeSmartHealthInformation)

	} else if preDevice.IsScsi() {
		//info collector.SmartInfo
		var postScsiGrownDefectList int64
		postScsiErrorCounterLog := collector.ScsiErrorCounterLog{
			Read: struct {
				ErrorsCorrectedByEccfast         int64  `json:"errors_corrected_by_eccfast"`
				ErrorsCorrectedByEccdelayed      int64  `json:"errors_corrected_by_eccdelayed"`
				ErrorsCorrectedByRereadsRewrites int64  `json:"errors_corrected_by_rereads_rewrites"`
				TotalErrorsCorrected             int64  `json:"total_errors_corrected"`
				CorrectionAlgorithmInvocations   int64  `json:"correction_algorithm_invocations"`
				GigabytesProcessed               string `json:"gigabytes_processed"`
				TotalUncorrectedErrors           int64  `json:"total_uncorrected_errors"`
			}{},
			Write: struct {
				ErrorsCorrectedByEccfast         int64  `json:"errors_corrected_by_eccfast"`
				ErrorsCorrectedByEccdelayed      int64  `json:"errors_corrected_by_eccdelayed"`
				ErrorsCorrectedByRereadsRewrites int64  `json:"errors_corrected_by_rereads_rewrites"`
				TotalErrorsCorrected             int64  `json:"total_errors_corrected"`
				CorrectionAlgorithmInvocations   int64  `json:"correction_algorithm_invocations"`
				GigabytesProcessed               string `json:"gigabytes_processed"`
				TotalUncorrectedErrors           int64  `json:"total_uncorrected_errors"`
			}{},
		}

		for _, preScsiAttribute := range preSmartResult.ScsiAttributes {
			switch preScsiAttribute.AttributeId {
			case "scsi_grown_defect_list":
				postScsiGrownDefectList = int64(preScsiAttribute.Value)
			case "read.errors_corrected_by_eccfast":
				postScsiErrorCounterLog.Read.ErrorsCorrectedByEccfast = int64(preScsiAttribute.Value)
			case "read.errors_corrected_by_eccdelayed":
				postScsiErrorCounterLog.Read.ErrorsCorrectedByEccdelayed = int64(preScsiAttribute.Value)
			case "read.errors_corrected_by_rereads_rewrites":
				postScsiErrorCounterLog.Read.ErrorsCorrectedByRereadsRewrites = int64(preScsiAttribute.Value)
			case "read.total_errors_corrected":
				postScsiErrorCounterLog.Read.TotalErrorsCorrected = int64(preScsiAttribute.Value)
			case "read.correction_algorithm_invocations":
				postScsiErrorCounterLog.Read.CorrectionAlgorithmInvocations = int64(preScsiAttribute.Value)
			case "read.total_uncorrected_errors":
				postScsiErrorCounterLog.Read.TotalUncorrectedErrors = int64(preScsiAttribute.Value)
			case "write.errors_corrected_by_eccfast":
				postScsiErrorCounterLog.Write.ErrorsCorrectedByEccfast = int64(preScsiAttribute.Value)
			case "write.errors_corrected_by_eccdelayed":
				postScsiErrorCounterLog.Write.ErrorsCorrectedByEccdelayed = int64(preScsiAttribute.Value)
			case "write.errors_corrected_by_rereads_rewrites":
				postScsiErrorCounterLog.Write.ErrorsCorrectedByRereadsRewrites = int64(preScsiAttribute.Value)
			case "write.total_errors_corrected":
				postScsiErrorCounterLog.Write.TotalErrorsCorrected = int64(preScsiAttribute.Value)
			case "write.correction_algorithm_invocations":
				postScsiErrorCounterLog.Write.CorrectionAlgorithmInvocations = int64(preScsiAttribute.Value)
			case "write.total_uncorrected_errors":
				postScsiErrorCounterLog.Write.TotalUncorrectedErrors = int64(preScsiAttribute.Value)
			}
		}
		postDeviceSmartData.ProcessScsiSmartInfo(postScsiGrownDefectList, postScsiErrorCounterLog)
	} else {
		return fmt.Errorf("unknown device protocol: %s", preDevice.DeviceProtocol), postDeviceSmartData
	}

	return nil, postDeviceSmartData
}
