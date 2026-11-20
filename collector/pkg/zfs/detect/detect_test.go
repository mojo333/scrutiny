package detect

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/analogj/scrutiny/collector/pkg/zfs/models"
	"github.com/sirupsen/logrus"
)

func newTestDetect() *Detect {
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	return &Detect{
		Logger: logrus.NewEntry(logger),
	}
}

func readTestData(t *testing.T, filename string) string {
	t.Helper()
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("failed to get caller info")
	}
	data, err := os.ReadFile(filepath.Join(filepath.Dir(currentFile), "testdata", filename))
	if err != nil {
		t.Fatalf("failed to read testdata/%s: %v", filename, err)
	}
	return string(data)
}

func TestDetectVdevType(t *testing.T) {
	d := newTestDetect()

	tests := []struct {
		name     string
		input    string
		expected models.ZFSVdevType
	}{
		{"mirror", "mirror-0", models.ZFSVdevTypeMirror},
		{"raidz1 explicit", "raidz1-0", models.ZFSVdevTypeRaidz1},
		{"raidz implicit", "raidz-0", models.ZFSVdevTypeRaidz1},
		{"raidz2", "raidz2-0", models.ZFSVdevTypeRaidz2},
		{"raidz3", "raidz3-0", models.ZFSVdevTypeRaidz3},
		{"draid1 explicit", "draid1", models.ZFSVdevTypeDraid1},
		{"draid implicit", "draid", models.ZFSVdevTypeDraid1},
		{"draid2", "draid2", models.ZFSVdevTypeDraid2},
		{"draid3", "draid3", models.ZFSVdevTypeDraid3},
		{"spare", "spare", models.ZFSVdevTypeSpare},
		{"spares", "spares", models.ZFSVdevTypeSpare},
		{"log", "log", models.ZFSVdevTypeLog},
		{"logs", "logs", models.ZFSVdevTypeLog},
		{"cache", "cache", models.ZFSVdevTypeCache},
		{"special", "special", models.ZFSVdevTypeSpecial},
		{"dedup", "dedup", models.ZFSVdevTypeDedup},
		{"disk sda", "sda", models.ZFSVdevTypeDisk},
		{"disk unknown", "unknown", models.ZFSVdevTypeDisk},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := d.detectVdevType(tc.input)
			if result != tc.expected {
				t.Errorf("detectVdevType(%q) = %q, want %q", tc.input, result, tc.expected)
			}
		})
	}
}

func TestResolveDevicePath(t *testing.T) {
	d := newTestDetect()

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"already absolute", "/dev/sda", "/dev/sda"},
		{"linux sata", "sda", "/dev/sda"},
		{"linux nvme", "nvme0n1", "/dev/nvme0n1"},
		{"linux hd", "hda", "/dev/hda"},
		{"linux vd", "vda", "/dev/vda"},
		{"freebsd ada", "ada0", "/dev/ada0"},
		{"freebsd da", "da0", "/dev/da0"},
		{"freebsd nda", "nda0", "/dev/nda0"},
		{"unknown device", "unknown-device", "unknown-device"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result := d.resolveDevicePath(tc.input)
			if result != tc.expected {
				t.Errorf("resolveDevicePath(%q) = %q, want %q", tc.input, result, tc.expected)
			}
		})
	}
}

func TestParseVdevTree_Mirror(t *testing.T) {
	d := newTestDetect()
	output := readTestData(t, "zpool_status_mirror.txt")

	vdevs := d.parseVdevTree(output, "tank")

	if len(vdevs) != 1 {
		t.Fatalf("expected 1 top-level vdev, got %d", len(vdevs))
	}

	mirror := vdevs[0]
	if mirror.Type != models.ZFSVdevTypeMirror {
		t.Errorf("expected mirror type, got %q", mirror.Type)
	}
	if mirror.Name != "mirror-0" {
		t.Errorf("expected name mirror-0, got %q", mirror.Name)
	}
	if mirror.Status != models.ZFSPoolStatusOnline {
		t.Errorf("expected ONLINE status, got %q", mirror.Status)
	}

	if len(mirror.Children) != 2 {
		t.Fatalf("expected 2 children, got %d", len(mirror.Children))
	}

	// First child (sda) should have errors
	sda := mirror.Children[0]
	if sda.Name != "sda" {
		t.Errorf("expected first child sda, got %q", sda.Name)
	}
	if sda.Type != models.ZFSVdevTypeDisk {
		t.Errorf("expected disk type for sda, got %q", sda.Type)
	}
	if sda.Path != "/dev/sda" {
		t.Errorf("expected path /dev/sda, got %q", sda.Path)
	}
	if sda.ReadErrors != 1 || sda.WriteErrors != 2 || sda.ChecksumErrors != 3 {
		t.Errorf("expected errors 1/2/3, got %d/%d/%d", sda.ReadErrors, sda.WriteErrors, sda.ChecksumErrors)
	}

	// Second child (sdb) should have no errors
	sdb := mirror.Children[1]
	if sdb.Name != "sdb" {
		t.Errorf("expected second child sdb, got %q", sdb.Name)
	}
	if sdb.ReadErrors != 0 || sdb.WriteErrors != 0 || sdb.ChecksumErrors != 0 {
		t.Errorf("expected no errors for sdb, got %d/%d/%d", sdb.ReadErrors, sdb.WriteErrors, sdb.ChecksumErrors)
	}
}

