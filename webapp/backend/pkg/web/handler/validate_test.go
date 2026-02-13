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
