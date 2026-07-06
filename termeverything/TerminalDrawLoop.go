package termeverything

import (
	_ "embed"
	"os"
	"slices"
	"strconv"
	"time"

	"github.com/mmulet/term.everything/framebuffertoansi"
	"github.com/mmulet/term.everything/wayland"
	"github.com/mmulet/term.everything/wayland/protocols"
)

//go:embed resources/icon.png
var iconPNG []byte

type FrameInputState struct {
	KeysPressedThisFrame map[Linux_Event_Codes]bool
	MouseMoveThisFrame   bool
}

func MakeFrameInputState() FrameInputState {
	return FrameInputState{
		KeysPressedThisFrame: make(map[Linux_Event_Codes]bool),
		MouseMoveThisFrame:   false,
	}
}

type TerminalDrawLoop struct {
	VirtualMonitorSize wayland.Size

	Clients []*wayland.Client

	TimeOfLastTerminalDraw *float64

	HideStatusBar bool

	/**
	 * Don't draw until at least MinTerminalTimeSeconds has passed
	 * since the last frame has been drawn to the terminal. (Not drawn
	 * to the canvas, that is done as fast as possible)
	 *
	 * This is set from the --max-frame-rate argument.
	 */
	MinTerminalTimeSeconds *float64

	DrawState *framebuffertoansi.DrawState

	Desktop *wayland.Desktop

	SharedRenderedScreenSize *RenderedScreenSize

	FrameEvents chan XkbdCode

	TimeOfStartOfLastFrame *float64

	DesiredFrameTimeSeconds float64

	StatusLine *Status_Line

	GetClients      chan *wayland.Client
	FirstDrawDone   bool
	LastDrawSize    framebuffertoansi.WinSize
	FrameInputState FrameInputState
}

func MakeTerminalDrawLoop(desktop_size wayland.Size,
	hide_status_bar bool,
	willShowAppRightAtStartup bool,
	sharedRenderedScreenSize *RenderedScreenSize,
	frameEvents chan XkbdCode,
	args *CommandLineArgs,

) *TerminalDrawLoop {
	tw := &TerminalDrawLoop{
		Clients:                  make([]*wayland.Client, 0),
		TimeOfLastTerminalDraw:   nil,
		MinTerminalTimeSeconds:   nil,
		SharedRenderedScreenSize: sharedRenderedScreenSize,
		HideStatusBar:            hide_status_bar,
		DrawState: framebuffertoansi.MakeDrawState(
			DisplayServerType() == DisplayServerTypeX11,
		),
		VirtualMonitorSize: desktop_size,

		Desktop: wayland.MakeDesktop(wayland.Size{
			Width:  desktop_size.Width,
			Height: desktop_size.Height,
		}, willShowAppRightAtStartup, iconPNG),

		TimeOfStartOfLastFrame:  nil,
		DesiredFrameTimeSeconds: 0.016, // ~60 FPS
		StatusLine:              MakeStatusLine(),
		FrameEvents:             frameEvents,
		GetClients:              make(chan *wayland.Client, 32),
		FrameInputState:         MakeFrameInputState(),
	}
	if args != nil && args.MaxFrameRate != "" {
		if fps, err := strconv.ParseFloat(args.MaxFrameRate, 64); err == nil && fps > 0 {
			v := 1.0 / fps
			tw.MinTerminalTimeSeconds = &v
		}
	}

	return tw
}

func (tw *TerminalDrawLoop) GetAppTitle() *string {
	for _, s := range tw.Clients {
		for topLevelID := range s.TopLevelSurfaces() {
			top_level := wayland.GetXdgToplevelObject(s, topLevelID)
			if top_level == nil {
				continue
			}
			return top_level.Title
		}
	}
	return nil
}

func (tw *TerminalDrawLoop) DrawToTerminal(status_line string) {

	// if protocols.DebugRequests {
	// 	fmt.Println("Debugging!!!")
	// } else {
	// 	fmt.Println("Not debugging.")
	// }

	var statusLine *string
	if !tw.HideStatusBar {
		statusLine = &status_line
	}

	widthCells, heightCells := tw.DrawState.DrawDesktop(
		tw.Desktop.Buffer,
		tw.VirtualMonitorSize.Width,
		tw.VirtualMonitorSize.Height,
		statusLine,
	)
	tw.SharedRenderedScreenSize.WidthCells = &widthCells
	tw.SharedRenderedScreenSize.HeightCells = &heightCells

}

