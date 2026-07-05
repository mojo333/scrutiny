package middleware

import (
	"bytes"
	"fmt"
	"io"
	"math"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/sirupsen/logrus"
)

// Middleware based on https://github.com/toorop/gin-logrus/blob/master/logger.go
// Body recording based on
// - https://github.com/gin-gonic/gin/issues/1363
// - https://stackoverflow.com/questions/38501325/how-to-log-response-body-in-gin

// 2016-09-27 09:38:21.541541811 +0200 CEST
// 127.0.0.1 - frank [10/Oct/2000:13:55:36 -0700]
// "GET /apache_pb.gif HTTP/1.0" 200 2326
// "http://www.example.com/start.html"
// "Mozilla/4.08 [en] (Win98; I ;Nav)"

var timeFormat = "02/Jan/2006:15:04:05 -0700"

// maxRequestBodyBytes caps how much of a request body is buffered in memory,
// protecting the service from unbounded memory allocation on large POSTs.
const maxRequestBodyBytes = 10 << 20 // 10 MiB

// maxLoggedBodyBytes caps how much of the request body is retained for debug logging.
const maxLoggedBodyBytes = 64 << 10 // 64 KiB

// Logger is the logrus logger handler
func LoggerMiddleware(logger *logrus.Entry) gin.HandlerFunc {

	hostname, err := os.Hostname()
	if err != nil {
		hostname = "unknown"
	}

	return func(c *gin.Context) {

		//clone the request body reader.
		var reqBody string
		if c.Request.Body != nil {
			// Bound the amount of body we will read into memory. MaxBytesReader
			// caps the total request body size regardless of Content-Length.
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxRequestBodyBytes)
			buf, _ := io.ReadAll(c.Request.Body)
			reqBodyReader2 := io.NopCloser(bytes.NewBuffer(buf)) //We have to create a new Buffer, because the original body is consumed.
			c.Request.Body = reqBodyReader2
			// Only retain a bounded prefix of the body for debug logging.
			if len(buf) > maxLoggedBodyBytes {
				reqBody = string(buf[:maxLoggedBodyBytes])
			} else {
				reqBody = string(buf)
			}
		}

		// other handler can change c.Path so:
		path := c.Request.URL.Path
		blw := &responseBodyLogWriter{body: &bytes.Buffer{}, ResponseWriter: c.Writer}
		c.Writer = blw
		c.Set("LOGGER", logger)
		start := time.Now()
		c.Next()
		stop := time.Since(start)
		latency := int(math.Ceil(float64(stop.Nanoseconds()) / 1000000.0))
		statusCode := c.Writer.Status()
		clientIP := c.ClientIP()
		clientUserAgent := c.Request.UserAgent()
		referer := c.Request.Referer()
		respLength := c.Writer.Size()
		if respLength < 0 {
			respLength = 0
		}

		entry := logger.WithFields(logrus.Fields{
			"hostname":   hostname,
			"statusCode": statusCode,
			"latency":    latency, // time to process
			"clientIP":   clientIP,
			"method":     c.Request.Method,
			"path":       path,
			"referer":    referer,
			"respLength": respLength,
			"userAgent":  clientUserAgent,
		})

		if len(c.Errors) > 0 {
			entry.Error(c.Errors.ByType(gin.ErrorTypePrivate).String())
		} else {
			msg := fmt.Sprintf("%s - %s [%s] \"%s %s\" %d %d \"%s\" \"%s\" (%dms)", clientIP, hostname, time.Now().Format(timeFormat), c.Request.Method, path, statusCode, respLength, referer, clientUserAgent, latency)
			if statusCode >= http.StatusInternalServerError {
				entry.Error(msg)
			} else if statusCode >= http.StatusBadRequest {
				entry.Warn(msg)
			} else {
				entry.Info(msg)
			}
		}
		if strings.Contains(path, "/api/") {
			//only debug log request/response from api endpoint.
			if len(reqBody) > 0 {
				entry.WithField("bodyType", "request").Debugln(reqBody) // Print request body
			}
			entry.WithField("bodyType", "response").Debugln(blw.body.String())
		}
	}
}

// Response Logging

type responseBodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w responseBodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}