func TestParseVdevTree_Raidz2(t *testing.T) {
	d := newTestDetect()
	output := readTestData(t, "zpool_status_raidz2.txt")

	vdevs := d.parseVdevTree(output, "datapool")

	if len(vdevs) != 1 {
		t.Fatalf("expected 1 top-level vdev, got %d", len(vdevs))
	}

	raidz := vdevs[0]
	if raidz.Type != models.ZFSVdevTypeRaidz2 {
		t.Errorf("expected raidz2 type, got %q", raidz.Type)
	}
	if raidz.Name != "raidz2-0" {
		t.Errorf("expected name raidz2-0, got %q", raidz.Name)
	}

	if len(raidz.Children) != 4 {
		t.Fatalf("expected 4 children, got %d", len(raidz.Children))
	}

	// Check second child has 1 write error
	sdb := raidz.Children[1]
	if sdb.Name != "sdb" {
		t.Errorf("expected sdb, got %q", sdb.Name)
	}
	if sdb.WriteErrors != 1 {
		t.Errorf("expected 1 write error for sdb, got %d", sdb.WriteErrors)
	}

	// Check fourth child has 2 read errors
	sdd := raidz.Children[3]
	if sdd.Name != "sdd" {
		t.Errorf("expected sdd, got %q", sdd.Name)
	}
	if sdd.ReadErrors != 2 {
		t.Errorf("expected 2 read errors for sdd, got %d", sdd.ReadErrors)
	}
}

func TestParseVdevTree_Empty(t *testing.T) {
	d := newTestDetect()

	// Empty output
	vdevs := d.parseVdevTree("", "tank")
	if len(vdevs) != 0 {
		t.Errorf("expected 0 vdevs for empty output, got %d", len(vdevs))
	}

	// Output with no config section
	vdevs = d.parseVdevTree("  pool: tank\n state: ONLINE\n", "tank")
	if len(vdevs) != 0 {
		t.Errorf("expected 0 vdevs for no-config output, got %d", len(vdevs))
	}
}

func TestCalculateTotalErrors(t *testing.T) {
	d := newTestDetect()

	pool := &models.ZFSPool{
		Vdevs: []models.ZFSVdev{
			{
				Name:           "mirror-0",
				ReadErrors:     1,
				WriteErrors:    2,
				ChecksumErrors: 3,
				Children: []models.ZFSVdev{
					{
						Name:           "sda",
						ReadErrors:     10,
						WriteErrors:    20,
						ChecksumErrors: 30,
					},
					{
						Name:           "sdb",
						ReadErrors:     5,
						WriteErrors:    0,
						ChecksumErrors: 1,
					},
				},
			},
			{
				Name:           "mirror-1",
				ReadErrors:     0,
				WriteErrors:    0,
				ChecksumErrors: 0,
				Children: []models.ZFSVdev{
					{
						Name:           "sdc",
						ReadErrors:     100,
						WriteErrors:    200,
						ChecksumErrors: 300,
					},
				},
			},
		},
	}

	d.calculateTotalErrors(pool)

	// Total read: 1 + 10 + 5 + 0 + 100 = 116
	if pool.TotalReadErrors != 116 {
		t.Errorf("expected TotalReadErrors=116, got %d", pool.TotalReadErrors)
	}
	// Total write: 2 + 20 + 0 + 0 + 200 = 222
	if pool.TotalWriteErrors != 222 {
		t.Errorf("expected TotalWriteErrors=222, got %d", pool.TotalWriteErrors)
	}
	// Total checksum: 3 + 30 + 1 + 0 + 300 = 334
	if pool.TotalChecksumErrors != 334 {
		t.Errorf("expected TotalChecksumErrors=334, got %d", pool.TotalChecksumErrors)
	}
}