func (tw *TerminalDrawLoop) MainLoop() {
	for {
		tw.DrawClients()
		timeout := time.After(time.Duration(tw.DesiredFrameTimeSeconds * float64(time.Second)))

		for {
			select {
			case code := <-tw.FrameEvents:
				switch c := code.(type) {
				case *KeyCode:
					tw.FrameInputState.KeysPressedThisFrame[c.KeyCode] = true
				case *PointerMove:
					tw.StatusLine.UpdateMousePosition(c)
					tw.FrameInputState.MouseMoveThisFrame = true
				case *PointerButtonPress:
					tw.StatusLine.HandleTerminalMousePress(true)
				case *PointerButtonRelease:
					tw.StatusLine.HandleTerminalMousePress(false)
				case *PointerWheel:
				}
			case client := <-tw.GetClients:
				//TODO removing clients
				tw.Clients = append(tw.Clients, client)
			case <-timeout:
				goto KeyReadLoop
			}
		}
	KeyReadLoop:
		// /**
		//  * I know sleep is bad for timing.
		//  * @TODO replace with polling later on.
		//  */
		// time.Sleep(time.Duration(tw.DesiredFrameTimeSeconds * float64(time.Second)))
	}
}

func (tw *TerminalDrawLoop) DrawClients() {
	defer tw.ResetFrameState()
	start_of_frame := float64(time.Now().UnixMilli()) / 1000.0
	var delta_time float64
	if tw.TimeOfStartOfLastFrame != nil {
		delta_time = start_of_frame - *tw.TimeOfStartOfLastFrame
	} else {
		delta_time = tw.DesiredFrameTimeSeconds
	}
	num_draw_requests := 0
	for _, s := range tw.Clients {
		for {
			select {
			case callback_id := <-s.FrameDrawRequests:
				protocols.WlCallback_done(s, callback_id, uint32(time.Now().UnixMilli()))
				num_draw_requests++
			default:
				goto DoneCallbacks
			}
		}
	DoneCallbacks:
	}
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

	for _, s := range tw.Clients {
		pointer_surface_id := wayland.Pointer.PointerSurfaceID[s]
		if pointer_surface_id == nil {
			continue
		}
		surface := wayland.GetWlSurfaceObject(s, *pointer_surface_id)
		if surface == nil {
			continue
		}
		surface.Position.X = int32(wayland.Pointer.WindowX)
		surface.Position.Y = int32(wayland.Pointer.WindowY)
		surface.Position.Z = 1000

	}

	tw.Desktop.DrawClients(tw.Clients)

	status_line := tw.StatusLine.Draw(delta_time, tw.GetAppTitle(), tw.FrameInputState.KeysPressedThisFrame)

	if tw.ShouldDrawFrame(start_of_frame, num_draw_requests) {
		tw.DrawToTerminal(status_line)
	}

	// const draw_time = Date.now();

	// const time_until_next_frame = Math.max(
	//   0,
	//   this.desired_frame_time_seconds - (draw_time - start_of_frame)
	// );

	tw.TimeOfStartOfLastFrame = &start_of_frame

	tw.StatusLine.PostFrame(delta_time)

}

func (tw *TerminalDrawLoop) ResetFrameState() {
	tw.FrameInputState.MouseMoveThisFrame = false
	clear(tw.FrameInputState.KeysPressedThisFrame)
}

func (tw *TerminalDrawLoop) ShouldDrawFrame(start_of_frame float64, num_draw_requests int) (should_draw bool) {
	defer func() {
		if should_draw {
			tw.FirstDrawDone = true
		}
	}()
	if tw.MinTerminalTimeSeconds != nil {
		last := 0.0
		if tw.TimeOfLastTerminalDraw != nil {
			last = *tw.TimeOfLastTerminalDraw
		}
		if start_of_frame-last < *tw.MinTerminalTimeSeconds {
			return false
		}
		tw.TimeOfLastTerminalDraw = &start_of_frame
	}
	if protocols.DebugRequests {
		return false
	}

	if winsize, err := framebuffertoansi.GetWinsize(os.Stdout.Fd()); err == nil {
		defer func() {
			tw.LastDrawSize = winsize
		}()
		if winsize != tw.LastDrawSize {
			return true
		}
	}
	if num_draw_requests == 0 {
		return tw.FrameInputState.MouseMoveThisFrame || !tw.FirstDrawDone
	}
	return true
}
