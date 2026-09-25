package collector

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"os/exec"
	"strings"
	"time"

	"github.com/analogj/scrutiny/collector/pkg/common/shell"
	"github.com/analogj/scrutiny/collector/pkg/config"
	"github.com/analogj/scrutiny/collector/pkg/detect"
	"github.com/analogj/scrutiny/collector/pkg/errors"
	"github.com/analogj/scrutiny/collector/pkg/models"
	"github.com/analogj/scrutiny/webapp/backend/pkg/models/collector"
	"github.com/samber/lo"
	"github.com/sirupsen/logrus"
)

type MetricsCollector struct {
	config config.Interface
	BaseCollector
	apiEndpoint *url.URL
	shell       shell.Interface
}

func CreateMetricsCollector(appConfig config.Interface, logger *logrus.Entry, apiEndpoint string) (MetricsCollector, error) {
	//ensure the base endpoint always has a trailing slash (regardless of config-file/CLI/env source),
	//otherwise relative url.Parse() drops any basepath (eg. http://host:8080/scrutiny).
	apiEndpoint = strings.TrimSuffix(apiEndpoint, "/") + "/"
	apiEndpointUrl, err := url.Parse(apiEndpoint)
	if err != nil {
		return MetricsCollector{}, err
	}

	sc := MetricsCollector{
		config:      appConfig,
		apiEndpoint: apiEndpointUrl,
		BaseCollector: BaseCollector{
			logger: logger,
		},
		shell: shell.Create(),
	}

	return sc, nil
}

func (mc *MetricsCollector) Run() error {
	err := mc.Validate()
	if err != nil {
		return err
	}

	apiEndpoint, _ := url.Parse(mc.apiEndpoint.String())
	apiEndpoint, _ = apiEndpoint.Parse("api/devices/register") //this acts like filepath.Join()

	deviceRespWrapper := new(models.DeviceWrapper)

	deviceDetector := detect.Detect{
		Logger: mc.logger,
		Config: mc.config,
	}
	rawDetectedStorageDevices, err := deviceDetector.Start()
	if err != nil {
		return err
	}

	//filter any device with empty wwn (they are invalid)
	detectedStorageDevices := lo.Filter[models.Device](rawDetectedStorageDevices, func(dev models.Device, _ int) bool {
		return len(dev.WWN) > 0
	})

	mc.logger.Infoln("Sending detected devices to API, for filtering & validation")
	jsonObj, _ := json.Marshal(detectedStorageDevices)
	mc.logger.Debugf("Detected devices: %v", string(jsonObj))
	err = mc.postJson(apiEndpoint.String(), models.DeviceWrapper{
		Data: detectedStorageDevices,
	}, &deviceRespWrapper)
	if err != nil {
		return err
	}

	if !deviceRespWrapper.Success {
		mc.logger.Errorln("An error occurred while retrieving filtered devices")
		mc.logger.Debugln(deviceRespWrapper)
		return errors.ApiServerCommunicationError("An error occurred while retrieving filtered devices")
	} else {
		mc.logger.Debugln(deviceRespWrapper)
		//var wg sync.WaitGroup
		for _, device := range deviceRespWrapper.Data {
			// execute collection in parallel go-routines
			//wg.Add(1)
			//go mc.Collect(&wg, device.WWN, device.DeviceName, device.DeviceType)
			mc.Collect(device.WWN, device.DeviceName, device.DeviceType)

			if mc.config.GetInt("commands.metrics_smartctl_wait") > 0 {
				time.Sleep(time.Duration(mc.config.GetInt("commands.metrics_smartctl_wait")) * time.Second)
			}
		}

		//mc.logger.Infoln("Main: Waiting for workers to finish")
		//wg.Wait()
		mc.logger.Infoln("Main: Completed")
	}

	return nil
}

func (mc *MetricsCollector) Validate() error {
	mc.logger.Infoln("Verifying required tools")
	_, lookErr := exec.LookPath(mc.config.GetString("commands.metrics_smartctl_bin"))

	if lookErr != nil {
		return errors.DependencyMissingError(fmt.Sprintf("%s binary is missing", mc.config.GetString("commands.metrics_smartctl_bin")))
	}

	return nil
}

