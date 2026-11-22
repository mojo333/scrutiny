package database

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func Test_m20260216155600_CopyWindows(t *testing.T) {
	t.Parallel()

	start := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	for _, tt := range []struct {
		name     string
		stop     time.Time
		expected int
	}{
		{"empty range yields no windows", start, 0},
		{"stop before start yields no windows", start.Add(-time.Hour), 0},
		{"partial window is still copied", start.Add(time.Hour), 1},
		{"exact multiple of the window size", start.Add(3 * uuidMigrationWindow), 3},
		{"remainder gets its own window", start.Add(3*uuidMigrationWindow + time.Minute), 4},
	} {
		t.Run(tt.name, func(t *testing.T) {
			windows := m20260216155600_CopyWindows(start, tt.stop, uuidMigrationWindow)

			require.Len(t, windows, tt.expected)
			if tt.expected == 0 {
				return
			}
			// contiguous half-open windows from start to stop, so no point is copied twice or skipped
			require.Equal(t, start, windows[0][0])
			require.Equal(t, tt.stop, windows[len(windows)-1][1])
			for i, w := range windows {
				require.True(t, w[0].Before(w[1]), "window %d is empty", i)
				require.LessOrEqual(t, w[1].Sub(w[0]), uuidMigrationWindow)
				if i > 0 {
					require.Equal(t, windows[i-1][1], w[0])
				}
			}
		})
	}
}
