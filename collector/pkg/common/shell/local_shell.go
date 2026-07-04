package shell

import (
	"bytes"
	"context"
	"errors"
	"io"
	"os/exec"
	"path"
	"strings"
	"time"

	"github.com/sirupsen/logrus"
)

// defaultCommandTimeout bounds how long an external command (eg. smartctl, zpool)
// may run before it is killed, so a dead disk or suspended pool cannot hang the collector forever.
const defaultCommandTimeout = 60 * time.Second

type localShell struct{}

func (s *localShell) Command(logger *logrus.Entry, cmdName string, cmdArgs []string, workingDir string, environ []string) (string, error) {
	logger.Infof("Executing command: %s %s", cmdName, strings.Join(cmdArgs, " "))

	ctx, cancel := context.WithTimeout(context.Background(), defaultCommandTimeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, cmdName, cmdArgs...)

	//capture stdout and stderr in separate buffers, so stderr warnings do not corrupt
	//the stdout payload (eg. smartctl JSON) that is later parsed / uploaded.
	var stdoutBuffer bytes.Buffer
	var stderrBuffer bytes.Buffer

	stdoutWriters := []io.Writer{&stdoutBuffer}
	stderrWriters := []io.Writer{&stderrBuffer}
	if logger.Logger.Level == logrus.DebugLevel {
		stdoutWriters = append(stdoutWriters, logger.Logger.Out)
		stderrWriters = append(stderrWriters, logger.Logger.Out)
	}

	cmd.Stdout = io.MultiWriter(stdoutWriters...)
	cmd.Stderr = io.MultiWriter(stderrWriters...)

	if environ != nil {
		cmd.Env = environ
	}
	if workingDir != "" && path.IsAbs(workingDir) {
		cmd.Dir = workingDir
	} else if workingDir != "" {
		return "", errors.New("working directory must be an absolute path")
	}

	err := cmd.Run()
	//return stdout only as the command result; stderr is captured separately and logged for diagnostics.
	if err != nil && stderrBuffer.Len() > 0 {
		logger.Debugf("command stderr: %s", stderrBuffer.String())
	}
	return stdoutBuffer.String(), err

}
