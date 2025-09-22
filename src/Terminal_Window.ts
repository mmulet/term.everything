import Bun from "bun";
import c, { Draw_State } from "./c_interop.ts";
import { Wayland_Socket_Listener } from "./Wayland_Socket_Listener.ts";
import { pointer } from "./objects/wl_pointer.ts";
import {
  wl_callback,
  wl_keyboard,
  wl_keyboard_key_state,
  wl_pointer,
  wl_pointer_axis,
  wl_pointer_button_state,
  xdg_toplevel,
} from "./protocols/wayland.xml.ts";
import { Global_Ids } from "./GlobalObjects.ts";
import {
  convert_keycode_to_xbd_code,
  LINUX_MODIFIERS,
} from "./convert_keycode_to_xbd_code.ts";
import { never_default } from "./never_default.ts";
import { LINUX_BUTTON_CODES, Linux_Event_Codes } from "./Linux_Event_Codes.ts";
import { Ansi_Escape_Codes } from "./Ansi_Escape_Codes.ts";
import { debug_turn_off_output } from "./debug_turn_off_output.ts" with { type: "macro" };
import { Canvas_Desktop } from "./Canvas_Desktop.ts";
import { Status_Line } from "./Status_Line.ts";
import { on_exit } from "./on_exit.ts";
import { Display_Server_Type } from "./get_display_server_type.ts";
import { Command_Line_args } from "./parse_args.ts";

export type Cells = number & { __brand: "cells" };
export type Pixels = number & { __brand: "pixels" };
export interface Pixel_Size {
  width: Pixels;
  height: Pixels;
}

export interface Keys_Held_Down {
  [key: number]: number | undefined;
}

const display_server_type = new Display_Server_Type();

export class Terminal_Window {
  virtual_monitor_size: Pixel_Size;

  rendered_screen_size: {
    width_cells: Cells;
    height_cells: Cells;
  } | null = null;
  draw_state: Draw_State;
  canvas_desktop: Canvas_Desktop;

  status_line = new Status_Line();

  mode: "passthrough" | "menu" = "passthrough";
  /**
   * LinuxEvent Code to
   * time held down
   */
  // keys_held_down: Keys_Held_Down = {};
  keys_pressed_this_frame = new Set<Linux_Event_Codes>();

  get_app_title = () => {
    for (const s of this.socket_listener.clients) {
      for (const top_level_id of s.top_level_surfaces) {
        const top_level = s.get_object(top_level_id)?.delegate;
        if (!top_level?.title) {
          continue;
        }

        // const data = s.get_role_data_from_role(top_level_id, "xdg_toplevel");
        // if (!data || !data.title) {
        //   continue;
        // }
        // return data.title;
        return top_level.title;
      }
    }
    return null;
  };

  constructor(
    public socket_listener: Wayland_Socket_Listener,
    public hide_status_bar: boolean,
    desktop_size: Pixel_Size,
    will_show_app_right_at_startup: boolean,
    public args: Command_Line_args
  ) {
    this.canvas_desktop = new Canvas_Desktop(
      desktop_size,
      will_show_app_right_at_startup
    );
    this.virtual_monitor_size = desktop_size;
    this.draw_state = c.init_draw_state(display_server_type.type === "x11");

    process.stdin.setRawMode(true);

    if (!debug_turn_off_output()) {
      process.stdout.write(Ansi_Escape_Codes.enable_alternative_screen_buffer);
    }

    process.stdout.write(Ansi_Escape_Codes.enable_mouse_tracking);

    process.stdout.write(Ansi_Escape_Codes.hide_cursor);

    on_exit(this.on_exit);
  }

  on_exit = () => {
    for (const s of this.socket_listener.clients) {
      s.top_level_surfaces.forEach((surface) => {
        xdg_toplevel.close(s, surface);
      });
    }

    process.stdout.write(Ansi_Escape_Codes.disable_alternative_screen_buffer);

    process.stdout.write(Ansi_Escape_Codes.show_cursor);

    process.stdout.write(Ansi_Escape_Codes.disable_mouse_tracking);
  };
  key_serial = 0;

  pressed_mouse_button: LINUX_BUTTON_CODES | null = null;

