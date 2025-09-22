import {
  Pointer_EVENT,
  mouse_modifiers,
} from "./convert_keycode_to_xbd_code.ts";
import { LINUX_BUTTON_CODES } from "./Linux_Event_Codes.ts";

export const pointer_code = (data: Uint8Array): Pointer_EVENT | null => {
  if (!(data[0] == 27 && data[1] == 91 && data[2] == 77)) {
    return null;
  }
  /**
   * Mouse time!
   */
  const d = data[3];
  switch (d) {
    case 67:
    case 75:
    case 83:
    case 91: {
      /**
       * Mouse move
       */
      /**
       * @TODO why 33
       */
      const col = data[4]! - 33;
      const row = data[5]! - 33;
      const modifiers = mouse_modifiers(d, 67);
      return {
        type: "pointer_move",
        row,
        col,
        modifiers,
      };
    }
    case 64:
    case 72:
    case 80:
    case 88: {
      /**
       * @again why 33
       */
      const col = data[4]! - 33;
      const row = data[5]! - 33;
      /**
       * This is pointer moving while
       * holding a button down
       *
       * so far it has always followed
       * a button down event,
       * so I'm just sending a pointer move
       * rather than a button followed by a move
       */
      const modifiers = mouse_modifiers(d, 64);
      return {
        type: "pointer_move",
        row,
        col,
        modifiers,
      };
    }

    case 32:
    case 40:
    case 48:
    case 56:
      /**
       * Mouse button left down
       */
      return {
        type: "pointer_button_press",
        button: LINUX_BUTTON_CODES.BTN_LEFT,
        modifiers: mouse_modifiers(d, 32),
      };
    case 33:
    case 41:
    case 49:
    case 57:
      /**
       * Mouse button left down
       */
      return {
        type: "pointer_button_press",
        button: LINUX_BUTTON_CODES.BTN_MIDDLE,
        modifiers: mouse_modifiers(d, 33),
      };

    case 34:
    case 42:
    case 50:
    case 58:
      /**
       * Mouse button right down
       */
      return {
        type: "pointer_button_press",
        button: LINUX_BUTTON_CODES.BTN_RIGHT,
        modifiers: mouse_modifiers(d, 34),
      };

    case 35:
    case 43:
    case 51:
    case 59:
      /**
       * Mouse button up
       */
      return {
        type: "pointer_button_release",
        modifiers: mouse_modifiers(d, 35),
      };

    case 96:
    case 104:
    case 112:
    case 120:
      /**
       * Mouse wheel up
       */
      return {
        type: "pointer_wheel",
        up: true,
        modifiers: mouse_modifiers(d, 96),
      };

    case 97:
    case 105:
    case 113:
    case 121:
      return {
        type: "pointer_wheel",
        up: false,
        modifiers: mouse_modifiers(d, 97),
      };
  }
  return null;
};
