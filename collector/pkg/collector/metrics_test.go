package collector

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os/exec"
	"testing"

	mock_shell "github.com/analogj/scrutiny/collector/pkg/common/shell/mock"
	mock_config "github.com/analogj/scrutiny/collector/pkg/config/mock"
	"github.com/analogj/scrutiny/collector/pkg/detect"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func TestApiEndpointParse(t *testing.T) {
	baseURL, _ := url.Parse("http://localhost:8080/")

	url1, _ := baseURL.Parse("d/e")
	require.Equal(t, "http://localhost:8080/d/e", url1.String())

	url2, _ := baseURL.Parse("/d/e")
	require.Equal(t, "http://localhost:8080/d/e", url2.String())
}

func TestApiEndpointParse_WithBasepathWithoutTrailingSlash(t *testing.T) {
	baseURL, _ := url.Parse("http://localhost:8080/scrutiny")

	//This testcase is unexpected and can cause issues. We need to ensure the apiEndpoint always has a trailing slash.
	url1, _ := baseURL.Parse("d/e")
	require.Equal(t, "http://localhost:8080/d/e", url1.String())

	url2, _ := baseURL.Parse("/d/e")
	require.Equal(t, "http://localhost:8080/d/e", url2.String())
}

func TestApiEndpointParse_WithBasepathWithTrailingSlash(t *testing.T) {
	baseURL, _ := url.Parse("http://localhost:8080/scrutiny/")

	url1, _ := baseURL.Parse("d/e")
	require.Equal(t, "http://localhost:8080/scrutiny/d/e", url1.String())

	url2, _ := baseURL.Parse("/d/e")
	require.Equal(t, "http://localhost:8080/d/e", url2.String())
}

func TestMetricsCollector_Collect_ConfiguredDeviceType(t *testing.T) {
	for _, tt := range []struct {
		name                  string
		deviceType            string
		hasDeviceTypeOverride bool
		expectedArgs          []string
	}{
		{"should drop a scanned scsi type", "scsi", false, []string{"--xall", "--json"}},
		{"should keep a configured scsi type", "scsi", true, []string{"--xall", "--json", "--device", "scsi"}},
		{"should keep a scanned non-standard type", "megaraid,14", false, []string{"--xall", "--json", "--device", "megaraid,14"}},
	} {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)

			const someDeviceName = "sda"

			fullDeviceName := detect.DevicePrefix() + someDeviceName

			fakeConfig := mock_config.NewMockInterface(ctrl)
			fakeConfig.EXPECT().GetCommandMetricsSmartArgs(fullDeviceName).Return("--xall --json")
			fakeConfig.EXPECT().GetString("commands.metrics_smartctl_bin").Return("smartctl")
			//only consulted for a scsi/ata type; the argv below is what the test pins
			fakeConfig.EXPECT().HasDeviceTypeOverride(fullDeviceName).AnyTimes().Return(tt.hasDeviceTypeOverride)

			someLogger := logrus.WithFields(logrus.Fields{})

			fakeShell := mock_shell.NewMockInterface(ctrl)
			fakeShell.EXPECT().
				Command(someLogger, "smartctl", append(tt.expectedArgs, fullDeviceName), "", gomock.Any()).
				Return("", errors.New("smartctl is not available in tests"))

			mc := MetricsCollector{
				config:        fakeConfig,
				BaseCollector: BaseCollector{logger: someLogger},
				shell:         fakeShell,
			}

			mc.Collect("0x5000c500deadbeef", someDeviceName, tt.deviceType)
		})
	}
}

func helperExitError(t *testing.T, code int) error {
	err := exec.Command("sh", "-c", fmt.Sprintf("exit %d", code)).Run()
	require.IsType(t, &exec.ExitError{}, err)
	return err
}

func TestMetricsCollector_Collect_PublishesOnlyCompleteResults(t *testing.T) {
	for _, tt := range []struct {
		name          string
		smartctlErr   func(t *testing.T) error
		shouldPublish bool
	}{
		{"publishes a successful run", func(t *testing.T) error { return nil }, true},
		{"publishes a failing disk report", func(t *testing.T) error { return helperExitError(t, 0x08) }, true},
		{"publishes despite a SMART checksum error", func(t *testing.T) error { return helperExitError(t, 0x04) }, true},
		{"skips when the device could not be opened", func(t *testing.T) error { return helperExitError(t, 0x02) }, false},
		{"skips when the commandline did not parse", func(t *testing.T) error { return helperExitError(t, 0x01) }, false},
		{"skips when smartctl was killed", func(t *testing.T) error { return &exec.ExitError{} }, false},
		{"skips when smartctl could not run", func(t *testing.T) error { return errors.New("not found") }, false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			const someDeviceName = "sda"
			fullDeviceName := detect.DevicePrefix() + someDeviceName

			fakeConfig := mock_config.NewMockInterface(ctrl)
			fakeConfig.EXPECT().GetCommandMetricsSmartArgs(fullDeviceName).Return("--xall --json")
			fakeConfig.EXPECT().GetString("commands.metrics_smartctl_bin").Return("smartctl")

			someLogger := logrus.WithFields(logrus.Fields{})
			fakeShell := mock_shell.NewMockInterface(ctrl)
			fakeShell.EXPECT().Command(someLogger, "smartctl", gomock.Any(), "", gomock.Any()).Return("{}", tt.smartctlErr(t))

			published := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { published++ }))
			defer server.Close()
			apiEndpoint, _ := url.Parse(server.URL + "/")

			mc := MetricsCollector{
				config:        fakeConfig,
				BaseCollector: BaseCollector{logger: someLogger},
				apiEndpoint:   apiEndpoint,
				shell:         fakeShell,
			}

			mc.Collect("0x5000c500deadbeef", someDeviceName, "")

			require.Equal(t, tt.shouldPublish, published == 1)
		})
	}
}