  input_loop = async () => {
    for await (const chunk of Bun.stdin.stream()) {
      // console.log("chunk", chunk);

      const codes = convert_keycode_to_xbd_code(chunk);

      // if (codes.length === 0) {
      //   console.log(chunk);
      // }
      // console.log("codes", codes);

      const now = Date.now();

      for (const code of codes) {
        const new_key_serial = this.key_serial;
        this.key_serial += 2;
        for (const s of this.socket_listener.clients) {
          s.get_global_binds(Global_Ids.wl_keyboard)?.forEach(
            (_version, keyboard_Id) => {
              wl_keyboard.modifiers(
                s,
                keyboard_Id,
                new_key_serial,
                code.modifiers,
                0,
                0,
                0
              );
            }
          );
        }

        switch (code.type) {
          case "key_code":
            this.keys_pressed_this_frame.add(code.key_code);
            for (const s of this.socket_listener.clients) {
              s.get_global_binds(Global_Ids.wl_keyboard)?.forEach(
                (_version, keyboard_Id) => {
                  wl_keyboard.key(
                    s,
                    keyboard_Id,
                    new_key_serial,
                    now,
                    code.key_code,
                    wl_keyboard_key_state.pressed
                  );
                  /**
                   * There is no key up code in
                   * ANSI escape codes, so
                   * just say it is released
                   * instantly
                   */
                  wl_keyboard.key(
                    s,
                    keyboard_Id,
                    new_key_serial + 1,
                    now,
                    code.key_code,
                    wl_keyboard_key_state.released
                  );
                }
              );
            }
            break;
          case "pointer_move": {
            /**
             * chafa maintains the aspect ratio
             * so, if the aspect ratio doesn't
             * match the virtual monitor the
             * coords will be off
             */

            let x =
              code.col *
              (this.virtual_monitor_size.width /
                (this.rendered_screen_size?.width_cells ??
                  process.stdout.columns));

            let y =
              code.row *
              (this.virtual_monitor_size.height /
                (this.rendered_screen_size?.height_cells ??
                  process.stdout.rows));

            pointer.window_position.x = x;
            pointer.window_position.y = y;
            this.status_line.update_mouse_position(code);

            for (const s of this.socket_listener.clients) {
              s.get_global_binds(Global_Ids.wl_pointer)?.forEach(
                (version, pointer_id) => {
                  wl_pointer.motion(s, pointer_id, Date.now(), x, y);

                  wl_pointer.frame(s, version, pointer_id);
                }
              );
            }
            break;
          }
          case "pointer_button_press": {
            this.status_line.handle_terminal_mouse_press(true);

            const release_button =
              this.get_button_to_release_and_update_pressed_mouse_button(
                code.button
              );

            for (const s of this.socket_listener.clients) {
              s.get_global_binds(Global_Ids.wl_pointer)?.forEach(
                (version, pointer_id) => {
                  wl_pointer.button(
                    s,
                    pointer_id,
                    Date.now(),
                    Date.now(),
                    code.button,
                    wl_pointer_button_state.pressed
                  );
                  wl_pointer.frame(s, version, pointer_id);
                  if (release_button !== null) {
                    wl_pointer.button(
                      s,
                      pointer_id,
                      Date.now(),
                      Date.now(),
                      release_button,
                      wl_pointer_button_state.released
                    );
                    wl_pointer.frame(s, version, pointer_id);
                  }
                }
              );
            }
            break;
          }
          case "pointer_button_release": {
            if (this.pressed_mouse_button == null) {
              break;
            }
            const button_to_release = this.pressed_mouse_button;
            this.pressed_mouse_button = null;
            this.status_line.handle_terminal_mouse_press(false);

            for (const s of this.socket_listener.clients) {
              s.get_global_binds(Global_Ids.wl_pointer)?.forEach(
                (version, pointer_id) => {
                  wl_pointer.button(
                    s,
                    pointer_id,
                    Date.now(),
                    Date.now(),
                    button_to_release,
                    wl_pointer_button_state.released
                  );
                  wl_pointer.frame(s, version, pointer_id);
                }
              );
            }
            break;
          }
          case "pointer_wheel": {
            const scale = code.modifiers & LINUX_MODIFIERS.alt ? 1 : 0.5;
            const amount =
              (scale *
                (this.scroll_direction(code.up) *
                  this.virtual_monitor_size.height)) /
              (this.rendered_screen_size?.height_cells ?? process.stdout.rows);
            for (const s of this.socket_listener.clients) {
              s.get_global_binds(Global_Ids.wl_pointer)?.forEach(
                (version, pointer_id) => {
                  wl_pointer.axis(
                    s,
                    pointer_id,
                    Date.now(),
                    wl_pointer_axis.vertical_scroll,
                    amount
                  );
                  wl_pointer.frame(s, version, pointer_id);
                }
              );
            }
            break;
          }

          default:
            never_default(code);
        }
      }
    }
  };

