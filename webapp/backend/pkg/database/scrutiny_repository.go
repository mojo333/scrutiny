package database

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/analogj/scrutiny/webapp/backend/pkg/config"
	"github.com/analogj/scrutiny/webapp/backend/pkg/models"
	"github.com/glebarez/sqlite"
	influxdb2 "github.com/influxdata/influxdb-client-go/v2"
	"github.com/influxdata/influxdb-client-go/v2/api"
	"github.com/influxdata/influxdb-client-go/v2/domain"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

const (
	// 60seconds * 60minutes * 24hours * 15 days
	RETENTION_PERIOD_15_DAYS_IN_SECONDS = 1_296_000

	// 60seconds * 60minutes * 24hours * 7 days * 9 weeks
	RETENTION_PERIOD_9_WEEKS_IN_SECONDS = 5_443_200

	// 60seconds * 60minutes * 24hours * 7 days * (52 + 52 + 4)weeks
	RETENTION_PERIOD_25_MONTHS_IN_SECONDS = 65_318_400

	DURATION_KEY_DAY     = "day"
	DURATION_KEY_WEEK    = "week"
	DURATION_KEY_MONTH   = "month"
	DURATION_KEY_YEAR    = "year"
	DURATION_KEY_FOREVER = "forever"
)

func NewScrutinyRepository(appConfig config.Interface, globalLogger logrus.FieldLogger) (DeviceRepo, error) {
	backgroundContext := context.Background()

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Gorm/SQLite setup
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	globalLogger.Infof("Trying to connect to scrutiny sqlite db: %s\n", appConfig.GetString("web.database.location"))

	// When a transaction cannot lock the database, because it is already locked by another one,
	// SQLite by default throws an error: database is locked. This behavior is usually not appropriate when
	// concurrent access is needed, typically when multiple processes write to the same database.
	// PRAGMA busy_timeout lets you set a timeout or a handler for these events. When setting a timeout,
	// SQLite will try the transaction multiple times within this timeout.
	// fixes #341
	// https://rsqlite.r-dbi.org/reference/sqlitesetbusyhandler
	// retrying for 30000 milliseconds, 30seconds - this would be unreasonable for a distributed multi-tenant application,
	// but should be fine for local usage.
	pragmaStr := sqlitePragmaString(map[string]string{
		"busy_timeout": "30000",
	})
	database, err := gorm.Open(sqlite.Open(appConfig.GetString("web.database.location")+pragmaStr), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database! - %v", err)
	}
	globalLogger.Infof("Successfully connected to scrutiny sqlite db: %s\n", appConfig.GetString("web.database.location"))

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// InfluxDB setup
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	// Create a new client using an InfluxDB server base URL and an authentication token
	influxdbUrl := fmt.Sprintf("%s://%s:%s", appConfig.GetString("web.influxdb.scheme"), appConfig.GetString("web.influxdb.host"), appConfig.GetString("web.influxdb.port"))
	globalLogger.Debugf("InfluxDB url: %s", influxdbUrl)

	tlsConfig := &tls.Config{
		InsecureSkipVerify: appConfig.GetBool("web.influxdb.tls.insecure_skip_verify"),
	}
	globalLogger.Infof("InfluxDB certificate verification: %t\n", !tlsConfig.InsecureSkipVerify)

	client := influxdb2.NewClientWithOptions(
		influxdbUrl,
		appConfig.GetString("web.influxdb.token"),
		influxdb2.DefaultOptions().SetTLSConfig(tlsConfig),
	)

	//if !appConfig.IsSet("web.influxdb.token") {
	globalLogger.Debugf("Determine Influxdb setup status...")
	influxSetupComplete, err := InfluxSetupComplete(influxdbUrl, tlsConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to check influxdb setup status - %w", err)
	}

	if !influxSetupComplete {
		globalLogger.Debugf("Influxdb un-initialized, running first-time setup...")

		// if no token is provided, but we have a valid server, we're going to assume this is the first setup of our server.
		// we will initialize with a predetermined username & password, that you should change.

		// metrics bucket will have a retention period of 8 days (since it will be down-sampled once a week)
		// in seconds (60seconds * 60minutes * 24hours * 15 days) = 1_296_000 (see EnsureBucket() function)
		_, err := client.SetupWithToken(
			backgroundContext,
			appConfig.GetString("web.influxdb.init_username"),
			appConfig.GetString("web.influxdb.init_password"),
			appConfig.GetString("web.influxdb.org"),
			appConfig.GetString("web.influxdb.bucket"),
			0,
			appConfig.GetString("web.influxdb.token"),
		)
		if err != nil {
			return nil, err
		}
	}

	// Use blocking write client for writes to desired bucket
	writeAPI := client.WriteAPIBlocking(appConfig.GetString("web.influxdb.org"), appConfig.GetString("web.influxdb.bucket"))

	// Get query client
	queryAPI := client.QueryAPI(appConfig.GetString("web.influxdb.org"))

	// Get task client
	taskAPI := client.TasksAPI()

	if writeAPI == nil || queryAPI == nil || taskAPI == nil {
		return nil, fmt.Errorf("failed to connect to influxdb")
	}

	deviceRepo := scrutinyRepository{
		appConfig:      appConfig,
		logger:         globalLogger,
		influxClient:   client,
		influxWriteApi: writeAPI,
		influxQueryApi: queryAPI,
		influxTaskApi:  taskAPI,
		gormClient:     database,
	}

	orgInfo, err := client.OrganizationsAPI().FindOrganizationByName(backgroundContext, appConfig.GetString("web.influxdb.org"))
	if err != nil {
		return nil, err
	}

	// Initialize Buckets (if necessary)
	err = deviceRepo.EnsureBuckets(backgroundContext, orgInfo)
	if err != nil {
		return nil, err
	}

	// Initialize Background Tasks
	err = deviceRepo.EnsureTasks(backgroundContext, *orgInfo.Id)
	if err != nil {
		return nil, err
	}

	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// InfluxDB & SQLite migrations
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	//database.AutoMigrate(&models.Device{})
	err = deviceRepo.Migrate(backgroundContext)
	if err != nil {
		return nil, err
	}

	return &deviceRepo, nil
}

