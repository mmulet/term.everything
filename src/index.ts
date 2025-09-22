import { Wayland_Socket_Listener } from "./Wayland_Socket_Listener.ts";
import { Terminal_Window } from "./Terminal_Window.ts";
import { virtual_monitor_size } from "./virtual_monitor_size.ts";
//@ts-ignore
import { set_virtual_monitor_size } from "./set_virtual_monitor_size.ts";
import { parse_args } from "./parse_args.ts";
import { start_xwayland_if_necessary } from "./start_xwayland_if_necessary.ts";
import { spawn } from "child_process";
import { writeFileSync } from "fs";

const args = await parse_args();
set_virtual_monitor_size(args.values["virtual-monitor-size"]);

const command_args = args.positionals;

const listener = new Wayland_Socket_Listener(args.values);
const will_show_app_right_at_startup = command_args.length > 0;

const terminal_window = new Terminal_Window(
  listener,
  args.values["hide-status-bar"],
  virtual_monitor_size,
  will_show_app_right_at_startup,
  args
);
if (args.values["debug-log"]) {
  console.log = (...args: any[]) => {
    const message = args.join(" ") + "\n";
    writeFileSync("debug.log", message, { flag: "a" });
  };
}

listener.main_loop();
terminal_window.main_loop();

const display_name = await start_xwayland_if_necessary(
  listener.wayland_display_name,
  args.values
);

if (command_args.length > 0) {
  const env: any = {
    ...process.env,
    WAYLAND_DISPLAY: listener.wayland_display_name,
    ...(args.values["support-old-apps"]
      ? {}
      : {
          XDG_SESSION_TYPE: "wayland",
        }),
  };
  if (display_name !== null) {
    env.DISPLAY = display_name;
  } else {
    delete env.DISPLAY;
  }
  spawn(args.values["shell"], ["-c", command_args.join(" ")], {
    env,
  });
}
