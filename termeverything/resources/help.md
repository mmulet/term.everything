Usage:

```
term.everything❗mmulet.com-dont_forget_to_chmod_+x_this_file [options]
                                      [-- some_app_to_term [some_app_args]]
```
## Typical Usage:

- Navigate to the directory containing the app:
  `cd <directory with the app>`
- Ensure the app has execute permissions:
  `chmod +x ./term.everything❗mmulet.com-dont_forget_to_chmod_+x_this_file`
- Then run (if you want to run firefox for example):
  `./term.everything❗mmulet.com-dont_forget_to_chmod_+x_this_file firefox`

## App didn't open in the terminal?
If that app already has a window open, try closing all the existing windows.

Or try using `--support-old-apps` to add support for older applications:

- `term.everything❗mmulet.com-dont_forget_to_chmod_+x_this_file --support-old-apps \
-- firefox`

## Advanced Usage:

Set a custom Wayland display name along with a custom Xwayland display name:
`./term.everything❗mmulet.com-dont_forget_to_chmod_+x_this_file --wayland-display-name \
wayland-3--xwayland ":2 -retro" -- firefox`

## Galaxy Brain Usage:

- Boot up 5 terminals (A, Bob, Cob, Dobby, E-obby).
- Run the app in terminal A:
  `./term.everything❗mmulet.com-dont_forget_to_chmod_+x_this_file --wayland-display-name \`
`wayland-2`
- Then in terminal Bob run:
  `WAYLAND_DISPLAY=wayland-2 Xwayland :2 -retro`
- In terminal Cob run:
  `matchbox-window-manager -display :2`
- In terminal Dobby run:
  `DISPLAY=:2 <some_other_x11_app>`
- In terminal E-obby run:
  `WAYLAND_DISPLAY=wayland-2 <some_other_wayland_app>`

The app in terminal A hosts a Wayland display (a virtual desktop). Terminal Bob
runs Xwayland for X11 apps, pointing to terminal A. Terminal Cob runs the X11
window manager for terminal Bob. Terminal Dobby is an X11 app connecting to Bob,
and terminal E-obby runs a Wayland app connecting to terminal A.

## Options:

`--wayland-display-name <name>`  
The Wayland display name.
@default to wayland-2 (or wayland-3 if
wayland-2 is in use,etc).

`--xwayland "<all options in one pair of quotes>"`  
Run an Xwayland display for X11 compatibility (if installed and on the PATH).
term.everything does not support a rootless X11 server. Default is empty.

`--xwayland-wm "<command to launch the x11 window manager in quotes>"`  
Specifies the window manager for Xwayland. Default is:  
"matchbox-window-manager -display <the Xwayland_display from --xwayland>"

`--virtual-monitor-size <width>x<height>`  
Sets the virtual monitor size in pixels (the display size for all apps). A
small size is recommended to prevent performance issues. Default is 640x480.

`--support-old-apps`  
Alias for `--xwayland ":5 -retro" --xwayland-wm \
"matchbox-window-manager -display :5"`. Enables support for older apps.

`--`  
Everything after `--` is executed inside the terminal with these environment
variables:  
WAYLAND_DISPLAY=<wayland-display-name>  
DISPLAY=<xwayland-display>

`--shell <absolute_path_to_shell>`  
The shell used to launch the app. Default is `/bin/sh`.

`--hide-status-bar`  
Hides the status bar at the top of the terminal. Default is false.

`--version`  
Print the version number.  
`-h, --help`  
Show this help message.

`--licenses`
Print the open source licenses of libraries used in this app.

`--reverse-scroll`
Reverse scroll direction. It's great if you ssh into a linux machine from a mac.

`--max-frame-rate`
Limit drawing to the terminal to $N frames per second. Accepts float.

`--debug-log`
Log most debug statements to debug.log instead of printing to console

`--verbose`
Enable verbose logging

# Environment Variables
`TERM_EVERYTHING_PIXEL_MODE`
Values:
- ITERM2 
- KITTY
- SIXELS
- SYMBOLS

`TERM_EVERYTHING_CANVAS_MODE`
Values:
- TRUECOLOR
- INDEXED_256
- INDEXED_240
- INDEXED_16
- FGBG_BGFG
- FGBG
- INDEXED_8
- INDEXED_16_8

`TERM_EVERYTHING_PIXEL_TYPE`
Values:
- RGBA8
- BGRA8
- ARGB8
- ABGR8
- RGBA8_PREMULTIPLIED
- BGRA8_PREMULTIPLIED
- ARGB8_PREMULTIPLIED
- ABGR8_PREMULTIPLIED

`TERM_EVERYTHING_SYMBOLS`
Values:
see https://github.com/hpjansson/chafa/blob/b790c7e365f6a95aaa9cce985ff16a1c1f914482/chafa/chafa-symbol-map.h#L36
Remove CHAFA_SYMBOL_TAG. For example: `CHAFA_SYMBOL_TAG_ALL` -> `ALL`
