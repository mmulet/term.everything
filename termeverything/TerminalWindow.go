package termeverything

import (
	"fmt"
	"os"
	"os/signal"
	"slices"
	"syscall"

	"github.com/mmulet/term.everything/escapecodes"
	"github.com/mmulet/term.everything/framebuffertoansi"
	"github.com/mmulet/term.everything/wayland"
	"github.com/mmulet/term.everything/wayland/protocols"
)

type RenderedScreenSize struct {
	WidthCells  *int
	HeightCells *int
}

type WindowMode int

const (
	WindowMode_Passthrough WindowMode = iota
	WindowMode_Capture
)

var GlobalExitChan = make(chan int)

type TerminalWindow struct {
	SocketListener     *wayland.SocketListener
	VirtualMonitorSize wayland.Size

	Mode WindowMode

	FrameEvents chan XkbdCode

	Args *CommandLineArgs

	PressedMouseButton *LINUX_BUTTON_CODES

	Clients []*wayland.Client

	GetClients chan *wayland.Client

	SharedRenderedScreenSize *RenderedScreenSize

	RestoreTerminalMode func() error
}

func MakeTerminalWindow(
	socket_listener *wayland.SocketListener,
	desktop_size wayland.Size,
	args *CommandLineArgs,

) *TerminalWindow {

	restoreTerminalMode, err := EnableRawModeFD(int(os.Stdin.Fd()))
	if err != nil {
		panic(err)
	}

	tw := &TerminalWindow{
		SocketListener:           socket_listener,
		VirtualMonitorSize:       desktop_size,
		Mode:                     WindowMode_Passthrough,
		FrameEvents:              make(chan XkbdCode, 8192),
		Args:                     args,
		PressedMouseButton:       nil,
		SharedRenderedScreenSize: &RenderedScreenSize{},
		Clients:                  make([]*wayland.Client, 0),
		// RestoreTerminalMode:      func() error { return nil },
		RestoreTerminalMode: restoreTerminalMode,
		GetClients:          make(chan *wayland.Client, 32),
	}

	if !protocols.DebugRequests {
		os.Stdout.WriteString(escapecodes.EnableAlternativeScreenBuffer)
		os.Stdout.WriteString(escapecodes.EnableMouseTracking)
		os.Stdout.WriteString(escapecodes.EnableSGR)

		os.Stdout.WriteString(escapecodes.HideCursor)
	}

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh,
		syscall.SIGINT,
		syscall.SIGQUIT,
		syscall.SIGTERM,
		syscall.SIGUSR1,
		syscall.SIGUSR2,
	)
	go func() {
		exit_code := 0
		select {
		case exit_code = <-GlobalExitChan:
		case <-sigCh:
		}
		tw.OnExit()
		os.Exit(exit_code)
	}()

	return tw
}

func (tw *TerminalWindow) OnExit() {
	for _, s := range tw.Clients {
		for surface := range s.TopLevelSurfaces() {
			protocols.XdgToplevel_close(s, surface)
		}
	}
	tw.RestoreTerminalMode()

	os.Stdout.WriteString(escapecodes.DisableAlternativeScreenBuffer)
	os.Stdout.WriteString(escapecodes.ShowCursor)

	// TODO re-enable if enabled above
	// os.Stdout.WriteString(escapecodes.DisableNormalMouseTracking)
	os.Stdout.WriteString(escapecodes.DisableMouseTracking)

}

func (tw *TerminalWindow) InputLoop() {
	buf := make([]byte, 4096)
	for {

		n, err := os.Stdin.Read(buf)

		if err != nil || n == 0 {
			fmt.Printf("Error reading stdin: %v\n", err)
			return
		}
		chunk := buf[:n]
		for {
			select {
			case client := <-tw.GetClients:
				//TODO removing client
				tw.Clients = append(tw.Clients, client)
			default:
				goto GotData
			}
		}
	GotData:
		codes := ConvertKeycodeToXbdCode(chunk)
		tw.ProcessCodes(codes)
	}
}

