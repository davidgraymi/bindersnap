// Copyright 2025 The Bindersnap Authors. All rights reserved.
// SPDX-License-Identifier: LicenseRef-License

package pandoc

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os/exec"
	"time"

	"code.gitea.io/gitea/modules/setting"
)

var (
	// the command name of pandoc, will be updated to an absolute path during initialization
	PandocExecutable = "pandoc"
	// defaultCommandExecutionTimeout default command execution timeout duration
	defaultCommandExecutionTimeout = 360 * time.Second
)

// SetExecutablePath changes the path of pandoc executable and checks the file permission and version.
func SetExecutablePath(path string) error {
	// If path is empty, we use the default value of PandocExecutable "pandoc" to search for the location of pandoc.
	if path != "" {
		PandocExecutable = path
	}
	absPath, err := exec.LookPath(PandocExecutable)
	if err != nil {
		return fmt.Errorf("pandoc not found: %w", err)
	}
	PandocExecutable = absPath
	return nil
}

// InitSimple initializes pandoc module with a very simple step, no config changes, no global command arguments.
// This method doesn't change anything to filesystem. At the moment, it is only used by some Bindersnap sub-commands.
func InitSimple(ctx context.Context) error {
	if setting.Pandoc.HomePath == "" {
		return errors.New("unable to init Pandoc's HomeDir, incorrect initialization of the setting and pandoc modules")
	}

	if setting.Pandoc.Timeout.Default > 0 {
		defaultCommandExecutionTimeout = time.Duration(setting.Pandoc.Timeout.Default) * time.Second
	}

	if err := SetExecutablePath(setting.Pandoc.Path); err != nil {
		return err
	}

	// TODO: check pandoc version
	return nil
}

func ConvertDocxToSnap(ctx context.Context, in io.Reader, out io.Writer) error {
	var cmd *Command
	var stderr io.Writer
	cmd = NewCommand(ctx).AddArguments("-f", "docx", "-t", "html")
	if err := cmd.Run(&RunOpts{
		Stdout: out,
		Stderr: stderr,
		Stdin:  in,
	}); err != nil {
		return fmt.Errorf("Run: %w - %s", err, stderr)
	}
	return nil
}
