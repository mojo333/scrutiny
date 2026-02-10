package handler

import (
	"fmt"
	"regexp"
)

var validWWN = regexp.MustCompile(`^0x[0-9a-fA-F]+$`)

// ValidateWWN checks that a WWN parameter contains only a hex string prefixed with "0x".
// This prevents injection into Flux queries and InfluxDB delete predicates.
func ValidateWWN(wwn string) error {
	if !validWWN.MatchString(wwn) {
		return fmt.Errorf("invalid WWN format: %q", wwn)
	}
	return nil
}
