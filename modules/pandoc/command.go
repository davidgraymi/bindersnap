package pandoc

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"time"

	"code.gitea.io/gitea/modules/log"
	"code.gitea.io/gitea/modules/pandoc/internal"
	"code.gitea.io/gitea/modules/process"
	"code.gitea.io/gitea/modules/util"
)

// Command represents a command with its subcommands or arguments.
type Command struct {
	prog             string
	args             []string
	parentContext    context.Context
	globalArgsLength int
	brokenArgs       []string
}

// RunOpts represents parameters to run the command. If UseContextTimeout is specified, then Timeout is ignored.
type RunOpts struct {
	Env               []string
	Timeout           time.Duration
	UseContextTimeout bool

	// Dir is the working dir for the pandoc command
	Dir string

	Stdout, Stderr io.Writer

	// Stdin is used for passing input to the command
	// The caller must make sure the Stdin writer is closed properly to finish the Run function.
	// Otherwise, the Run function may hang for long time or forever, especially when the Pandoc's context deadline is not the same as the caller's.
	// Some common mistakes:
	// * `defer stdinWriter.Close()` then call `cmd.Run()`: the Run() would never return if the command is killed by timeout
	// * `go { case <- parentContext.Done(): stdinWriter.Close() }` with `cmd.Run(DefaultTimeout)`: the command would have been killed by timeout but the Run doesn't return until stdinWriter.Close()
	// * `go { if stdoutReader.Read() err != nil: stdinWriter.Close() }` with `cmd.Run()`: the stdoutReader may never return error if the command is killed by timeout
	// In the future, ideally the pandoc module itself should have full control of the stdin, to avoid such problems and make it easier to refactor to a better architecture.
	Stdin io.Reader

	PipelineFunc func(context.Context, context.CancelFunc) error
}

var ErrBrokenCommand = errors.New("pandoc command is broken")

// Run runs the command with the RunOpts
func (c *Command) Run(opts *RunOpts) error {
	return c.run(1, opts)
}

func (c *Command) run(skip int, opts *RunOpts) error {
	if len(c.brokenArgs) != 0 {
		log.Error("pandoc command is broken: %s, broken args: %s", c.LogString(), strings.Join(c.brokenArgs, " "))
		return ErrBrokenCommand
	}
	if opts == nil {
		opts = &RunOpts{}
	}

	// We must not change the provided options
	timeout := opts.Timeout
	if timeout <= 0 {
		timeout = defaultCommandExecutionTimeout
	}

	var desc string
	callerInfo := util.CallerFuncName(1 /* util */ + 1 /* this */ + skip /* parent */)
	if pos := strings.LastIndex(callerInfo, "/"); pos >= 0 {
		callerInfo = callerInfo[pos+1:]
	}
	// these logs are for debugging purposes only, so no guarantee of correctness or stability
	desc = fmt.Sprintf("pandoc.Run(by:%s, repo:%s): %s", callerInfo, logArgSanitize(opts.Dir), c.LogString())
	log.Debug("pandoc.Command: %s", desc)

	var ctx context.Context
	var cancel context.CancelFunc
	var finished context.CancelFunc

	if opts.UseContextTimeout {
		ctx, cancel, finished = process.GetManager().AddContext(c.parentContext, desc)
	} else {
		ctx, cancel, finished = process.GetManager().AddContextTimeout(c.parentContext, timeout, desc)
	}
	defer finished()

	startTime := time.Now()

	cmd := exec.CommandContext(ctx, c.prog, c.args...)
	if opts.Env == nil {
		cmd.Env = os.Environ()
	} else {
		cmd.Env = opts.Env
	}

	process.SetSysProcAttribute(cmd)
	cmd.Dir = opts.Dir
	cmd.Stdout = opts.Stdout
	cmd.Stderr = opts.Stderr
	cmd.Stdin = opts.Stdin
	if err := cmd.Start(); err != nil {
		return err
	}

	if opts.PipelineFunc != nil {
		err := opts.PipelineFunc(ctx, cancel)
		if err != nil {
			cancel()
			_ = cmd.Wait()
			return err
		}
	}

	err := cmd.Wait()
	elapsed := time.Since(startTime)
	if elapsed > time.Second {
		log.Debug("slow pandoc.Command.Run: %s (%s)", c, elapsed)
	}

	// We need to check if the context is canceled by the program on Windows.
	// This is because Windows does not have signal checking when terminating the process.
	// It always returns exit code 1, unlike Linux, which has many exit codes for signals.
	if runtime.GOOS == "windows" &&
		err != nil &&
		err.Error() == "" &&
		cmd.ProcessState.ExitCode() == 1 &&
		ctx.Err() == context.Canceled {
		return ctx.Err()
	}

	if err != nil && ctx.Err() != context.DeadlineExceeded {
		return err
	}

	return ctx.Err()
}

