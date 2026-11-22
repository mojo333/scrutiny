package database

import (
	"context"
	"fmt"
	"time"
)

// Each copy query covers one time window rather than a limit/offset page. Flux applies
// limit and offset per series, and a device has one series per SMART field, so a
// 1000-row page could load tens of thousands of points at once and get InfluxDB
// OOM-killed under a tight container memory limit. A window bounds the work by time.
const uuidMigrationWindow = 24 * time.Hour

// m20260216155600_ChangeInfluxDBTags re-tags every smart and temp point from
// device_wwn to scrutiny_uuid. InfluxDB cannot rewrite tags in place, so each bucket
// is copied into a temporary bucket which then replaces the original.
//
// Unlike upstream, this fork also stores measurements that are not keyed by device
// (zfs_pool). Those are copied across unchanged, because the original bucket is
// deleted afterwards and would otherwise take their whole history with it.
func m20260216155600_ChangeInfluxDBTags(sr *scrutinyRepository, ctx context.Context, wwnToUUID map[string]string) error {
	bucket := sr.appConfig.GetString("web.influxdb.bucket")
	org := sr.appConfig.GetString("web.influxdb.org")
	bucketNames := []string{
		bucket,
		fmt.Sprintf("%s_weekly", bucket),
		fmt.Sprintf("%s_monthly", bucket),
		fmt.Sprintf("%s_yearly", bucket),
	}

	bucketsAPI := sr.influxClient.BucketsAPI()

	// downsampled buckets hold at most one point per series per period, so they can
	// use windows as wide as that period without loading more than the raw bucket does
	windows := map[string]time.Duration{
		bucket:                            uuidMigrationWindow,
		fmt.Sprintf("%s_weekly", bucket):  7 * 24 * time.Hour,
		fmt.Sprintf("%s_monthly", bucket): 31 * 24 * time.Hour,
		fmt.Sprintf("%s_yearly", bucket):  366 * 24 * time.Hour,
	}

	for _, bucketName := range bucketNames {
		newBucketName := fmt.Sprintf("%s_new", bucketName)

		sr.logger.Debugf("Creating temporary bucket %s...", newBucketName)
		oldBucket, err := bucketsAPI.FindBucketByName(ctx, bucketName)
		if err != nil {
			return fmt.Errorf("failed to find bucket %s: %w", bucketName, err)
		}

		// a leftover _new bucket means a previous attempt failed before the swap
		if existingNew, _ := bucketsAPI.FindBucketByName(ctx, newBucketName); existingNew != nil {
			sr.logger.Debugf("Found leftover bucket %s from previous migration, deleting...", newBucketName)
			if err := bucketsAPI.DeleteBucket(ctx, existingNew); err != nil {
				return fmt.Errorf("failed to delete leftover bucket %s: %w", newBucketName, err)
			}
		}

		orgObj, err := sr.influxClient.OrganizationsAPI().FindOrganizationByName(ctx, org)
		if err != nil {
			return fmt.Errorf("failed to find organization %s: %w", org, err)
		}

		newBucket, err := bucketsAPI.CreateBucketWithName(ctx, orgObj, newBucketName, oldBucket.RetentionRules...)
		if err != nil {
			return fmt.Errorf("failed to create bucket %s: %w", newBucketName, err)
		}

		for wwn, scrutinyUUID := range wwnToUUID {
			sr.logger.Debugf("Copying points from %s to %s for wwn %s...", bucketName, newBucketName, wwn)
			err := m20260216155600_CopyPoints(sr, ctx, bucketName, newBucketName, windows[bucketName],
				fmt.Sprintf(`|> filter(fn: (r) => r["_measurement"] == "smart" or r["_measurement"] == "temp")
					|> filter(fn: (r) => r["device_wwn"] == "%s")`, escapeFluxString(wwn)),
				fmt.Sprintf(`|> drop(columns: ["device_wwn"])
					|> set(key: "scrutiny_uuid", value: "%s")`, escapeFluxString(scrutinyUUID)),
			)
			if err != nil {
				return fmt.Errorf("failed to copy points for wwn %s: %w", wwn, err)
			}
		}

		sr.logger.Debugf("Copying non-device measurements from %s to %s...", bucketName, newBucketName)
		err = m20260216155600_CopyPoints(sr, ctx, bucketName, newBucketName, windows[bucketName],
			`|> filter(fn: (r) => r["_measurement"] != "smart" and r["_measurement"] != "temp")`,
			"",
		)
		if err != nil {
			return fmt.Errorf("failed to copy non-device measurements: %w", err)
		}

		sr.logger.Debugf("Replacing bucket %s with %s...", bucketName, newBucketName)
		if err := bucketsAPI.DeleteBucket(ctx, oldBucket); err != nil {
			return fmt.Errorf("failed to delete old bucket %s: %w", bucketName, err)
		}

		newBucket.Name = bucketName
		if _, err := bucketsAPI.UpdateBucket(ctx, newBucket); err != nil {
			return fmt.Errorf("failed to rename bucket %s to %s: %w", newBucketName, bucketName, err)
		}

		sr.logger.Debugf("Bucket %s migrated successfully", bucketName)
	}

	return nil
}

