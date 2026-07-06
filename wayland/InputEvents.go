package wayland

import (
	"sync"
	"time"

	"github.com/mmulet/term.everything/wayland/protocols"
)

var (
	serialMutex sync.Mutex
	nextSerial  uint32 = 0
)

func GetNextEventSerial() uint32 {
	serialMutex.Lock()
	defer serialMutex.Unlock()
	nextSerial++
	return nextSerial
}

func getNextSerial() uint32 {
	return GetNextEventSerial()
}

func SendPointerMotion(clients []*Client, x, y float32) {
	// Update global pointer position for cursor drawing
	Pointer.WindowX = x
	Pointer.WindowY = y

	timestamp := uint32(time.Now().UnixMilli())
	for _, client := range clients {
		if client.Status != ClientStatus_Connected {
			continue
		}
		if pointerBinds := protocols.GetGlobalWlPointerBinds(client); pointerBinds != nil {
			for pointerID, version := range pointerBinds {
				protocols.WlPointer_motion(client, pointerID, timestamp, x, y)
				protocols.WlPointer_frame(client, uint32(version), pointerID)
			}
		}
	}
}

func SendPointerButton(clients []*Client, button uint32, pressed bool) {
	timestamp := uint32(time.Now().UnixMilli())
	ser := getNextSerial()
	state := protocols.WlPointerButtonState_enum_released
	if pressed {
		state = protocols.WlPointerButtonState_enum_pressed
	}
	for _, client := range clients {
		if client.Status != ClientStatus_Connected {
			continue
		}
		if pointerBinds := protocols.GetGlobalWlPointerBinds(client); pointerBinds != nil {
			for pointerID, version := range pointerBinds {
				protocols.WlPointer_button(client, pointerID, ser, timestamp, button, state)
				protocols.WlPointer_frame(client, uint32(version), pointerID)
			}
		}
	}
}

func SendPointerAxis(clients []*Client, axis protocols.WlPointerAxis_enum, value float32) {
	timestamp := uint32(time.Now().UnixMilli())
	for _, client := range clients {
		if client.Status != ClientStatus_Connected {
			continue
		}
		if pointerBinds := protocols.GetGlobalWlPointerBinds(client); pointerBinds != nil {
			for pointerID, version := range pointerBinds {
				protocols.WlPointer_axis(client, pointerID, timestamp, axis, value)
				protocols.WlPointer_frame(client, uint32(version), pointerID)
			}
		}
	}
}

func SendKeyboardKey(clients []*Client, key uint32, pressed bool) {
	timestamp := uint32(time.Now().UnixMilli())
	ser := getNextSerial()
	state := protocols.WlKeyboardKeyState_enum_released
	if pressed {
		state = protocols.WlKeyboardKeyState_enum_pressed
	}
	for _, client := range clients {
		if client.Status != ClientStatus_Connected {
			continue
		}
		if keyboardBinds := protocols.GetGlobalWlKeyboardBinds(client); keyboardBinds != nil {
			for keyboardID := range keyboardBinds {
				protocols.WlKeyboard_key(client, keyboardID, ser, timestamp, key, state)
			}
		}
	}
}
