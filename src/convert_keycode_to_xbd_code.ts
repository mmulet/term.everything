// /**
//  * According to sleuthing here are the mod makes
//  * 1 << 0 Shift
//  * 1 << 1 Lock
//  * 1 << 2 Control
//  * 1 << 3 Alt
//  * 1 << 4 Mod2
//  * 1 << 5 Mod3
//  * 1 << 6 Mod4
//  * 1 << 7 Mod5
//  * 1 << 8 Button1
//  * 1 << 9 Button2
//  * 1 << 10 Button3
//  * 1 << 11 Button4
//  * 1 << 12 Button5

import { keycode_single_codes } from "./keycode_single_codes.ts";
import { LINUX_BUTTON_CODES, Linux_Event_Codes } from "./Linux_Event_Codes.ts";
import { log_to_main_screen } from "./log_to_main_screen.ts";
import { pointer_code } from "./pointer_code.ts";

//  */
export enum LINUX_MODIFIERS {
  shift = 1 << 0,
  lock = 1 << 1,
  control = 1 << 2,
  alt = 1 << 3,
}

export const numeric_keys = [
  Linux_Event_Codes.KEY_0,
  Linux_Event_Codes.KEY_1,
  Linux_Event_Codes.KEY_2,
  Linux_Event_Codes.KEY_3,
  Linux_Event_Codes.KEY_4,
  Linux_Event_Codes.KEY_5,
  Linux_Event_Codes.KEY_6,
  Linux_Event_Codes.KEY_7,
  Linux_Event_Codes.KEY_8,
  Linux_Event_Codes.KEY_9,
];

export const alpha_keys = [
  Linux_Event_Codes.KEY_A,
  Linux_Event_Codes.KEY_B,
  Linux_Event_Codes.KEY_C,
  Linux_Event_Codes.KEY_D,
  Linux_Event_Codes.KEY_E,
  Linux_Event_Codes.KEY_F,
  Linux_Event_Codes.KEY_G,
  Linux_Event_Codes.KEY_H,
  Linux_Event_Codes.KEY_I,
  Linux_Event_Codes.KEY_J,
  Linux_Event_Codes.KEY_K,
  Linux_Event_Codes.KEY_L,
  Linux_Event_Codes.KEY_M,
  Linux_Event_Codes.KEY_N,
  Linux_Event_Codes.KEY_O,
  Linux_Event_Codes.KEY_P,
  Linux_Event_Codes.KEY_Q,
  Linux_Event_Codes.KEY_R,
  Linux_Event_Codes.KEY_S,
  Linux_Event_Codes.KEY_T,
  Linux_Event_Codes.KEY_U,
  Linux_Event_Codes.KEY_V,
  Linux_Event_Codes.KEY_W,
  Linux_Event_Codes.KEY_X,
  Linux_Event_Codes.KEY_Y,
  Linux_Event_Codes.KEY_Z,
];

export type XKBD_CODE = Key_code | Pointer_EVENT;

export type Pointer_EVENT =
  | Pointer_Move
  | Pointer_Button_Press
  | Pointer_Button_Release
  | Pointer_wheel;

export interface Key_code {
  type: "key_code";
  key_code: Linux_Event_Codes;
  modifiers: number;
}

export interface Pointer_Move {
  type: "pointer_move";
  row: number;
  col: number;
  modifiers: number;
}

export interface Pointer_Button_Press {
  type: "pointer_button_press";
  modifiers: number;
  button: LINUX_BUTTON_CODES;
}

/**
 * Pointer button release is special
 * because we can't be sure of which
 * button is being released
 */
export interface Pointer_Button_Release {
  type: "pointer_button_release";
  modifiers: number;
}

export interface Pointer_wheel {
  type: "pointer_wheel";
  up: boolean;
  modifiers: number;
}

/**
 * This is a mostly okay ansi escape code parse,
 * which means it is somewhat a terrible ansi escape code parser.
 * It was made piecemeal, adding codes as I encountered errors,
 * as such it is not a complete parser. If you do rare
 * things, it will probably fail.
 *
 * @TODO make an actual parser
 * @param data
 * @returns
 */