func (c *Command) LogString() string {
	// WARNING: this function is for debugging purposes only. It's much better than old code (which only joins args with space),
	// It's impossible to make a simple and 100% correct implementation of argument quoting for different platforms here.
	debugQuote := func(s string) string {
		if strings.ContainsAny(s, " `'\"\t\r\n") {
			return fmt.Sprintf("%q", s)
		}
		return s
	}
	a := make([]string, 0, len(c.args)+1)
	a = append(a, debugQuote(c.prog))
	if c.globalArgsLength > 0 {
		a = append(a, "...global...")
	}
	for i := c.globalArgsLength; i < len(c.args); i++ {
		a = append(a, debugQuote(logArgSanitize(c.args[i])))
	}
	return strings.Join(a, " ")
}

func logArgSanitize(arg string) string {
	if strings.Contains(arg, "://") && strings.Contains(arg, "@") {
		return util.SanitizeCredentialURLs(arg)
	} else if filepath.IsAbs(arg) {
		base := filepath.Base(arg)
		dir := filepath.Dir(arg)
		return filepath.Join(filepath.Base(dir), base)
	}
	return arg
}

// NewCommand creates and returns a new Pandoc Command based on given command and arguments.
// Each argument should be safe to be trusted. User-provided arguments should be passed to AddArgumentValues instead.
func NewCommand(ctx context.Context, args ...internal.CmdArg) *Command {
	// Make an explicit copy of globalCommandArgs, otherwise append might overwrite it
	cargs := make([]string, 0, len(args))
	for _, arg := range args {
		cargs = append(cargs, string(arg))
	}
	return &Command{
		prog:             PandocExecutable,
		args:             cargs,
		parentContext:    ctx,
		globalArgsLength: 0,
	}
}

// AddArguments adds new pandoc arguments (option/value) to the command. It only accepts string literals, or trusted CmdArg.
// Type CmdArg is in the internal package, so it can not be used outside of this package directly,
// it makes sure that user-provided arguments won't cause RCE risks.
// User-provided arguments should be passed by other AddXxx functions
func (c *Command) AddArguments(args ...internal.CmdArg) *Command {
	for _, arg := range args {
		c.args = append(c.args, string(arg))
	}
	return c
}

// AddArgumentValues adds new dynamic argument values to the command.
// The arguments may come from user input and can not be trusted, so no leading '-' is allowed to avoid passing options.
func (c *Command) AddArgumentValues(args ...string) *Command {
	for _, arg := range args {
		if !isSafeArgumentValue(arg) {
			c.brokenArgs = append(c.brokenArgs, arg)
		}
	}
	if len(c.brokenArgs) != 0 {
		return c
	}
	c.args = append(c.args, args...)
	return c
}

// isSafeArgumentValue checks if the argument is safe to be used as a value (not an option)
func isSafeArgumentValue(s string) bool {
	return s == "" || s[0] != '-'
}
