import {
  Pointer_Button_Press,
  Pointer_Move,
} from "./convert_keycode_to_xbd_code.ts";
import { Linux_Event_Codes } from "./Linux_Event_Codes.ts";
import { Cells } from "./Terminal_Window.ts";
import open from "open";
import { type, release } from "os";
import { readFileSync } from "fs";
import { Ansi_Escape_Codes } from "./Ansi_Escape_Codes.ts";
import { get_version_of_app } from "./get_version_of_app.ts";

export interface Line_Button {
  string: string;
  callback: () => any;
  keycode?: Linux_Event_Codes;
}

export class Status_Line {
  text_loop_time = 0;

  show_status_line = true;

  terminal_mouse_position: {
    x: Cells;
    y: Cells;
  } = {
    x: -1 as Cells,
    y: -1 as Cells,
  };
  terminal_mouse_button = {
    pressed: false,
    frame_held_time: 0,
  };

  update_mouse_position = (code: Pointer_Move) => {
    this.terminal_mouse_position.x = code.col as Cells;
    this.terminal_mouse_position.y = code.row as Cells;
  };

  handle_terminal_mouse_press = (pressed: boolean) => {
    if (pressed) {
      if (this.terminal_mouse_button.pressed) {
        /**
         * Mouse state has not changed
         * do nothing
         */
        return;
      }
      /**
       * Go from not pressed to pressed
       */
      this.terminal_mouse_button.pressed = true;
      this.terminal_mouse_button.frame_held_time = 0;
      return;
    }
    this.terminal_mouse_button.pressed = false;
    this.terminal_mouse_button.frame_held_time = 0;
  };

  post_frame = (delta_time: number) => {
    if (this.terminal_mouse_button.pressed) {
      this.terminal_mouse_button.frame_held_time += delta_time;
    }
  };

  constructor() {}

  draw = (
    delta_time: number,
    app_title: string | null,
    keys_held_down: Set<Linux_Event_Codes>
  ) => {
    if (!this.show_status_line) {
      return "";
    }
    const text = this.line(
      keys_held_down
    )`${this.b.escape} ${this.sponsor} | ${app_title ?? this.bugs} | `;

    this.text_loop_time += delta_time;
    return text.slice(0, process.stdout.columns - 1);
  };

  b: { [name: string]: Line_Button } = {
    escape: {
      keycode: Linux_Event_Codes.KEY_ESC,
      string: `[ESC] to quit`,
      callback: () => {
        process.exit(0);
      },
    },
    left: {
      string: `[]`,
      callback: () => {
        console.log("left");
      },
    },
  } as const;

  sponsor: Line_Button = {
    string: `[Sponsor this project]`,
    callback: () => {
      open("https://github.com/sponsors/mmulet");
    },
  };

  bugs: Line_Button = {
    string: `[Report bugs here]`,
    callback: () => {
      const title = encodeURIComponent("Bug Report");
      const body = encodeURIComponent(`
Quick question before you fill this out:
  Is your app opening a new window instead of opening in the terminal?
    If so, do you have any other windows of the current app open?
    For example, firefox likes to open a new window (not in the terminal)
    if you already have at least one firefox window open.
    Close all other windows, and see if the problem still happens.

## Describe the bug
A clear and concise description of what the bug is.

## To Reproduce
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected behavior
A clear and concise description of what you expected to happen.

## Screenshots
If applicable, add screenshots to help explain your problem.

## Additional context
Add any other context about the problem here.
        

## System Information
Generated from your system, please include this information in your report:
- Platform: ${process.platform}
- Architecture: ${process.arch}
- Terminal: ${process.env.TERM ?? "N/A"}
- OS: ${type()} ${release()}
- OS Details: ${this.get_os_details()}
- XDG_SESSION_TYPE: ${process.env.XDG_SESSION_TYPE}
- Wayland Display: ${process.env.WAYLAND_DISPLAY ?? "N/A"}
- X11 Display: ${process.env.DISPLAY ?? "N/A"}
- term.everything version: ${get_version_of_app()}
        `);
      open(
        `https://github.com/mmulet/term.everything/issues/new?title=${title}&body=${body}`
      );
    },
  };

