package handler

import (
	"fmt"
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// validGUID matches a ZFS pool GUID, which is an unsigned 64-bit decimal integer
// (as emitted by `zpool list -o guid`). Restricting to digits prevents injection
// into the Flux queries and InfluxDB delete predicates that interpolate the GUID.
var validGUID = regexp.MustCompile(`^[0-9]{1,20}$`)

// ValidateGUID checks that a ZFS pool GUID parameter is a decimal integer string.
func ValidateGUID(guid string) error {
	if !validGUID.MatchString(guid) {
		return fmt.Errorf("invalid pool GUID format: %q", guid)
	}
	return nil
}

// requireValidGUID validates a ZFS pool GUID and, if invalid, writes a 400 response
// and returns ok=false. Callers should return immediately when ok is false.
func requireValidGUID(c *gin.Context, logger *logrus.Entry, guid string) (ok bool) {
	if err := ValidateGUID(guid); err != nil {
		logger.Errorln("Invalid ZFS pool GUID", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid pool GUID"})
		return false
	}
	return true
}