func (tw *TerminalWindow) ProcessCodes(codes []XkbdCode) {
	clients_to_delete := make([]int, 0)
	for i, s := range tw.Clients {
		s.Access.Lock()
		if s.Status != wayland.ClientStatus_Connected {
			s.Access.Unlock()
			clients_to_delete = append(clients_to_delete, i)
			continue
		} else {
			defer s.Access.Unlock()
		}
	}
	for i := len(clients_to_delete) - 1; i >= 0; i-- {
		index := clients_to_delete[i]
		tw.Clients = slices.Delete(tw.Clients, index, index+1)
	}

	for _, code := range codes {
		tw.FrameEvents <- code

		for _, s := range tw.Clients {
			if keyboard_map := protocols.GetGlobalWlKeyboardBinds(s); keyboard_map != nil {
				modifiers := code.GetModifiers()
				ser := wayland.GetNextEventSerial()
				for keyboardID := range keyboard_map {
					protocols.WlKeyboard_modifiers(
						s,
						keyboardID,
						ser,
						uint32(modifiers),
						0, 0, 0,
					)
				}
			}
		}
		switch c := code.(type) {
		case *KeyCode:
			wayland.SendKeyboardKey(tw.Clients, uint32(c.KeyCode), true)
			// Send key released immediately
			wayland.SendKeyboardKey(tw.Clients, uint32(c.KeyCode), false)

		case *PointerMove:
			cols, rows := tw.CurrentTerminalSize()
			x := float32(c.Col) *
				(float32(tw.VirtualMonitorSize.Width) /
					float32(cols))
			y := float32(c.Row) *
				(float32(tw.VirtualMonitorSize.Height) /
					float32(rows))

			wayland.SendPointerMotion(tw.Clients, x, y)

		case *PointerButtonPress:

			release := tw.GetButtonToReleaseAndUpdatePressedMouseButton(c.Button)
			wayland.SendPointerButton(tw.Clients, uint32(c.Button), true)
			if c.NeedToReleaseOtherButtons && release != nil {
				wayland.SendPointerButton(tw.Clients, uint32(*release), false)
			}

		case *PointerButtonRelease:
			buttonToRelease := c.Button
			if c.NeedsButtonGuessing {
				if tw.PressedMouseButton == nil {
					break
				}
				buttonToRelease = *tw.PressedMouseButton
				tw.PressedMouseButton = nil
			}

			wayland.SendPointerButton(tw.Clients, uint32(buttonToRelease), false)

		case *PointerWheel:
			_, rows := tw.CurrentTerminalSize()

			var scale float32 = 0.5
			if (c.Modifiers & ModAlt) != 0 {
				scale = 1
			}
			amount := scale * float32(tw.ScrollDirection(c.Up)) * float32(tw.VirtualMonitorSize.Height) / float32(rows)
			wayland.SendPointerAxis(tw.Clients, protocols.WlPointerAxis_enum_vertical_scroll, amount)
		default:
			// literal never_default(code) equivalent: do nothing
		}
	}
}

func (tw *TerminalWindow) ScrollDirection(code_up bool) float32 {
	var code float32 = 1.0
	if code_up {
		code = -1.0
	}
	var reverse float32 = 1.0
	if tw.Args != nil && tw.Args.ReverseScroll {
		reverse = -1.0
	}
	return code * reverse
}

/**
 * Because we only get release updates for one button at a time
 * assume that when you press another mouse button you will
 * release the one you already have pressed.
 */
func (tw *TerminalWindow) GetButtonToReleaseAndUpdatePressedMouseButton(new_pressed_button LINUX_BUTTON_CODES) *LINUX_BUTTON_CODES {
	old_pressed_mouse_button := tw.PressedMouseButton
	tw.PressedMouseButton = &new_pressed_button
	//TODO I think this a bug, but keeping it for now because I dont
	// want to make any behavior changes while porting
	if old_pressed_mouse_button == nil || *tw.PressedMouseButton == new_pressed_button {
		return nil
	}
	return old_pressed_mouse_button
}

func (tw *TerminalWindow) CurrentTerminalSize() (cols, rows int) {
	if tw.SharedRenderedScreenSize != nil && tw.SharedRenderedScreenSize.WidthCells != nil && tw.SharedRenderedScreenSize.HeightCells != nil {
		return *tw.SharedRenderedScreenSize.WidthCells, *tw.SharedRenderedScreenSize.HeightCells
	}
	ws, err := framebuffertoansi.GetWinsize(1)
	if err != nil || ws.Col <= 0 || ws.Row <= 0 {
		return 80, 24
	}
	return int(ws.Col), int(ws.Row)
}
