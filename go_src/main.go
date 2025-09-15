package main

// #cgo CFLAGS: -I${SRCDIR}/../c_interop/include
// #cgo LDFLAGS: -L${SRCDIR}/../deps/libinterop/lib/x86_64-linux-gnu -linterop
// #include "init_draw_state_go.h"
// #include "draw_desktop_go.h"
import "C"

import (
	"fmt"
	"time"
)

func main() {

	draw_state := C.init_draw_state_go(true)
	width := 256
	height := 256

	grid := make([]byte, width*height*4)
	// Fill a white square in the middle
	startX := 96
	startY := 96
	for y := startY; y < startY+64; y++ {
		for x := startX; x < startX+64; x++ {
			index := (y*width + x) * 4
			grid[index] = 255
			grid[index+1] = 255
			grid[index+2] = 255
			grid[index+3] = 255
		}
	}

	enable_alternative_screen_buffer := "\x1b[?1049h"
	disable_alternative_screen_buffer := "\x1b[?1049l"

	fmt.Print(enable_alternative_screen_buffer)
	defer fmt.Print(disable_alternative_screen_buffer)

	C.draw_desktop_go(draw_state, (*C.uchar)(C.CBytes(grid)), C.uint32_t(width), C.uint32_t(height), C.CString("Hello, world!"))

	time.Sleep(time.Second)

}
