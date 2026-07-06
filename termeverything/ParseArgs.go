package termeverything

import (
	"flag"
	"fmt"
	"os"

	_ "embed"
)

//go:embed resources/help.md
var helpFile string

//go:embed resources/LICENSES.txt
var licensesFile string

const version = "0.7.6"

type CommandLineArgs struct {
	WaylandDisplayNameArg string
	SupportOldApps        bool
	Xwayland              string
	XwaylandWM            string
	Shell                 string
	HideStatusBar         bool
	VirtualMonitorSize    string
	DebugLog              bool
	ReverseScroll         bool
	MaxFrameRate          string
	Positionals           []string
	Verbose               bool
}

func (args *CommandLineArgs) WaylandDisplayName() string {
	return args.WaylandDisplayNameArg
}

func ParseArgs() CommandLineArgs {
	var args CommandLineArgs

	flag.StringVar(&args.WaylandDisplayNameArg, "wayland-display-name", "", "")
	flag.BoolVar(&args.SupportOldApps, "support-old-apps", false, "")
	flag.StringVar(&args.Xwayland, "xwayland", "", "")
	flag.StringVar(&args.XwaylandWM, "xwayland-wm", "", "")
	flag.StringVar(&args.Shell, "shell", "/bin/sh", "")
	flag.BoolVar(&args.HideStatusBar, "hide-status-bar", false, "")
	flag.StringVar(&args.VirtualMonitorSize, "virtual-monitor-size", "", "")
	versionFlag := flag.Bool("version", false, "")
	flag.BoolVar(&args.DebugLog, "debug-log", false, "")
	helpFlag := flag.Bool("help", false, "")
	hFlag := flag.Bool("h", false, "help") // short option for help
	licensesFlag := flag.Bool("licenses", false, "")
	flag.BoolVar(&args.ReverseScroll, "reverse-scroll", false, "")
	flag.StringVar(&args.MaxFrameRate, "max-frame-rate", "", "")
	flag.BoolVar(&args.Verbose, "verbose", false, "")
	flag.Parse()

	if *versionFlag {
		fmt.Println(version)
		os.Exit(0)
	}
	if *helpFlag || *hFlag {
		fmt.Println(RenderMarkdownToTerminal(helpFile))
		os.Exit(0)
	}
	if *licensesFlag {
		fmt.Println(licensesFile)
		os.Exit(0)
	}

	args.Positionals = flag.Args()
	return args
}
