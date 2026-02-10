package handler

import (
	"github.com/analogj/scrutiny/webapp/backend/pkg/database"
	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
	"net/http"
)

func ArchiveDevice(c *gin.Context) {
	logger := c.MustGet("LOGGER").(*logrus.Entry)
	deviceRepo := c.MustGet("DEVICE_REPOSITORY").(database.DeviceRepo)

	if err := ValidateWWN(c.Param("wwn")); err != nil {
		logger.Errorln("Invalid WWN format", err)
		c.JSON(http.StatusBadRequest, gin.H{"success": false})
		return
	}

	err := deviceRepo.UpdateDeviceArchived(c, c.Param("wwn"), true)
	if err != nil {
		logger.Errorln("An error occurred while archiving device", err)
		c.JSON(http.StatusInternalServerError, gin.H{"success": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}