// m20260216155600_CopyPoints copies the points selected by filter from one bucket to
// another one time window at a time, applying transform to each window before it is written.
func m20260216155600_CopyPoints(sr *scrutinyRepository, ctx context.Context, fromBucket string, toBucket string, window time.Duration, filter string, transform string) error {
	earliest, found, err := m20260216155600_EarliestPoint(sr, ctx, fromBucket, filter)
	if err != nil {
		return err
	}
	if !found {
		return nil
	}

	// fixed up front: the web server is not started until migrations finish, so
	// nothing new is written to the old bucket while it is being copied
	stop := time.Now().Add(time.Second)
	for _, w := range m20260216155600_CopyWindows(earliest, stop, window) {
		queryStr := fmt.Sprintf(`
			from(bucket: "%s")
			|> range(start: %s, stop: %s)
			%s
			%s
			|> to(bucket: "%s")
		`, escapeFluxString(fromBucket), w[0].Format(time.RFC3339Nano), w[1].Format(time.RFC3339Nano), filter, transform, escapeFluxString(toBucket))

		if err := m20260216155600_RunQuery(sr, ctx, queryStr); err != nil {
			return fmt.Errorf("copy from %s to %s failed for window starting %s: %w", fromBucket, toBucket, w[0].Format(time.RFC3339), err)
		}
	}
	return nil
}

// m20260216155600_EarliestPoint returns the time of the oldest point matching filter.
// first() is evaluated per series in the storage engine, so only one row per series
// reaches the final sort.
func m20260216155600_EarliestPoint(sr *scrutinyRepository, ctx context.Context, bucket string, filter string) (time.Time, bool, error) {
	queryStr := fmt.Sprintf(`
		from(bucket: "%s")
		|> range(start: -10y, stop: now())
		%s
		|> first()
		|> keep(columns: ["_time"])
		|> group()
		|> sort(columns: ["_time"])
		|> limit(n: 1)
	`, escapeFluxString(bucket), filter)

	result, err := sr.influxQueryApi.Query(ctx, queryStr)
	if err != nil {
		return time.Time{}, false, fmt.Errorf("failed to find earliest point in %s: %w", bucket, err)
	}
	defer result.Close()

	if !result.Next() {
		return time.Time{}, false, result.Err()
	}
	return result.Record().Time(), true, nil
}

// m20260216155600_RunQuery runs a query for its side effects. The result must be read to
// the end: to() writes as rows stream back, so an unread result stalls the copy part way
// (about 2^17 rows in testing) while the caller moves on and deletes the source bucket.
// Draining also surfaces errors reported part way through the stream.
func m20260216155600_RunQuery(sr *scrutinyRepository, ctx context.Context, queryStr string) error {
	result, err := sr.influxQueryApi.Query(ctx, queryStr)
	if err != nil {
		return err
	}
	defer result.Close()

	for result.Next() {
	}
	return result.Err()
}

// m20260216155600_CopyWindows splits [start, stop) into contiguous half-open windows of
// at most size, so each point falls into exactly one window.
func m20260216155600_CopyWindows(start time.Time, stop time.Time, size time.Duration) [][2]time.Time {
	var windows [][2]time.Time
	for from := start; from.Before(stop); from = from.Add(size) {
		to := from.Add(size)
		if to.After(stop) {
			to = stop
		}
		windows = append(windows, [2]time.Time{from, to})
	}
	return windows
}
