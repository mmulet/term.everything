// Package wayland provides a pure Go implementation of a Wayland compositor.
//
// This package allows you to create Wayland servers that can host Wayland clients
// (such as browsers, terminals, and other applications) and render their output
// to your own display surface.
//
// # Basic Usage
//
// To create a Wayland compositor, you need to:
//
//  1. Create a socket listener with [MakeSocketListener]
//  2. Accept client connections
//  3. Handle frame requests and render client surfaces
//
// # Minimal Example
//
// First, implement the args interface to provide the display name:
//
//	type Args struct {
//		DisplayName string
//	}
//
//	func (a *Args) WaylandDisplayName() string {
//		return a.DisplayName // empty string auto-generates a name
//	}
//
// Create the socket listener and start accepting connections:
//
//	args := &Args{DisplayName: ""}
//	listener, err := wayland.MakeSocketListener(args)
//	if err != nil {
//		log.Fatal(err)
//	}
//	go listener.MainLoopThenClose()
//
//	// Track connected clients
//	var clients []*wayland.Client
//	var mu sync.Mutex
//
//	// Accept new client connections
//	go func() {
//		for conn := range listener.OnConnection {
//			client := wayland.MakeClient(conn)
//			mu.Lock()
//			clients = append(clients, client)
//			mu.Unlock()
//			go client.MainLoop()
//			go handleFrameRequests(client)
//		}
//	}()
//
// Handle frame callbacks to know when clients want to redraw:
//
//	func handleFrameRequests(client *wayland.Client) {
//		for callbackID := range client.FrameDrawRequests {
//			protocols.WlCallback_done(client, callbackID, uint32(time.Now().UnixMilli()))
//			if client.Status != wayland.ClientStatus_Connected {
//				break
//			}
//			// Signal your render loop that a redraw is needed
//		}
//	}
//
// Create a desktop for compositing and render in your main loop:
//
//	desktop := wayland.MakeDesktop(
//		wayland.Size{Width: 800, Height: 600},
//		false,     // useLinuxDMABuf
//		iconPNG,   // icon data for the desktop
//	)
//
//	// In your render loop:
//	desktop.DrawClients(clients)
//	// desktop.Buffer now contains RGBA pixel data
//	// desktop.Stride is the row stride in bytes
//
// Forward input events to clients:
//
//	// Mouse movement (x, y in surface coordinates)
//	wayland.SendPointerMotion(clients, float32(x), float32(y))
//
//	// Mouse buttons (use Linux BTN_LEFT=0x110, BTN_RIGHT=0x111, etc.)
//	wayland.SendPointerButton(clients, 0x110, true)  // pressed
//	wayland.SendPointerButton(clients, 0x110, false) // released
//
//	// Mouse scroll (axis: protocols.WlPointerAxis_enum_vertical_scroll)
//	wayland.SendPointerAxis(clients, protocols.WlPointerAxis_enum_vertical_scroll, 15.0)
//
//	// Keyboard (use Linux evdev keycodes, e.g., 30 for 'A')
//	wayland.SendKeyboardKey(clients, 30, true)  // key down
//	wayland.SendKeyboardKey(clients, 30, false) // key up
//
// Launch a Wayland client with the correct environment:
//
//	cmd := exec.Command("weston-terminal")
//	cmd.Env = append(os.Environ(),
//		"WAYLAND_DISPLAY="+listener.WaylandDisplayName,
//		"XDG_SESSION_TYPE=wayland",
//	)
//	cmd.Start()
package wayland