  get_os_details = () => {
    try {
      const osRelease = readFileSync("/etc/os-release", "utf8");
      const lines = osRelease.split("\n");
      const osInfo: { [key: string]: string } = {};
      lines.forEach((line: string) => {
        const [key, ...valueParts] = line.split("=");
        if (key && valueParts.length) {
          osInfo[key] = valueParts.join("=").replace(/"/g, "");
        }
      });
      return `${osInfo.PRETTY_NAME || "Unknown"} (ID: ${osInfo.ID || "N/A"}, VERSION: ${osInfo.VERSION || "N/A"})`;
    } catch {
      return "Unable to determine OS details";
    }
  };

  keyboard_key_hit_button = (
    button: Line_Button,
    keys_pressed_this_frame: Set<Linux_Event_Codes>
    // keys_held_down: Keys_Held_Down
  ): Line_Button => {
    if (!button.keycode) {
      return button;
    }

    const key_pressed = keys_pressed_this_frame.has(button.keycode);
    if (key_pressed) {
      button.callback();
      return {
        ...button,
        callback: () => {},
      };
    }
    return button;

    // // const time_key_has_been_held = keys_held_down[button.keycode];
    // const time_key_has_been_held = keys_pressed_this_frame.has(button.keycode);
    // if (time_key_has_been_held === undefined) {
    //   return button;
    // }
    // // if (button.max_time_to_hold === undefined) {
    //   if (time_key_has_been_held == 0) {
    //     button.callback();
    //     return {
    //       ...button,
    //       callback: () => {},
    //     };
    //   }
    //   return button;
    // // }
    // if (time_key_has_been_held >= button.max_time_to_hold) {
    //   button.callback();
    //   return {
    //     ...button,
    //     callback: () => {
    //       button.callback();
    //     },
    //   };
    // }
    // console.log(
    //   `key ${button.keycode} has been held for ${time_key_has_been_held}`
    // );
    // const percentage_of_fill = time_key_has_been_held / button.max_time_to_hold;
    // const number_of_blocks = Math.round(percentage_of_fill * 4);

    // return {
    //   ...button,
    //   string:
    //     button.string +
    //     "[" +
    //     "█".repeat(number_of_blocks) +
    //     " ".repeat(4 - number_of_blocks) +
    //     "]",
    // };
  };

  line =
    (keys_held_down: Set<Linux_Event_Codes>) =>
    (strings: TemplateStringsArray, ...values: (Line_Button | string)[]) => {
      let position = 0;
      let result = "";

      for (let i = 0, k = 0; i < strings.length; i++, k++) {
        result += strings[i];
        position += strings[i].length;
        const next_value = values[k];
        if (next_value === undefined) {
          continue;
        }
        if (typeof next_value === "string") {
          result += next_value;
          position += next_value.length;
          continue;
        }
        const { string: next_string, callback } = this.keyboard_key_hit_button(
          next_value,
          keys_held_down
        );
        /**
         * for the rase case where
         * both click on button and
         * hold key at the same time
         */
        let already_called_callback = false;

        if (
          this.terminal_mouse_position.y === 0 &&
          this.terminal_mouse_position.x >= position &&
          this.terminal_mouse_position.x < position + next_string.length
        ) {
          result += `${Ansi_Escape_Codes.bgWhite}${Ansi_Escape_Codes.fgBlack}${next_string}${Ansi_Escape_Codes.reset}`;
          if (
            this.terminal_mouse_button.pressed &&
            this.terminal_mouse_button.frame_held_time === 0
          ) {
            if (!already_called_callback) {
              callback();
            }
          }
        } else {
          result += next_string;
        }
        position += next_string.length;
      }
      return result;
    };
}
