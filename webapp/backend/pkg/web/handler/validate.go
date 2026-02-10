package handler

import (
	"fmt"
	"regexp"
)

// validWWN matches traditional 0x-prefixed hex WWNs (e.g. "0x5000c500673e4baf")
// and UUID-style identifiers used by NVMe devices (e.g. "a4c8e8ed-11a0-4c97-9bba-306440f1b944").
var validWWN = regexp.MustCompile(`^(0x[0-9a-fA-F]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$`)

// ValidateWWN checks that a WWN parameter is either a 0x-prefixed hex string or a UUID.
// This prevents injection into Flux queries and InfluxDB delete predicates.
func ValidateWWN(wwn string) error {
	if !validWWN.MatchString(wwn) {
		return fmt.Errorf("invalid WWN format: %q", wwn)
	}
	return nil
}
