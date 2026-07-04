package handler

import "testing"

func TestValidateWWN(t *testing.T) {
	tests := []struct {
		name    string
		wwn     string
		wantErr bool
	}{
		{"0x-prefixed hex", "0x5000c500673e4baf", false},
		{"0x-prefixed short", "0x5002538e40a22954", false},
		{"UUID NVMe", "a4c8e8ed-11a0-4c97-9bba-306440f1b944", false},
		{"bare hex from ghw", "25054deb82c0", false},
		{"bare hex uppercase", "25054DEB82C0", false},
		{"bare hex long", "5000c500673e4baf", false},
		{"empty string", "", true},
		{"flux injection", `"; drop measurement smart`, true},
		{"quotes", `"0x5000"`, true},
		{"pipe operator", "0x5000|>yield()", true},
		{"spaces", "0x5000 abc", true},
		{"special chars", "abc!@#", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateWWN(tt.wwn)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateWWN(%q) error = %v, wantErr %v", tt.wwn, err, tt.wantErr)
			}
		})
	}
}

func TestValidateGUID(t *testing.T) {
	tests := []struct {
		name    string
		guid    string
		wantErr bool
	}{
		{"decimal guid", "12345678901234567890", false},
		{"short decimal", "42", false},
		{"single digit", "0", false},
		{"empty string", "", true},
		{"too long", "123456789012345678901", true},
		{"flux injection quote", `1" or pool_guid!="`, true},
		{"delete predicate injection", `1" or pool_guid="`, true},
		{"pipe operator", "1|>yield()", true},
		{"spaces", "1 2", true},
		{"hex not allowed", "0x1234", true},
		{"letters", "abc", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateGUID(tt.guid)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateGUID(%q) error = %v, wantErr %v", tt.guid, err, tt.wantErr)
			}
		})
	}
}
