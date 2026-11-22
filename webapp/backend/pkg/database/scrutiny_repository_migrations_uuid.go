package database

import (
	"context"
	"fmt"
)

// rows per Flux copy query; limit/offset applies per series, so each query moves
// at most this many points from every series it matches
const uuidMigrationBatchSize = 1000

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
			err := m20260216155600_CopyPoints(sr, ctx, bucketName, newBucketName,
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
		err = m20260216155600_CopyPoints(sr, ctx, bucketName, newBucketName,
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
// another in batches, applying transform to each batch before it is written.
func m20260216155600_CopyPoints(sr *scrutinyRepository, ctx context.Context, fromBucket string, toBucket string, filter string, transform string) error {
	for offset := 0; ; offset += uuidMigrationBatchSize {
		queryStr := fmt.Sprintf(`
			from(bucket: "%s")
			|> range(start: -10y, stop: now())
			%s
			|> limit(n: %d, offset: %d)
			%s
			|> to(bucket: "%s")
		`, escapeFluxString(fromBucket), filter, uuidMigrationBatchSize, offset, transform, escapeFluxString(toBucket))

		result, err := sr.influxQueryApi.Query(ctx, queryStr)
		if err != nil {
			return fmt.Errorf("copy from %s to %s failed at offset %d: %w", fromBucket, toBucket, offset, err)
		}

		if !result.Next() {
			return nil
		}
	}
}