  scroll_direction = (code_up: boolean) => {
    const code = code_up ? -1 : 1;
    const reverse = this.args.values["reverse-scroll"] ? -1 : 1;
    return code * reverse;
  };
  /**
   * Because we only get release updates for one button at a time
   * assume that when you press another mouse button you will
   * release the one you already have pressed.
   */
  get_button_to_release_and_update_pressed_mouse_button = (
    new_pressed_button: LINUX_BUTTON_CODES
  ): LINUX_BUTTON_CODES | null => {
    const old_pressed_mouse_button = this.pressed_mouse_button;
    this.pressed_mouse_button = new_pressed_button;
    if (
      old_pressed_mouse_button == null ||
      this.pressed_mouse_button == new_pressed_button
    ) {
      return null;
    }
    return old_pressed_mouse_button;
  };

  desired_frame_time_seconds = 0.016; // 60 fps
  time_of_start_of_last_frame: number | null = null;

  // update_keys = (delta_time: number) => {
  //   const new_held_down: typeof this.keys_held_down = {};
  //   for (const key of this.keys_pressed_this_frame) {
  //     if (this.keys_held_down[key]) {
  //       new_held_down[key] = this.keys_held_down[key] + delta_time;
  //       continue;
  //     }
  //     new_held_down[key] = 0;
  //   }
  //   this.keys_held_down = new_held_down;
  // };

  main_loop = async () => {
    this.input_loop();
    while (true) {
      const start_of_frame = Date.now() / 1000;
      const delta_time = this.time_of_start_of_last_frame
        ? start_of_frame - this.time_of_start_of_last_frame
        : this.desired_frame_time_seconds;
      // this.update_keys(delta_time);

      for (const s of this.socket_listener.clients) {
        for (const callback_id of s.frame_draw_requests) {
          wl_callback.done(s, callback_id, Date.now());
        }
        s.frame_draw_requests = [];
      }

      for (const s of this.socket_listener.clients) {
        const pointer_surface_id = pointer.pointer_surface_id.get(s);
        if (!pointer_surface_id) {
          continue;
        }
        const pointer_surface = s.get_object(pointer_surface_id)?.delegate;
        if (pointer_surface) {
          pointer_surface.position.x = pointer.window_position.x;
          pointer_surface.position.y = pointer.window_position.y;
          pointer_surface.position.z = 1000;
        }
      }
      this.canvas_desktop.draw_clients(this.socket_listener.clients);

      const desktop_buffer = this.canvas_desktop.canvas.toBuffer("raw");

      const status_line = this.status_line.draw(
        delta_time,
        this.get_app_title(),
        this.keys_pressed_this_frame
      );
      if (!debug_turn_off_output()) {
        this.rendered_screen_size = c.draw_desktop(
          this.draw_state,
          desktop_buffer,
          this.virtual_monitor_size.width,
          this.virtual_monitor_size.height,
          this.hide_status_bar ? "" : status_line
        );
      }

      // const draw_time = Date.now();

      // const time_until_next_frame = Math.max(
      //   0,
      //   this.desired_frame_time_seconds - (draw_time - start_of_frame)
      // );

      this.time_of_start_of_last_frame = start_of_frame;

      this.status_line.post_frame(delta_time);

      this.keys_pressed_this_frame.clear();

      /**
       * I know sleep is bad for timing.
       * @TODO replace with polling later on.
       */
      // await Bun.sleep(time_until_next_frame * 1000);
      await Bun.sleep(this.desired_frame_time_seconds * 1000);
    }
  };
}