type scrutinyRepository struct {
	appConfig config.Interface
	logger    logrus.FieldLogger

	influxWriteApi api.WriteAPIBlocking
	influxQueryApi api.QueryAPI
	influxTaskApi  api.TasksAPI
	influxClient   influxdb2.Client

	gormClient *gorm.DB
}

func (sr *scrutinyRepository) Close() error {
	sr.influxClient.Close()
	return nil
}

func (sr *scrutinyRepository) HealthCheck(ctx context.Context) error {
	//check influxdb
	status, err := sr.influxClient.Health(ctx)
	if err != nil {
		return fmt.Errorf("influxdb healthcheck failed: %w", err)
	}
	if status.Status != "pass" {
		return fmt.Errorf("influxdb healthcheck failed: status=%s", status.Status)
	}

	//check sqlite db.
	database, err := sr.gormClient.DB()
	if err != nil {
		return fmt.Errorf("sqlite healthcheck failed: %w", err)
	}
	err = database.Ping()
	if err != nil {
		return fmt.Errorf("sqlite healthcheck failed during ping: %w", err)
	}
	return nil

}

func InfluxSetupComplete(influxEndpoint string, tlsConfig *tls.Config) (bool, error) {
	influxUri, err := url.Parse(influxEndpoint)
	if err != nil {
		return false, err
	}
	influxUri, err = influxUri.Parse("/api/v2/setup")
	if err != nil {
		return false, err
	}

	client := &http.Client{Transport: &http.Transport{TLSClientConfig: tlsConfig}}
	res, err := client.Get(influxUri.String())
	if err != nil {
		return false, err
	}
	defer res.Body.Close()

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return false, err
	}

	type SetupStatus struct {
		Allowed bool `json:"allowed"`
	}
	var data SetupStatus
	err = json.Unmarshal(body, &data)
	if err != nil {
		return false, err
	}
	return !data.Allowed, nil
}