// func (mc *MetricsCollector) Collect(wg *sync.WaitGroup, deviceWWN string, deviceName string, deviceType string) {
func (mc *MetricsCollector) Collect(deviceWWN string, deviceName string, deviceType string) {
	//defer wg.Done()
	if len(deviceWWN) == 0 {
		mc.logger.Errorf("no device WWN detected for %s. Skipping collection for this device (no data association possible).\n", deviceName)
		return
	}
	mc.logger.Infof("Collecting smartctl results for %s\n", deviceName)

	fullDeviceName := fmt.Sprintf("%s%s", detect.DevicePrefix(), deviceName)
	args := strings.Fields(mc.config.GetCommandMetricsSmartArgs(fullDeviceName))
	//only include the device type if its a non-standard one, or the user set it in the config file.
	//In some cases ata drives are detected as scsi in docker, and metadata is lost, so a scanned scsi/ata type is dropped.
	if len(deviceType) > 0 &&
		((deviceType != "scsi" && deviceType != "ata") || mc.config.HasDeviceTypeOverride(fullDeviceName)) {
		args = append(args, "--device", deviceType)
	}
	args = append(args, fullDeviceName)

	result, err := mc.shell.Command(mc.logger, mc.config.GetString("commands.metrics_smartctl_bin"), args, "", os.Environ())
	resultBytes := []byte(result)
	if err != nil {
		exitError, isExitError := err.(*exec.ExitError)
		if !isExitError {
			mc.logger.Errorf("error while attempting to execute smartctl: %s\n", deviceName)
			mc.logger.Errorf("ERROR MESSAGE: %v", err)
			mc.logger.Errorf("IGNORING RESULT: %v", result)
			return
		}

		// killed processes return exit code -1, which we'd decode as all bits being set
		if exitError.ExitCode() < 0 {
			mc.logger.Errorf("smartctl was terminated before it could finish processing %s: %v", deviceName, exitError)
			return
		}

		exitStatus := collector.SmartctlExitStatus(exitError.ExitCode())
		mc.logger.Errorf("smartctl returned an error code (%d) while processing %s\n", exitError.ExitCode(), deviceName)
		mc.LogSmartctlExitStatus(exitStatus)

		// non-fatal bits (failing disk, error logs) still come with a complete report worth publishing
		if exitStatus.IsFatal() {
			if exitStatus == collector.SmartctlExitStatusFailDev && hasPowerModeCheck(args) {
				mc.logger.Infof("%s is in a low power mode, skipping collection\n", deviceName)
				return
			}

			mc.logger.Errorf("smartctl output for %s is incomplete, not publishing results\n", deviceName)
			return
		}
	}

	if pubErr := mc.Publish(deviceWWN, resultBytes); pubErr != nil {
		mc.logger.Errorf("Failed to publish SMART data for device %s: %v", deviceName, pubErr)
	}
}

// if -n is passed and the drive is asleep, smartctl will return an exit code
// with one of our "failure" bits set, even though it's just skipping the check
func hasPowerModeCheck(args []string) bool {
	for _, arg := range args {
		if strings.HasPrefix(arg, "--nocheck") || (strings.HasPrefix(arg, "-n") && !strings.HasPrefix(arg, "--")) {
			return true
		}
	}
	return false
}

func (mc *MetricsCollector) Publish(deviceWWN string, payload []byte) error {
	mc.logger.Infof("Publishing smartctl results for %s\n", deviceWWN)

	apiEndpoint, _ := url.Parse(mc.apiEndpoint.String())
	apiEndpoint, _ = apiEndpoint.Parse(fmt.Sprintf("api/device/%s/smart", strings.ToLower(deviceWWN)))

	resp, err := httpClient.Post(apiEndpoint.String(), "application/json", bytes.NewBuffer(payload))
	if err != nil {
		mc.logger.Errorf("An error occurred while publishing SMART data for device (%s): %v", deviceWWN, err)
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		mc.logger.Errorf("An error occurred while publishing SMART data for device (%s): API returned HTTP %d", deviceWWN, resp.StatusCode)
		return fmt.Errorf("publishing SMART data for device (%s) failed with HTTP %d", deviceWWN, resp.StatusCode)
	}

	return nil
}
