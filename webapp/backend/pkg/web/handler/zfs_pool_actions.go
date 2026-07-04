package handler

import (
	"errors"
	"net/http"

	"github.com/analogj/scrutiny/webapp/backend/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// respondZFSPoolActionError writes a 404 when the pool does not exist and a 500
// otherwise, so callers can distinguish "not found" from a real server error.
func respondZFSPoolActionError(c *gin.Context, logger *logrus.Entry, err error, action string) {
	logger.Errorln("An error occurred while "+action+" ZFS pool", err)
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "error": "Pool not found"})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"success": false})
}

// ArchiveZFSPool archives a ZFS pool (hides it from the dashboard)
func ArchiveZFSPool(c *gin.Context) {
	deviceRepo := c.MustGet("DEVICE_REPOSITORY").(database.DeviceRepo)
	logger := c.MustGet("LOGGER").(*logrus.Entry)

	guid := c.Param("guid")
	if err := ValidateGUID(guid); err != nil {
		logger.Errorln("Invalid ZFS pool GUID", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid pool GUID"})
		return
	}

	err := deviceRepo.UpdateZFSPoolArchived(c, guid, true)
	if err != nil {
		respondZFSPoolActionError(c, logger, err, "archiving")
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UnarchiveZFSPool unarchives a ZFS pool (shows it on the dashboard)
func UnarchiveZFSPool(c *gin.Context) {
	deviceRepo := c.MustGet("DEVICE_REPOSITORY").(database.DeviceRepo)
	logger := c.MustGet("LOGGER").(*logrus.Entry)

	guid := c.Param("guid")
	if err := ValidateGUID(guid); err != nil {
		logger.Errorln("Invalid ZFS pool GUID", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid pool GUID"})
		return
	}

	err := deviceRepo.UpdateZFSPoolArchived(c, guid, false)
	if err != nil {
		respondZFSPoolActionError(c, logger, err, "unarchiving")
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// MuteZFSPool mutes notifications for a ZFS pool
func MuteZFSPool(c *gin.Context) {
	deviceRepo := c.MustGet("DEVICE_REPOSITORY").(database.DeviceRepo)
	logger := c.MustGet("LOGGER").(*logrus.Entry)

	guid := c.Param("guid")
	if err := ValidateGUID(guid); err != nil {
		logger.Errorln("Invalid ZFS pool GUID", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid pool GUID"})
		return
	}

	err := deviceRepo.UpdateZFSPoolMuted(c, guid, true)
	if err != nil {
		respondZFSPoolActionError(c, logger, err, "muting")
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UnmuteZFSPool unmutes notifications for a ZFS pool
func UnmuteZFSPool(c *gin.Context) {
	deviceRepo := c.MustGet("DEVICE_REPOSITORY").(database.DeviceRepo)
	logger := c.MustGet("LOGGER").(*logrus.Entry)

	guid := c.Param("guid")
	if err := ValidateGUID(guid); err != nil {
		logger.Errorln("Invalid ZFS pool GUID", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid pool GUID"})
		return
	}

	err := deviceRepo.UpdateZFSPoolMuted(c, guid, false)
	if err != nil {
		respondZFSPoolActionError(c, logger, err, "unmuting")
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// UpdateZFSPoolLabel updates the custom label for a ZFS pool
func UpdateZFSPoolLabel(c *gin.Context) {
	deviceRepo := c.MustGet("DEVICE_REPOSITORY").(database.DeviceRepo)
	logger := c.MustGet("LOGGER").(*logrus.Entry)

	guid := c.Param("guid")
	if err := ValidateGUID(guid); err != nil {
		logger.Errorln("Invalid ZFS pool GUID", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid pool GUID"})
		return
	}

	var payload struct {
		Label string `json:"label"`
	}
	if err := c.BindJSON(&payload); err != nil {
		logger.Errorln("Cannot parse label payload", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false})
		return
	}

	// Bound the label length to avoid unbounded storage / rendering issues.
	if len(payload.Label) > 255 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Label too long (max 255 characters)"})
		return
	}

	err := deviceRepo.UpdateZFSPoolLabel(c, guid, payload.Label)
	if err != nil {
		respondZFSPoolActionError(c, logger, err, "updating label for")
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// DeleteZFSPool deletes a ZFS pool from tracking
func DeleteZFSPool(c *gin.Context) {
	deviceRepo := c.MustGet("DEVICE_REPOSITORY").(database.DeviceRepo)
	logger := c.MustGet("LOGGER").(*logrus.Entry)

	guid := c.Param("guid")
	if err := ValidateGUID(guid); err != nil {
		logger.Errorln("Invalid ZFS pool GUID", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Invalid pool GUID"})
		return
	}

	err := deviceRepo.DeleteZFSPool(c, guid)
	if err != nil {
		logger.Errorln("An error occurred while deleting ZFS pool", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