export const convert_keycode_to_xbd_code = (data: Uint8Array): XKBD_CODE[] => {
  if (data.length == 1) {
    const out = keycode_single_codes(data[0]!);
    return out ? [out] : [];
  }
  if (data.length == 2) {
    return parse_length_2(data);
  }
  if (data.length == 3) {
    return parse_length_3(data);
  }
  if (data.length == 4) {
    return parse_length_4(data);
  }
  if (data.length == 5) {
    if (data[0] == 27 && data[1] == 91 && data[4] == 126) {
      if (data[2] == 49) {
        const key_code = f5_through_8_codes[data[3]!];
        if (key_code !== undefined) {
          return [
            {
              type: "key_code",
              key_code,
              modifiers: 0,
            },
          ];
        }
      }
      if (data[2] == 50) {
        const key_code = f9_through_12_codes[data[3]!];
        if (key_code !== undefined) {
          return [
            {
              type: "key_code",
              key_code,
              modifiers: 0,
            },
          ];
        }
      }
    }
  }

  if (data.length % 6 == 0) {
    let out: XKBD_CODE[] = [];
    const num_events = data.length / 6;
    for (let i = 0; i < num_events; i++) {
      const slice = data.slice(i * 6, (i + 1) * 6);
      if (slice[0] == 27 && slice[1] == 91 && slice[3] == 59) {
        switch (slice[2]) {
          case 49: {
            const modifiers = modifiers_for_arrow_and_page_up_etc(slice[4]!);
            if (modifiers > 0) {
              const event_out = parse_length_3([27, 91, slice[5]!]);
              if (event_out.length > 0) {
                const e = event_out.map((e) => ({
                  ...e,
                  modifiers: e.modifiers | modifiers,
                }));
                out.push(...e);
                continue;
              }
            }
            break;
          }
          case 50:
          case 51:
          case 52:
          case 53:
          case 54:
            const modifiers = modifiers_for_arrow_and_page_up_etc(slice[4]!);
            if (slice[5] == 126 && modifiers > 0) {
              const event_out = parse_length_4([27, 91, slice[2], 126]);
              if (event_out.length > 0) {
                const e = event_out.map((e) => ({
                  ...e,
                  modifiers: e.modifiers | modifiers,
                }));
                out.push(...e);
                continue;
              }
            }
        }
      }

      const value = pointer_code(slice);
      if (!value) {
        continue;
      }
      out.push(value);
    }
    return out;
  }

  if (data.length == 7) {
    if (data[0] == 27 && data[1] == 91 && data[4] == 59 && data[6] == 126) {
      const modifiers = modifiers_for_arrow_and_page_up_etc(data[5]!);
      if (modifiers > 0) {
        if (data[2] == 49) {
          const key_code = f5_through_8_codes[data[3]!];
          if (key_code !== undefined) {
            return [
              {
                type: "key_code",
                key_code,
                modifiers,
              },
            ];
          }
        }
        if (data[2] == 50) {
          const key_code = f9_through_12_codes[data[3]!];
          if (key_code !== undefined) {
            return [
              {
                type: "key_code",
                key_code,
                modifiers,
              },
            ];
          }
        }
      }
    }
  }

  log_to_main_screen(`Unrecognized key code: ${data}`);
  return [];
};

export const mouse_modifiers = (code: number, base: number) => {
  const mode_type = code - base;
  let modifiers = 0;
  if (mode_type & 0b1000) {
    modifiers |= LINUX_MODIFIERS.control;
  }
  if (mode_type & 0b1_0000) {
    modifiers |= LINUX_MODIFIERS.alt;
  }
  return modifiers;
};

const parse_length_2 = (data: Sequence) => {
  if (data[0] == 27) {
    const out = keycode_single_codes(data[1]!);
    if (!out) {
      return [];
    }
    out.modifiers |= LINUX_MODIFIERS.alt;
    return [out];
  }
  const out = [];
  const out1 = keycode_single_codes(data[0]!);
  if (out1) {
    out.push(out1);
  }
  const out2 = keycode_single_codes(data[1]!);
  if (out2) {
    out.push(out2);
  }
  return out;
};