func TestParseScrubStatus_Finished(t *testing.T) {
	d := newTestDetect()
	output := readTestData(t, "zpool_status_scrub_finished.txt")

	pool := &models.ZFSPool{ScrubState: models.ZFSScrubStateNone}
	d.parseScrubStatus(pool, output)

	if pool.ScrubState != models.ZFSScrubStateFinished {
		t.Errorf("expected scrub state finished, got %q", pool.ScrubState)
	}
	if pool.ScrubErrorsCount != 0 {
		t.Errorf("expected 0 scrub errors, got %d", pool.ScrubErrorsCount)
	}
	if pool.ScrubPercentComplete != 100.0 {
		t.Errorf("expected 100%% complete, got %f", pool.ScrubPercentComplete)
	}
	if pool.ScrubEndTime == nil {
		t.Fatal("expected scrub end time to be set")
	}
	if pool.ScrubEndTime.Year() != 2026 {
		t.Errorf("expected year 2026, got %d", pool.ScrubEndTime.Year())
	}
}

func TestParseScrubStatus_InProgress(t *testing.T) {
	d := newTestDetect()
	output := readTestData(t, "zpool_status_scrub_in_progress.txt")

	pool := &models.ZFSPool{ScrubState: models.ZFSScrubStateNone}
	d.parseScrubStatus(pool, output)

	if pool.ScrubState != models.ZFSScrubStateScanning {
		t.Errorf("expected scrub state scanning, got %q", pool.ScrubState)
	}
	if pool.ScrubStartTime == nil {
		t.Fatal("expected scrub start time to be set")
	}
	if pool.ScrubStartTime.Year() != 2026 {
		t.Errorf("expected year 2026, got %d", pool.ScrubStartTime.Year())
	}
	if pool.ScrubPercentComplete != 50.0 {
		t.Errorf("expected 50%% complete, got %f", pool.ScrubPercentComplete)
	}
}

func TestParseScrubStatus_Canceled(t *testing.T) {
	d := newTestDetect()
	output := readTestData(t, "zpool_status_scrub_canceled.txt")

	pool := &models.ZFSPool{ScrubState: models.ZFSScrubStateNone}
	d.parseScrubStatus(pool, output)

	if pool.ScrubState != models.ZFSScrubStateCanceled {
		t.Errorf("expected scrub state canceled, got %q", pool.ScrubState)
	}
	if pool.ScrubEndTime == nil {
		t.Fatal("expected scrub end time to be set")
	}
	if pool.ScrubEndTime.Year() != 2026 {
		t.Errorf("expected year 2026, got %d", pool.ScrubEndTime.Year())
	}
}

func TestParseScrubStatus_None(t *testing.T) {
	d := newTestDetect()
	output := "  scan: none requested\n"

	pool := &models.ZFSPool{ScrubState: models.ZFSScrubStateNone}
	d.parseScrubStatus(pool, output)

	if pool.ScrubState != models.ZFSScrubStateNone {
		t.Errorf("expected scrub state none, got %q", pool.ScrubState)
	}
	if pool.ScrubStartTime != nil {
		t.Error("expected scrub start time to be nil")
	}
	if pool.ScrubEndTime != nil {
		t.Error("expected scrub end time to be nil")
	}
}

func TestParseZFSDate(t *testing.T) {
	d := newTestDetect()

	tests := []struct {
		name      string
		input     string
		wantErr   bool
		wantYear  int
		wantMonth int
		wantDay   int
	}{
		{
			name:      "double-space day",
			input:     "Sun Jan  5 00:34:31 2026",
			wantErr:   false,
			wantYear:  2026,
			wantMonth: 1,
			wantDay:   5,
		},
		{
			name:      "single-space day",
			input:     "Mon Jan 15 10:20:30 2026",
			wantErr:   false,
			wantYear:  2026,
			wantMonth: 1,
			wantDay:   15,
		},
		{
			name:    "invalid string",
			input:   "not a date",
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			result, err := d.parseZFSDate(tc.input)
			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result.Year() != tc.wantYear {
				t.Errorf("year: got %d, want %d", result.Year(), tc.wantYear)
			}
			if int(result.Month()) != tc.wantMonth {
				t.Errorf("month: got %d, want %d", int(result.Month()), tc.wantMonth)
			}
			if result.Day() != tc.wantDay {
				t.Errorf("day: got %d, want %d", result.Day(), tc.wantDay)
			}
		})
	}
}