func (sr *scrutinyRepository) EnsureBuckets(ctx context.Context, org *domain.Organization) error {

	var mainBucketRetentionRule domain.RetentionRule
	var weeklyBucketRetentionRule domain.RetentionRule
	var monthlyBucketRetentionRule domain.RetentionRule
	updateRetention := sr.appConfig.GetBool("web.influxdb.retention_policy")
	if updateRetention {
		// in tests, we may not want to set a retention policy. If "false", we can set data with old timestamps,
		// then manually run the down sampling scripts. This should be true for production environments.
		mainBucketRetentionRule = domain.RetentionRule{EverySeconds: RETENTION_PERIOD_15_DAYS_IN_SECONDS}
		weeklyBucketRetentionRule = domain.RetentionRule{EverySeconds: RETENTION_PERIOD_9_WEEKS_IN_SECONDS}
		monthlyBucketRetentionRule = domain.RetentionRule{EverySeconds: RETENTION_PERIOD_25_MONTHS_IN_SECONDS}
	}

	mainBucket := sr.appConfig.GetString("web.influxdb.bucket")
	if err := sr.ensureBucket(ctx, org, mainBucket, mainBucketRetentionRule, updateRetention); err != nil {
		return err
	}
	if err := sr.ensureBucket(ctx, org, fmt.Sprintf("%s_weekly", mainBucket), weeklyBucketRetentionRule, updateRetention); err != nil {
		return err
	}
	if err := sr.ensureBucket(ctx, org, fmt.Sprintf("%s_monthly", mainBucket), monthlyBucketRetentionRule, updateRetention); err != nil {
		return err
	}

	yearlyBucket := fmt.Sprintf("%s_yearly", mainBucket)
	if _, foundErr := sr.influxClient.BucketsAPI().FindBucketByName(ctx, yearlyBucket); foundErr != nil {
		// metrics_yearly bucket will have an infinite retention period
		_, err := sr.influxClient.BucketsAPI().CreateBucketWithName(ctx, org, yearlyBucket)
		if err != nil {
			return err
		}
	}

	return nil
}