interface Sequence {
  [index: number]: number;
  slice: (arg0: number, arg1?: number) => Sequence;
}

const parse_length_3 = (data: Sequence): XKBD_CODE[] => {
  if (data[0] !== 27) {
    const out = keycode_single_codes(data[0]!);
    const b = parse_length_2(data.slice(1));
    return out ? [out, ...b] : b;
  }
  if (data[1] == 79) {
    switch (data[2]) {
      case 80:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_F1,
            modifiers: 0,
          },
        ];
      case 81:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_F2,
            modifiers: 0,
          },
        ];
      case 82:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_F3,
            modifiers: 0,
          },
        ];
      case 83:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_F4,
            modifiers: 0,
          },
        ];
    }
  }
  if (data[1] == 91) {
    switch (data[2]) {
      case 65:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_UP,
            modifiers: 0,
          },
        ];
      case 66:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_DOWN,
            modifiers: 0,
          },
        ];
      case 67:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_RIGHT,
            modifiers: 0,
          },
        ];
      case 68:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_LEFT,
            modifiers: 0,
          },
        ];
      case 70:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_END,
            modifiers: 0,
          },
        ];
      case 72:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_HOME,
            modifiers: 0,
          },
        ];
      case 90:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_TAB,
            modifiers: LINUX_MODIFIERS.shift,
          },
        ];
      /**
       * These cases worrk for the alt+F1, shift+F2,etc
       */
      case 80:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_F1,
            modifiers: 0,
          },
        ];
      case 81:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_F2,
            modifiers: 0,
          },
        ];
      case 82:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_F3,
            modifiers: 0,
          },
        ];
      case 83:
        return [
          {
            type: "key_code",
            key_code: Linux_Event_Codes.KEY_F4,
            modifiers: 0,
          },
        ];
    }
  }
  return [];
};

const modifiers_for_arrow_and_page_up_etc = (slice_4: number): number => {
  switch (slice_4) {
    case 50:
      return LINUX_MODIFIERS.shift;
    case 51:
      return LINUX_MODIFIERS.alt;
    case 52:
      return LINUX_MODIFIERS.shift | LINUX_MODIFIERS.alt;
    case 53:
      return LINUX_MODIFIERS.control;
    case 54:
      return LINUX_MODIFIERS.control | LINUX_MODIFIERS.shift;
    default:
      return -1;
  }
};

export const parse_length_4 = (data: Sequence): XKBD_CODE[] => {
  if (data[0] !== 27) {
    const out = keycode_single_codes(data[0]!);
    const b = parse_length_3(data.slice(1));
    return out ? [out, ...b] : b;
  }
  if (data[1] == 91) {
    if (data[2] == 50 && data[3] == 126) {
      return [
        {
          type: "key_code",
          key_code: Linux_Event_Codes.KEY_INSERT,
          modifiers: 0,
        },
      ];
    }
    if (data[2] == 51 && data[3] == 126) {
      return [
        {
          type: "key_code",
          key_code: Linux_Event_Codes.KEY_DELETE,
          modifiers: 0,
        },
      ];
    }
    if (data[2] == 53 && data[3] == 126) {
      return [
        {
          type: "key_code",
          key_code: Linux_Event_Codes.KEY_PAGEUP,
          modifiers: 0,
        },
      ];
    }
    if (data[2] == 54 && data[3] == 126) {
      return [
        {
          type: "key_code",
          key_code: Linux_Event_Codes.KEY_PAGEDOWN,
          modifiers: 0,
        },
      ];
    }
  }
  return [];
};

const f5_through_8_codes: {
  [key: number]: Linux_Event_Codes | undefined;
} = {
  53: Linux_Event_Codes.KEY_F5,
  55: Linux_Event_Codes.KEY_F6,
  56: Linux_Event_Codes.KEY_F7,
  57: Linux_Event_Codes.KEY_F8,
};

const f9_through_12_codes: {
  [key: number]: Linux_Event_Codes | undefined;
} = {
  48: Linux_Event_Codes.KEY_F9,
  49: Linux_Event_Codes.KEY_F10,
  51: Linux_Event_Codes.KEY_F11,
  52: Linux_Event_Codes.KEY_F12,
};
