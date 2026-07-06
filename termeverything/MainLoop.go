package termeverything

import (
	"fmt"
	"os"
	"os/exec"
	"strings"

	"github.com/mmulet/term.everything/wayland"
)

func MainLoop() {
	args := ParseArgs()
	var logger = newLogger(args.DebugLog, nil, args.Verbose)
	logger.logVerbose(`
	arguments:
		WaylandDisplayNameArg=%v
		SupportOldApps=%v
		Xwayland=%v
		XwaylandWM=%v
		Shell=%v
		HideStatusBar=%v
		VirtualMonitorSize=%v
		DebugLog=%v
		ReverseScroll=%v
		MaxFrameRate=%v
		Positionals=%v
		Verbose=%v`,
		args.WaylandDisplayNameArg,
		args.SupportOldApps,
		args.Xwayland,
		args.XwaylandWM,
		args.Shell,
		args.HideStatusBar,
		args.VirtualMonitorSize,
		args.DebugLog,
		args.ReverseScroll,
		args.MaxFrameRate,
		args.Positionals,
		args.Verbose)
	logger.checkFatalErr(SetVirtualMonitorSize(args.VirtualMonitorSize))

	listener, err := wayland.MakeSocketListener(&args)
	if err != nil {
		logger.logFatal("Failed to create socket listener: %v", err)
	}

	displaySize := wayland.Size{
		Width:  uint32(wayland.VirtualMonitorSize.Width),
		Height: uint32(wayland.VirtualMonitorSize.Height),
	}

	terminalWindow := MakeTerminalWindow(listener,
		displaySize,
		&args,
	)

	terminanDrawLoop := MakeTerminalDrawLoop(
		displaySize,
		args.HideStatusBar,
		len(args.Positionals) > 0,
		terminalWindow.SharedRenderedScreenSize,
		terminalWindow.FrameEvents,
		&args,
	)

	go listener.MainLoopThenClose()
	go terminalWindow.InputLoop()
	go terminanDrawLoop.MainLoop()

	done := make(chan struct{})
	go func() {
		for {
			conn := <-listener.OnConnection
			client := wayland.MakeClient(conn)
			terminalWindow.GetClients <- client
			terminanDrawLoop.GetClients <- client
			go client.MainLoop()
		}
	}()

	if len(args.Positionals) > 0 {
		cmdStr := strings.Join(args.Positionals, " ")
		shell := args.Shell
		cmd := exec.Command(shell, "-c", cmdStr)
		logger.logVerbose("command: %v", cmd)
		baseEnv := os.Environ()
		filtered := make([]string, 0, len(baseEnv))
		for _, e := range baseEnv {
			if strings.HasPrefix(e, "DISPLAY=") {
				continue
			}

			if !args.SupportOldApps && strings.HasPrefix(e, "XDG_SESSION_TYPE=") {
				continue
			}
			filtered = append(filtered, e)
		}
		filtered = append(filtered, fmt.Sprintf("WAYLAND_DISPLAY=%s", listener.WaylandDisplayName))
		if !args.SupportOldApps {
			filtered = append(filtered, "XDG_SESSION_TYPE=wayland")
		}

		cmd.Env = filtered
		// cmd.Stdout = os.Stdout
		// cmd.Stderr = os.Stderr
		// cmd.Stdin = os.Stdin

		result := make(chan error)
		go func(ret chan error) {
			output, err := cmd.CombinedOutput()
			if err != nil {
				ret <- fmt.Errorf("command failed to run %v; returncode: %v\nstdout/err: %v", cmd, err, string(output))
			}
		}(result)
		err := <-result
		logger.checkFatalErr(err)
	}

	<-done

	//TODO start xwaylnd_if_neccessary

	// // Wait for SigInt, TODO something different
	// sig := make(chan os.Signal, 1)
	// signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	// <-sig
	// _ = listener.Close()
	// fmt.Println("Shutdown complete")
}
