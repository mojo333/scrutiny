package database

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/analogj/scrutiny/webapp/backend/pkg"
	"github.com/analogj/scrutiny/webapp/backend/pkg/database/migrations/m20201107210306"
	"github.com/analogj/scrutiny/webapp/backend/pkg/database/migrations/m20220503120000"
	"github.com/analogj/scrutiny/webapp/backend/pkg/database/migrations/m20220509170100"
	"github.com/analogj/scrutiny/webapp/backend/pkg/database/migrations/m20220716214900"
	"github.com/analogj/scrutiny/webapp/backend/pkg/database/migrations/m20250221084400"
	"github.com/analogj/scrutiny/webapp/backend/pkg/database/migrations/m20251108044508"
	"github.com/analogj/scrutiny/webapp/backend/pkg/database/migrations/m20260108000000"
	"github.com/analogj/scrutiny/webapp/backend/pkg/models"
	_ "github.com/glebarez/sqlite"
	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"
)

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SQLite migrations
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//database.AutoMigrate(&models.Device{})

func (sr *scrutinyRepository) Migrate(ctx context.Context) error {

	sr.logger.Infoln("Database migration starting. Please wait, this process may take a long time....")

	gormMigrateOptions := gormigrate.DefaultOptions
	gormMigrateOptions.UseTransaction = true

	m := gormigrate.New(sr.gormClient, gormMigrateOptions, []*gormigrate.Migration{
		{
			ID: "20201107210306", // v0.3.13 (pre-influxdb schema). 9fac3c6308dc6cb6cd5bbc43a68cd93e8fb20b87
			Migrate: func(tx *gorm.DB) error {
				// it's a good practice to copy the struct inside the function,

				return tx.AutoMigrate(
					&m20201107210306.Device{},
					&m20201107210306.Smart{},
					&m20201107210306.SmartAtaAttribute{},
					&m20201107210306.SmartNvmeAttribute{},
					&m20201107210306.SmartNvmeAttribute{},
				)
			},
		},
		{
			ID: "20220503113100", // backwards compatible - influxdb schema
			Migrate: func(tx *gorm.DB) error {
				// delete unnecessary table.
				err := tx.Migrator().DropTable("self_tests")
				if err != nil {
					return err
				}

				//add columns to the Device schema, so we can start adding data to the database & influxdb
				err = tx.Migrator().AddColumn(&models.Device{}, "Label") //Label  string `json:"label"`
				if err != nil {
					return err
				}
				err = tx.Migrator().AddColumn(&models.Device{}, "DeviceStatus") //DeviceStatus pkg.DeviceStatus `json:"device_status"`
				if err != nil {
					return err
				}

				//TODO: migrate the data from GORM to influxdb.
				//get a list of all devices:
				//	get a list of all smart scans in the last 2 weeks:
				//		get a list of associated smart attribute data:
				//			translate to a measurements.Smart{} object
				//			call CUSTOM INFLUXDB SAVE FUNCTION (taking bucket as parameter)
				//	get a list of all smart scans in the last 9 weeks:
				//		do same as above (select 1 scan per week)
				//	get a list of all smart scans in the last 25 months:
				//		do same as above (select 1 scan per month)
				//	get a list of all smart scans:
				//		do same as above (select 1 scan per year)

				preDevices := []m20201107210306.Device{} //pre-migration device information
				if err = tx.Preload("SmartResults", func(db *gorm.DB) *gorm.DB {
					return db.Order("smarts.created_at ASC") //OLD: .Limit(devicesCount)
				}).Find(&preDevices).Error; err != nil {
					sr.logger.Errorln("Could not get device summary from DB", err)
					return err
				}

				//calculate bucket oldest dates
				today := time.Now()
				dailyBucketMax := today.Add(-RETENTION_PERIOD_15_DAYS_IN_SECONDS * time.Second)     //15 days
				weeklyBucketMax := today.Add(-RETENTION_PERIOD_9_WEEKS_IN_SECONDS * time.Second)    //9 weeks
				monthlyBucketMax := today.Add(-RETENTION_PERIOD_25_MONTHS_IN_SECONDS * time.Second) //25 weeks

				for _, preDevice := range preDevices {
					sr.logger.Debugf("====================================")
					sr.logger.Infof("begin processing device: %s", preDevice.WWN)

					//weekly, monthly, yearly lookup storage, so we don't add more data to the buckets than necessary.
					weeklyLookup := map[string]bool{}
					monthlyLookup := map[string]bool{}
					yearlyLookup := map[string]bool{}
					for _, preSmartResult := range preDevice.SmartResults { //pre-migration smart results

						//we're looping in ASC mode, so from oldest entry to most current.

						err, postSmartResults := m20201107210306_FromPreInfluxDBSmartResultsCreatePostInfluxDBSmartResults(tx, preDevice, preSmartResult)
						if err != nil {
							return err
						}
						smartTags, smartFields := postSmartResults.Flatten()

						err, postSmartTemp := m20201107210306_FromPreInfluxDBTempCreatePostInfluxDBTemp(preDevice, preSmartResult)
						if err != nil {
							return err
						}
						tempTags, tempFields := postSmartTemp.Flatten()
						tempTags["device_wwn"] = preDevice.WWN

						year, week := postSmartResults.Date.ISOWeek()
						month := postSmartResults.Date.Month()

						yearStr := strconv.Itoa(year)
						yearMonthStr := fmt.Sprintf("%d-%d", year, month)
						yearWeekStr := fmt.Sprintf("%d-%d", year, week)

						//write data to daily bucket if in the last 15 days
						if postSmartResults.Date.After(dailyBucketMax) {
							sr.logger.Debugf("device (%s) smart data added to bucket: daily", preDevice.WWN)
							// write point immediately
							err = sr.saveDatapoint(
								sr.influxClient.WriteAPIBlocking(sr.appConfig.GetString("web.influxdb.org"), sr.appConfig.GetString("web.influxdb.bucket")),
								"smart",
								smartTags,
								smartFields,
								postSmartResults.Date, ctx)
							if ignorePastRetentionPolicyError(err) != nil {
								return err
							}

							err = sr.saveDatapoint(
								sr.influxClient.WriteAPIBlocking(sr.appConfig.GetString("web.influxdb.org"), sr.appConfig.GetString("web.influxdb.bucket")),
								"temp",
								tempTags,
								tempFields,
								postSmartResults.Date, ctx)
							if ignorePastRetentionPolicyError(err) != nil {
								return err
							}
						}

						//write data to the weekly bucket if in the last 9 weeks, and week has not been processed yet
						if _, weekExists := weeklyLookup[yearWeekStr]; !weekExists && postSmartResults.Date.After(weeklyBucketMax) {
							sr.logger.Debugf("device (%s) smart data added to bucket: weekly", preDevice.WWN)

							//this week/year pair has not been processed
							weeklyLookup[yearWeekStr] = true
							// write point immediately
							err = sr.saveDatapoint(
								sr.influxClient.WriteAPIBlocking(sr.appConfig.GetString("web.influxdb.org"), fmt.Sprintf("%s_weekly", sr.appConfig.GetString("web.influxdb.bucket"))),
								"smart",
								smartTags,
								smartFields,
								postSmartResults.Date, ctx)

							if ignorePastRetentionPolicyError(err) != nil {
								return err
							}

							err = sr.saveDatapoint(
								sr.influxClient.WriteAPIBlocking(sr.appConfig.GetString("web.influxdb.org"), fmt.Sprintf("%s_weekly", sr.appConfig.GetString("web.influxdb.bucket"))),
								"temp",
								tempTags,
								tempFields,
								postSmartResults.Date, ctx)
							if ignorePastRetentionPolicyError(err) != nil {
								return err
							}
						}

						//write data to the monthly bucket if in the last 9 weeks, and week has not been processed yet
						if _, monthExists := monthlyLookup[yearMonthStr]; !monthExists && postSmartResults.Date.After(monthlyBucketMax) {
							sr.logger.Debugf("device (%s) smart data added to bucket: monthly", preDevice.WWN)

							//this month/year pair has not been processed
							monthlyLookup[yearMonthStr] = true
							// write point immediately
							err = sr.saveDatapoint(
								sr.influxClient.WriteAPIBlocking(sr.appConfig.GetString("web.influxdb.org"), fmt.Sprintf("%s_monthly", sr.appConfig.GetString("web.influxdb.bucket"))),
								"smart",
								smartTags,
								smartFields,
								postSmartResults.Date, ctx)
							if ignorePastRetentionPolicyError(err) != nil {
								return err
							}

							err = sr.saveDatapoint(
								sr.influxClient.WriteAPIBlocking(sr.appConfig.GetString("web.influxdb.org"), fmt.Sprintf("%s_monthly", sr.appConfig.GetString("web.influxdb.bucket"))),
								"temp",
								tempTags,
								tempFields,
								postSmartResults.Date, ctx)
							if ignorePastRetentionPolicyError(err) != nil {
								return err
							}
						}

						if _, yearExists := yearlyLookup[yearStr]; !yearExists && year != today.Year() {
							sr.logger.Debugf("device (%s) smart data added to bucket: yearly", preDevice.WWN)

							//this year has not been processed
							yearlyLookup[yearStr] = true
							// write point immediately
							err = sr.saveDatapoint(
								sr.influxClient.WriteAPIBlocking(sr.appConfig.GetString("web.influxdb.org"), fmt.Sprintf("%s_yearly", sr.appConfig.GetString("web.influxdb.bucket"))),
								"smart",
								smartTags,
								smartFields,
								postSmartResults.Date, ctx)
							if ignorePastRetentionPolicyError(err) != nil {
								return err
							}

							err = sr.saveDatapoint(
								sr.influxClient.WriteAPIBlocking(sr.appConfig.GetString("web.influxdb.org"), fmt.Sprintf("%s_yearly", sr.appConfig.GetString("web.influxdb.bucket"))),
								"temp",
								tempTags,
								tempFields,
								postSmartResults.Date, ctx)
							if ignorePastRetentionPolicyError(err) != nil {
								return err
							}
						}
					}
					sr.logger.Infof("finished processing device %s. weekly: %d, monthly: %d, yearly: %d", preDevice.WWN, len(weeklyLookup), len(monthlyLookup), len(yearlyLookup))

				}

				return nil
			},
		},
		{
			ID: "20220503120000", // cleanup - v0.4.0 - influxdb schema
			Migrate: func(tx *gorm.DB) error {
				// delete unnecessary tables.
				err := tx.Migrator().DropTable(
					&m20201107210306.Smart{},
					&m20201107210306.SmartAtaAttribute{},
					&m20201107210306.SmartNvmeAttribute{},
					&m20201107210306.SmartScsiAttribute{},
				)
				if err != nil {
					return err
				}

				//migrate the device database
				return tx.AutoMigrate(m20220503120000.Device{})
			},
		},
		{
			ID: "m20220509170100", // addl udev device data
			Migrate: func(tx *gorm.DB) error {

				//migrate the device database.
				// adding addl columns (device_label, device_uuid, device_serial_id)
				return tx.AutoMigrate(m20220509170100.Device{})
			},
		},
		{
			ID: "m20220709181300",
			Migrate: func(tx *gorm.DB) error {

				// delete devices with empty `wwn` field (they are impossible to delete manually), and are invalid.
				return tx.Where("wwn = ?", "").Delete(&models.Device{}).Error
			},
		},
		{
			ID: "m20220716214900", // add settings table.
			Migrate: func(tx *gorm.DB) error {

				// adding the settings table.
				err := tx.AutoMigrate(m20220716214900.Setting{})
				if err != nil {
					return err
				}
				//add defaults.

				var defaultSettings = []m20220716214900.Setting{
					{
						SettingKeyName:        "theme",
						SettingKeyDescription: "Frontend theme ('light' | 'dark' | 'system')",
						SettingDataType:       "string",
						SettingValueString:    "system", // options: 'light' | 'dark' | 'system'
					},
					{
						SettingKeyName:        "layout",
						SettingKeyDescription: "Frontend layout ('material')",
						SettingDataType:       "string",
						SettingValueString:    "material",
					},
					{
						SettingKeyName:        "dashboard_display",
						SettingKeyDescription: "Frontend device display title ('name' | 'serial_id' | 'uuid' | 'label')",
						SettingDataType:       "string",
						SettingValueString:    "name",
					},
					{
						SettingKeyName:        "dashboard_sort",
						SettingKeyDescription: "Frontend device sort by ('status' | 'title' | 'age')",
						SettingDataType:       "string",
						SettingValueString:    "status",
					},
					{
						SettingKeyName:        "temperature_unit",
						SettingKeyDescription: "Frontend temperature unit ('celsius' | 'fahrenheit')",
						SettingDataType:       "string",
						SettingValueString:    "celsius",
					},
					{
						SettingKeyName:        "file_size_si_units",
						SettingKeyDescription: "File size in SI units (true | false)",
						SettingDataType:       "bool",
						SettingValueBool:      false,
					},
					{
						SettingKeyName:        "line_stroke",
						SettingKeyDescription: "Temperature chart line stroke ('smooth' | 'straight' | 'stepline')",
						SettingDataType:       "string",
						SettingValueString:    "smooth",
					},
					{
						SettingKeyName:        "metrics.notify_level",
						SettingKeyDescription: "Determines which device status will cause a notification (fail or warn)",
						SettingDataType:       "numeric",
						SettingValueNumeric:   int(pkg.MetricsNotifyLevelFail), // options: 'fail' or 'warn'
					},
					{
						SettingKeyName:        "metrics.status_filter_attributes",
						SettingKeyDescription: "Determines which attributes should impact device status",
						SettingDataType:       "numeric",
						SettingValueNumeric:   int(pkg.MetricsStatusFilterAttributesAll), // options: 'all' or  'critical'
					},
					{
						SettingKeyName:        "metrics.status_threshold",
						SettingKeyDescription: "Determines which threshold should impact device status",
						SettingDataType:       "numeric",
						SettingValueNumeric:   int(pkg.MetricsStatusThresholdBoth), // options: 'scrutiny', 'smart', 'both'
					},
				}
				return tx.Create(&defaultSettings).Error
			},
		},
		{
			ID: "m20221115214900", // add line_stroke setting.
			Migrate: func(tx *gorm.DB) error {
				//add line_stroke setting default.
				var defaultSettings = []m20220716214900.Setting{
					{
						SettingKeyName:        "line_stroke",
						SettingKeyDescription: "Temperature chart line stroke ('smooth' | 'straight' | 'stepline')",
						SettingDataType:       "string",
						SettingValueString:    "smooth",
					},
				}
				return tx.Create(&defaultSettings).Error
			},
		},
		{
			ID: "m20231123123300", // add repeat_notifications setting.
			Migrate: func(tx *gorm.DB) error {
				//add repeat_notifications setting default.
				var defaultSettings = []m20220716214900.Setting{
					{
						SettingKeyName:        "metrics.repeat_notifications",
						SettingKeyDescription: "Whether to repeat all notifications or just when values change (true | false)",
						SettingDataType:       "bool",
						SettingValueBool:      true,
					},
				}
				return tx.Create(&defaultSettings).Error
			},
		},
		{
			ID: "m20240722082740", // add powered_on_hours_unit setting.
			Migrate: func(tx *gorm.DB) error {
				//add powered_on_hours_unit setting default.
				var defaultSettings = []m20220716214900.Setting{
					{
						SettingKeyName:        "powered_on_hours_unit",
						SettingKeyDescription: "Presentation format for device powered on time ('humanize' | 'device_hours')",
						SettingDataType:       "string",
						SettingValueString:    "humanize",
					},
				}
				return tx.Create(&defaultSettings).Error
			},
		},
		{
			ID: "m20250221084400", // add archived to device data
			Migrate: func(tx *gorm.DB) error {

				//migrate the device database.
				// adding column (archived)
				return tx.AutoMigrate(m20250221084400.Device{})
			},
		},
		{
			ID: "m20260105083200", // add discard_sct_temp_history setting.
			Migrate: func(tx *gorm.DB) error {
				//add discard_sct_temp_history setting default.
				var defaultSettings = []m20220716214900.Setting{
					{
						SettingKeyName:        "collector.discard_sct_temp_history",
						SettingKeyDescription: "Whether to discard SCT Temperature history (true | false)",
						SettingDataType:       "bool",
						SettingValueBool:      false,
					},
				}
				return tx.Create(&defaultSettings).Error
			},
		},
		{
			ID: "m20251108044508", // add Muted field to Device
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(m20251108044508.Device{})
			},
		},
		{
			ID: "m20260108000000", // add ZFS pool and vdev tables
			Migrate: func(tx *gorm.DB) error {
				return tx.AutoMigrate(
					&m20260108000000.ZFSPool{},
					&m20260108000000.ZFSVdev{},
				)
			},
		},
	})

	if err := m.Migrate(); err != nil {
		sr.logger.Errorf("Database migration failed with error. \n Please open a github issue at https://github.com/AnalogJ/scrutiny and attach a copy of your scrutiny.db file. \n %v", err)
		return err
	}
	sr.logger.Infoln("Database migration completed successfully")

	//these migrations cannot be done within a transaction, so they are done as a separate group, with `UseTransaction = false`
	sr.logger.Infoln("SQLite global configuration migrations starting. Please wait....")
	globalMigrateOptions := gormigrate.DefaultOptions
	globalMigrateOptions.UseTransaction = false
	gm := gormigrate.New(sr.gormClient, globalMigrateOptions, []*gormigrate.Migration{
		{
			ID: "g20220802211500",
			Migrate: func(tx *gorm.DB) error {
				//shrink the Database (maybe necessary after 20220503113100)
				if err := tx.Exec("VACUUM;").Error; err != nil {
					return err
				}
				return nil
			},
		},
	})

	if err := gm.Migrate(); err != nil {
		sr.logger.Errorf("SQLite global configuration migrations failed with error. \n Please open a github issue at https://github.com/AnalogJ/scrutiny and attach a copy of your scrutiny.db file. \n %v", err)
		return err
	}
	sr.logger.Infoln("SQLite global configuration migrations completed successfully")

	return nil
}
