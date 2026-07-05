package handler

import (
	"net/http"

	"github.com/analogj/scrutiny/webapp/backend/pkg/database"
	"github.com/analogj/scrutiny/webapp/backend/pkg/models"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"github.com/sirupsen/logrus"
)

// RegisterZFSPools registers ZFS pools detected by the collector.
// This function is called every time the ZFS collector runs.
func RegisterZFSPools(c *gin.Context) {
	deviceRepo := c.MustGet("DEVICE_REPOSITORY").(database.DeviceRepo)
	logger := c.MustGet("LOGGER").(*logrus.Entry)

	var poolWrapper models.ZFSPoolWrapper
	err := c.BindJSON(&poolWrapper)
	if err != nil {
		logger.Errorln("Cannot parse ZFS pools", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false})
		return
	}

	// Filter out any pool with a malformed GUID (they are invalid and would fail
	// later validation on every subsequent archive/mute/label/delete/detail request).
	detectedPools := lo.Filter[models.ZFSPool](poolWrapper.Data, func(pool models.ZFSPool, _ int) bool {
		if err := ValidateGUID(pool.GUID); err != nil {
			logger.Warnln("Skipping ZFS pool with invalid GUID", err)
			return false
		}
		return true
	})

	errs := []error{}
	for _, pool := range detectedPools {
		// Insert pools into DB (and update specified columns if pool is already registered)
		if err := deviceRepo.RegisterZFSPool(c, pool); err != nil {
			errs = append(errs, err)
		}
	}

	if len(errs) > 0 {
		logger.Errorln("An error occurred while registering ZFS pools", errs)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
		})
		return
	}

	c.JSON(http.StatusOK, models.ZFSPoolWrapper{
		Success: true,
		Data:    detectedPools,
	})
}