func (sr *scrutinyRepository) ensureBucket(ctx context.Context, org *domain.Organization, name string, retentionRule domain.RetentionRule, updateRetention bool) error {
	if found, foundErr := sr.influxClient.BucketsAPI().FindBucketByName(ctx, name); foundErr != nil {
		_, err := sr.influxClient.BucketsAPI().CreateBucketWithName(ctx, org, name, retentionRule)
		return err
	} else if updateRetention {
		found.RetentionRules = domain.RetentionRules{retentionRule}
		if _, err := sr.influxClient.BucketsAPI().UpdateBucket(ctx, found); err != nil {
			return fmt.Errorf("failed to update %s bucket retention policy: %w", name, err)
		}
	}
	return nil
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DeviceSummary
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// get a map of all devices and associated SMART data
func (sr *scrutinyRepository) GetSummary(ctx context.Context) (map[string]*models.DeviceSummary, error) {
	devices, err := sr.GetDevices(ctx)
	if err != nil {
		return nil, err
	}

	summaries := map[string]*models.DeviceSummary{}

	for _, device := range devices {
		summaries[device.WWN] = &models.DeviceSummary{Device: device}
	}

	// Optimized query: only query the daily bucket with recent data
	// Dashboard only needs latest values, not historical data
	queryStr := fmt.Sprintf(`
		import "influxdata/influxdb/schema"

		from(bucket: "%s")
		|> range(start: -15d, stop: now())
		|> filter(fn: (r) => r["_measurement"] == "smart")
		|> filter(fn: (r) => r["_field"] == "temp" or r["_field"] == "power_on_hours" or r["_field"] == "date")
		|> last()
		|> schema.fieldsAsCols()
		|> group(columns: ["device_wwn"])
		|> yield(name: "last")
		`,
		sr.appConfig.GetString("web.influxdb.bucket"),
	)

	result, err := sr.influxQueryApi.Query(ctx, queryStr)
	if err == nil {
		// Use Next() to iterate over query result lines
		for result.Next() {
			//get summary data from Influxdb.
			//result.Record().Values()
			if deviceWWN, ok := result.Record().Values()["device_wwn"]; ok {
				wwn, wwnOk := deviceWWN.(string)
				if !wwnOk {
					continue
				}

				//ensure summaries is initialized for this wwn
				if _, exists := summaries[wwn]; !exists {
					summaries[wwn] = &models.DeviceSummary{}
				}

				smartSummary := &models.SmartSummary{}
				if temp, tempOk := result.Record().Values()["temp"].(int64); tempOk {
					smartSummary.Temp = temp
				}
				if poh, pohOk := result.Record().Values()["power_on_hours"].(int64); pohOk {
					smartSummary.PowerOnHours = poh
				}
				if t, tOk := result.Record().Values()["_time"].(time.Time); tOk {
					smartSummary.CollectorDate = t
				}
				summaries[wwn].SmartResults = smartSummary
			}
		}
		if result.Err() != nil {
			sr.logger.Errorf("GetSummary query error: %s", result.Err().Error())
		}
	} else {
		return nil, err
	}

	deviceTempHistory, err := sr.GetSmartTemperatureHistory(ctx, DURATION_KEY_FOREVER)
	if err != nil {
		sr.logger.Errorf("Error retrieving temperature history: %v", err)
	}
	for wwn, tempHistory := range deviceTempHistory {
		if summary, exists := summaries[wwn]; exists {
			summary.TempHistory = tempHistory
		}
	}

	return summaries, nil
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper Methods
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

func (sr *scrutinyRepository) lookupBucketName(durationKey string) string {
	switch durationKey {
	case DURATION_KEY_DAY:
		//data stored in the last day
		return sr.appConfig.GetString("web.influxdb.bucket")
	case DURATION_KEY_WEEK:
		//data stored in the last week
		return sr.appConfig.GetString("web.influxdb.bucket")
	case DURATION_KEY_MONTH:
		// data stored in the last month (after the first week)
		return fmt.Sprintf("%s_weekly", sr.appConfig.GetString("web.influxdb.bucket"))
	case DURATION_KEY_YEAR:
		// data stored in the last year (after the first month)
		return fmt.Sprintf("%s_monthly", sr.appConfig.GetString("web.influxdb.bucket"))
	case DURATION_KEY_FOREVER:
		//data stored before the last year
		return fmt.Sprintf("%s_yearly", sr.appConfig.GetString("web.influxdb.bucket"))
	}
	return sr.appConfig.GetString("web.influxdb.bucket")
}

func (sr *scrutinyRepository) lookupDuration(durationKey string) []string {

	switch durationKey {
	case DURATION_KEY_DAY:
		//data stored in the last day
		return []string{"-1d", "now()"}
	case DURATION_KEY_WEEK:
		//data stored in the last week
		return []string{"-1w", "now()"}
	case DURATION_KEY_MONTH:
		// data stored in the last month (after the first week)
		return []string{"-1mo", "-1w"}
	case DURATION_KEY_YEAR:
		// data stored in the last year (after the first month)
		return []string{"-1y", "-1mo"}
	case DURATION_KEY_FOREVER:
		//data stored before the last year
		return []string{"-10y", "-1y"}
	}
	return []string{"-1w", "now()"}
}

func (sr *scrutinyRepository) lookupAggregateWindow(durationKey string) string {
	switch durationKey {
	case DURATION_KEY_DAY:
		return "15m"
	default:
		return "1h"
	}
}

func (sr *scrutinyRepository) lookupNestedDurationKeys(durationKey string) []string {
	switch durationKey {
	case DURATION_KEY_DAY:
		//all data is stored in a single bucket
		return []string{DURATION_KEY_DAY}
	case DURATION_KEY_WEEK:
		//all data is stored in a single bucket
		return []string{DURATION_KEY_WEEK}
	case DURATION_KEY_MONTH:
		//data is stored in the week bucket and the month bucket
		return []string{DURATION_KEY_WEEK, DURATION_KEY_MONTH}
	case DURATION_KEY_YEAR:
		// data stored in the last year (after the first month)
		return []string{DURATION_KEY_WEEK, DURATION_KEY_MONTH, DURATION_KEY_YEAR}
	case DURATION_KEY_FOREVER:
		//data stored before the last year
		return []string{DURATION_KEY_WEEK, DURATION_KEY_MONTH, DURATION_KEY_YEAR, DURATION_KEY_FOREVER}
	}
	return []string{DURATION_KEY_WEEK}
}

func sqlitePragmaString(pragmas map[string]string) string {
	q := url.Values{}
	for key, val := range pragmas {
		q.Add("_pragma", key+"="+val)
	}

	queryStr := q.Encode()
	if len(queryStr) > 0 {
		return "?" + queryStr
	}
	return ""
}
